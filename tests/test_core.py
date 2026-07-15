"""핵심 테스트 — 구조·정책 검증.

주의: 여기서의 통과는 '배관(plumbing)'의 검증이다.
실제 매핑 정확도(SRS 목표 ≥90%)는 ANTHROPIC_API_KEY로
`python scripts/measure.py --provider claude --strict` 를 실행해야 측정된다.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

os.environ["KIOSK_PROVIDER"] = "rule"  # 테스트는 결정적 규칙 프로바이더로

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.interpreter import (  # noqa: E402
    CartItem,
    RuleProvider,
    ValidationErr,
    load_expressions,
    load_menu,
    validate_cart,
)

MENU = load_menu()
EXPR = load_expressions()
RULE = RuleProvider()


def run(utter: str, cart=None):
    cart = [CartItem(**c) for c in (cart or [])]
    return RULE.interpret(utter, cart, MENU, EXPR)


def carts(result):
    return sorted((c.id, c.qty) for c in result.cart)


# ── 데이터 무결성 ────────────────────────────────────
def test_menu_integrity():
    ids = list(MENU.keys())
    assert len(ids) == len(set(ids)), "메뉴 id 중복"
    for m in MENU.values():
        assert m["easy_name"].strip()
        assert m["price"] > 0
        assert m["temp"] in {"hot", "ice", "none"}


def test_expressions_reference_valid_ids():
    for mp in EXPR["mappings"]:
        for i in mp["ids"]:
            assert i in MENU, f"표현 사전이 없는 id 참조: {i}"


def test_expressions_no_collisions():
    """표현 사전 충돌 검사 — 같은 표현이 서로 다른 메뉴로 매핑되면 실패."""
    sys.path.insert(0, str(ROOT / "scripts"))
    from check_expressions import check

    errors = check(MENU, EXPR)
    assert not errors, "\n".join(errors)


def test_testset_schema_and_count():
    lines = (ROOT / "data" / "testset.jsonl").read_text(encoding="utf-8").splitlines()
    cases = [json.loads(l) for l in lines if l.strip()]
    assert len(cases) >= 200  # scripts/gen_testset.py로 생성 (롯데리아 v1: 222건)
    valid = {"update", "confirm", "clarify", "reject", "recommend"}
    for c in cases:
        assert c["type"] in {"single", "multi"}
        acts = c["expected"]["action"]
        acts = acts if isinstance(acts, list) else [acts]
        assert all(a in valid for a in acts)
        for it in c.get("cart_before", []) + c["expected"].get("cart", []):
            assert it["id"] in MENU, f"{c['id']}: 없는 id {it['id']}"


# ── 환각 차단 (P-5) ──────────────────────────────────
def test_validator_rejects_unknown_id_and_bad_qty():
    with pytest.raises(ValidationErr):
        validate_cart([{"id": "free-money", "qty": 1}], MENU)
    with pytest.raises(ValidationErr):
        validate_cart([{"id": "cola", "qty": 0}], MENU)
    with pytest.raises(ValidationErr):
        validate_cart([{"id": "cola", "qty": 100}], MENU)


def test_validator_merges_duplicates():
    out = validate_cart([{"id": "cola", "qty": 1}, {"id": "cola", "qty": 2}], MENU)
    assert [(c.id, c.qty) for c in out] == [("cola", 3)]


# ── 규칙 프로바이더 (오프라인 폴백 동작) ─────────────
def test_rule_expression_mapping():
    r = run("검은 탄산 물 하나 줘")
    assert r.action == "update" and carts(r) == [("cola", 1)]


def test_rule_temp_filter():
    r = run("뜨거운 커피 줘")
    assert r.action == "update" and carts(r) == [("hot-americano", 1)]


def test_rule_ambiguous_clarifies_not_guesses():
    r = run("부드러운 거 하나 줘")
    assert r.action == "clarify" and r.question  # FR-N3 임의 확정 금지


def test_rule_multiturn_remove():
    r = run("콜라는 빼줘", [{"id": "cola", "qty": 1}, {"id": "fries", "qty": 1}])
    assert r.action == "update" and carts(r) == [("fries", 1)]


def test_rule_cancel_all():
    r = run("전부 취소해줘", [{"id": "cola", "qty": 1}, {"id": "fries", "qty": 2}])
    assert r.action == "update" and r.cart == []


def test_rule_one_more():
    r = run("하나 더 줘", [{"id": "soft-cone", "qty": 1}])
    assert r.action == "update" and carts(r) == [("soft-cone", 2)]


def test_rule_confirm():
    r = run("네 맞아요", [{"id": "cola", "qty": 1}])
    assert r.action == "confirm" and carts(r) == [("cola", 1)]


def test_rule_recommend_basic():
    r = run("뭐가 맛있어요?")
    assert r.action == "recommend"
    assert 1 <= len(r.suggestions) <= 3
    assert all(s in MENU for s in r.suggestions)  # 환각 차단 (P-5)


def test_rule_recommend_respects_temperature():
    r = run("따뜻한 거 추천해줘")
    assert r.action == "recommend"
    assert all(MENU[s]["temp"] == "hot" for s in r.suggestions)


def test_rule_recommend_respects_taste():
    r = run("달달한 거 좋은 거 추천")
    assert r.action == "recommend"
    assert all("달다" in MENU[s]["tags"] for s in r.suggestions)


def test_specific_menu_not_treated_as_recommend():
    # "콜라 줘"는 추천이 아니라 추가여야 함
    r = run("콜라 줘")
    assert r.action == "update" and carts(r) == [("cola", 1)]


def test_rule_quantity_parse():
    r = run("치즈 스틱 세 개 줘")
    assert carts(r) == [("cheese-sticks", 3)]


def test_rule_set_menu_direct():
    r = run("불고기 버거 세트 하나 주세요")
    assert r.action == "update" and carts(r) == [("bulgogi-burger-set", 1)]


def test_rule_qty_word_not_confirm():
    # "네 개"의 '네'가 확정으로 오인되지 않아야 한다
    r = run("불고기 버거 네 개 줘", [{"id": "cola", "qty": 1}])
    assert r.action == "update" and carts(r) == [("bulgogi-burger", 4), ("cola", 1)]


def test_rule_replace_item():
    r = run("불고기 버거 말고 새우 버거로 바꿔줘", [{"id": "bulgogi-burger", "qty": 1}])
    assert r.action == "update" and carts(r) == [("shrimp-burger", 1)]


def test_rule_replace_a_to_b():
    # "A를 B로 바꿔줘" — 수량 변경으로 오인하거나 둘 다 담으면 안 된다 (2026-07-15 실증 리허설 발견)
    r = run("새우버거를 불고기버거로 바꿔줘", [{"id": "shrimp-burger", "qty": 1}])
    assert r.action == "update" and carts(r) == [("bulgogi-burger", 1)]


def test_rule_replace_keeps_qty_and_set():
    # 세트가 담겨 있으면 교체도 세트로, 수량은 유지
    r = run("새우버거를 불고기버거로 바꿔줘", [{"id": "shrimp-burger-set", "qty": 2}])
    assert r.action == "update" and carts(r) == [("bulgogi-burger-set", 2)]


def test_rule_replace_target_only():
    # 담긴 게 하나뿐이면 "B로 바꿔줘"만 말해도 교체
    r = run("불고기버거로 바꿔줘", [{"id": "shrimp-burger", "qty": 1}])
    assert r.action == "update" and carts(r) == [("bulgogi-burger", 1)]


# ── API + 로깅 (FR-B1/D1, P-6) ───────────────────────
def test_api_interpret_and_pii_free_logging(tmp_path):
    os.environ["KIOSK_LOG_DIR"] = str(tmp_path)
    for mod in ["backend.app"]:
        sys.modules.pop(mod, None)
    from backend.app import app  # 재임포트로 LOG_DIR 반영

    client = TestClient(app)
    res = client.post(
        "/api/interpret",
        json={"utterance": "콜라 줘", "cart": [], "session_id": "test-session"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["action"] == "update"
    assert body["cart"] == [{"id": "cola", "qty": 1}]

    log_file = tmp_path / "utterances.jsonl"
    assert log_file.exists()
    rec = json.loads(log_file.read_text(encoding="utf-8").splitlines()[-1])
    for key in ["ts", "session", "utterance", "action", "provider", "latency_ms"]:
        assert key in rec
    for banned in ["name", "phone", "birth", "address"]:  # P-6: 식별정보 필드 금지
        assert banned not in rec


def test_api_menu_single_source():
    from backend.app import app

    client = TestClient(app)
    items = client.get("/api/menu").json()["items"]
    assert {i["id"] for i in items} == set(MENU.keys())
