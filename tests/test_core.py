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


def test_testset_schema_and_count():
    lines = (ROOT / "data" / "testset.jsonl").read_text(encoding="utf-8").splitlines()
    cases = [json.loads(l) for l in lines if l.strip()]
    assert len(cases) == 106  # 단일 70 + 멀티턴 30 + 추천 6
    for c in cases:
        assert c["type"] in {"single", "multi"}
        assert c["expected"]["action"] in {"update", "confirm", "clarify", "reject", "recommend"}
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
    r = run("콜라는 빼줘", [{"id": "cola", "qty": 1}, {"id": "castella", "qty": 1}])
    assert r.action == "update" and carts(r) == [("castella", 1)]


def test_rule_cancel_all():
    r = run("전부 취소해줘", [{"id": "cola", "qty": 1}, {"id": "yakgwa", "qty": 2}])
    assert r.action == "update" and r.cart == []


def test_rule_one_more():
    r = run("하나 더 줘", [{"id": "sikhye", "qty": 1}])
    assert r.action == "update" and carts(r) == [("sikhye", 2)]


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
    r = run("약과 세 개 줘")
    assert carts(r) == [("yakgwa", 3)]


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
