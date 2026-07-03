"""테스트셋 생성기 — 롯데리아 도메인 v1.

data/menu.json·expressions.yaml을 근거로 결정적(deterministic) 테스트셋을 생성한다.
케이스의 expected는 '규칙 프로바이더의 출력'이 아니라 '사람이 판단한 정답'이다.
일부 케이스(세트 전환 등)는 규칙 폴백이 못 푸는 LLM 변별용 케이스로 의도적으로 포함한다.

사용: python scripts/gen_testset.py   # data/testset.jsonl 재생성
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.interpreter import load_menu  # noqa: E402

MENU = load_menu()
OUT = ROOT / "data" / "testset.jsonl"

cases: list[dict] = []


def add(type_: str, tag: str, utterance: str, expected: dict, cart_before: list | None = None):
    cases.append(
        {
            "id": f"T{len(cases) + 1:03d}",
            "type": type_,
            "tag": tag,
            "cart_before": cart_before or [],
            "utterance": utterance,
            "expected": expected,
        }
    )


def upd(*items: tuple[str, int]) -> dict:
    return {"action": "update", "cart": [{"id": i, "qty": q} for i, q in items]}


# ── A. 메뉴 이름 직접 언급 (전 품목) ─────────────────
for m in MENU.values():
    add("single", "name", f"{m['easy_name']} 하나 주세요", upd((m["id"], 1)))

# ── B. 표현 사전 단일 매핑 (dict) ────────────────────
DICT_SINGLE = [
    ("불고기 하나 줘", "bulgogi-burger"),
    ("고기 든 빵 주세요", "bulgogi-burger"),
    ("한우 버거로 하나 줘요", "hanwoo-burger"),
    ("데리 하나 주쇼", "teriyaki-burger"),
    ("간장 맛 버거 있으면 하나 줘", "teriyaki-burger"),
    ("공룡 버거 하나 주세요", "t-rex-burger"),
    ("티렉스 하나요", "t-rex-burger"),
    ("제일 큰 버거 줘", "t-rex-burger"),
    ("불새 하나 줘요", "bulsae-burger"),
    ("매콤한 버거 하나 줘", "hot-crispy-burger"),
    ("모짜렐라 버거 하나", "mozzarella-burger"),
    ("고기 두 장 든 걸로 줘", "double-cheese-burger"),
    ("닭날개 하나 줘", "hot-wings"),
    ("매운 날개 튀김 주세요", "hot-wings"),
    ("너겟 하나 줘요", "chicken-nugget"),
    ("너게트 주세요", "chicken-nugget"),
    ("텐더 하나 줘", "chicken-tender"),
    ("닭가슴살 튀긴 거 줘", "chicken-tender"),
    ("바삭한 치킨 하나 주세요", "crispy-chicken"),
    ("감자 튀긴 거 줘", "fries"),
    ("포테토 하나 주세요", "fries"),
    ("양파 튀긴 거 하나", "onion-rings"),
    ("오징어 튀긴 거 줘요", "squid-rings"),
    ("긴 치즈 주세요", "long-cheese-stick"),
    ("양배추 샐러드 줘", "coleslaw"),
    ("고깔 아이스크림 하나", "soft-cone"),
    ("초코 아이스크림 줘", "choco-sundae"),
    ("츄러스 하나 주세요", "churros"),
    ("사과 파이 하나요", "apple-pie"),
    ("검은 탄산 물 하나 줘", "cola"),
    ("까만 사이다 한 병 줘", "cola"),
    ("꼴라 한 캔 주쇼", "cola"),
    ("설탕 없는 콜라 줘", "zero-cola"),
    ("쏘는 물 줘", "cider"),
    ("복숭아 물 하나 줘요", "ice-tea"),
    ("오렌지 주스 한 잔", "orange-juice"),
    ("귤 주스 주세요", "orange-juice"),
    ("딸기 간 거 하나 줘", "strawberry-shake"),
    ("맹물 하나 주세요", "water"),
    ("생수 한 병 줘요", "water"),
    # ── v2 확장 표현 (발음 변이·별칭·구어체) ──
    ("데리야끼 버거 하나 줘", "teriyaki-burger"),
    ("티라노 버거 하나 주세요", "t-rex-burger"),
    ("닭다리살 버거 하나요", "t-rex-burger"),
    ("매운 치킨 버거 하나 줘", "hot-crispy-burger"),
    ("곱빼기 버거 하나 주세요", "double-cheese-burger"),
    ("매운 불고기 버거 하나 줘요", "bulsae-burger"),
    ("감튀 하나 주세요", "fries"),
    ("어니언링 두 개 줘", ("onion-rings", 2)),
    ("스퀴드링 하나요", "squid-rings"),
    ("옛날 통닭 하나 줘", "crispy-chicken"),
    ("클래식 치킨 하나 주세요", "crispy-chicken"),
    ("윙 네 개 줘요", ("hot-wings", 4)),
    ("나겟 하나 주세요", "chicken-nugget"),
    ("가슴살 튀김 하나 줘", "chicken-tender"),
    ("소프트 아이스크림 하나요", "soft-cone"),
    ("선데이 하나 줘", "choco-sundae"),
    ("설탕 꽈배기 두 개 주세요", ("churros", 2)),
    ("코크 하나 줘", "cola"),
    ("다이어트 콜라 하나 주세요", "zero-cola"),
    ("복숭아티 한 잔 줘요", "ice-tea"),
    ("밀크셰이크 하나 주세요", "milk-shake"),
    ("우유 쉐이크 한 잔 줘", "milk-shake"),
    ("딸기 우유 하나 주세요", "strawberry-shake"),
]
for utt, spec in DICT_SINGLE:
    if isinstance(spec, tuple):
        add("single", "dict", utt, upd(spec))
    else:
        add("single", "dict", utt, upd((spec, 1)))

# ── C. 온도 속성 (attr) — hot/ice 쌍 좁히기 ──────────
ATTR = [
    ("뜨거운 커피 한 잔 줘", "hot-americano"),
    ("따뜻한 커피 주세요", "hot-americano"),
    ("시원한 커피 하나 줘", "ice-americano"),
    ("아이스 아메리카노 한 잔", "ice-americano"),
    ("차가운 쓴 커피 줘요", "ice-americano"),
    ("따뜻한 우유 커피 줘", "hot-latte"),
    ("뜨거운 라떼 한 잔 주세요", "hot-latte"),
    ("아이스 라떼 하나", "ice-latte"),
    ("시원한 부드러운 커피 줘", "ice-latte"),
    ("따끈한 커피 있어요? 한 잔 줘요", "hot-americano"),
]
for utt, mid in ATTR:
    add("single", "attr", utt, upd((mid, 1)))

# ── D. 온도 미지정·복수 후보 → 되묻기 (clarify) ──────
CLARIFY = [
    "커피 하나 줘",
    "라떼 주세요",
    "쉐이크 하나 줘요",
    "아이스크림 주세요",
    "새우 든 거 하나 줘",
    "치즈 들어간 거 줘",
    "탄산 음료 하나 주세요",
    "치킨 하나 줘",
    "버거 하나 주세요",
    "함버거 하나만",
    "튀김 하나 줘요",
    "세트 하나 주세요",
    "우유 하나 줘",
]
for utt in CLARIFY:
    add("single", "clarify", utt, {"action": "clarify"})

# 성질 표현 — 임의 확정만 아니면 됨: 되묻기(clarify)와 추천(recommend) 모두 정답
ATTRIBUTE_ASK = [
    "매운 거 하나 줘",
    "부드러운 거 하나 줘",
    "달달한 거 주세요",
    "바삭한 거 하나",
    "꽈배기 같은 거 줘",
    "속 편한 거 뭐 있어요",
]
for utt in ATTRIBUTE_ASK:
    add("single", "attr_ask", utt, {"action": ["clarify", "recommend", "update"]})

# ── E. 수량 (qty) ────────────────────────────────────
QTY = [
    ("콜라 두 개 줘", [("cola", 2)]),
    ("콜라 2개 주세요", [("cola", 2)]),
    ("감자 튀김 3개 줘요", [("fries", 3)]),
    ("감자 튀김 세 개 주세요", [("fries", 3)]),
    ("치킨 너겟 다섯 개 줘", [("chicken-nugget", 5)]),
    ("불고기 버거 네 개 줘", [("bulgogi-burger", 4)]),
    ("새우 버거 두 개 주세요", [("shrimp-burger", 2)]),
    ("생수 4개 줘요", [("water", 4)]),
    ("츄러스 세 개 줘", [("churros", 3)]),
    ("아이스크림 콘 두 개 주세요", [("soft-cone", 2)]),
    ("사이다 한 캔 줘", [("cider", 1)]),
    ("티렉스 버거 세트 두 개 주세요", [("t-rex-burger-set", 2)]),
    ("양파 튀김 두 봉지 줘", [("onion-rings", 2)]),
    ("매운 닭날개 여섯 개 줘요", [("hot-wings", 6)]),
    ("데리 버거 열 개 주세요", [("teriyaki-burger", 10)]),
    ("오렌지 주스 두 잔 줘", [("orange-juice", 2)]),
    ("밀크 쉐이크 두 잔 주세요", [("milk-shake", 2)]),
    ("치즈 스틱 두 개 줘요", [("cheese-sticks", 2)]),
    ("한우 불고기 버거 두 개 주세요", [("hanwoo-burger", 2)]),
    ("복숭아 아이스티 2잔 줘", [("ice-tea", 2)]),
]
for utt, items in QTY:
    add("single", "qty", utt, upd(*items))

# ── F. 복수 품목 한 문장 (multi_item) ────────────────
MULTI_ITEM = [
    ("불고기 버거 한 개랑 콜라 두 개 줘", [("bulgogi-burger", 1), ("cola", 2)]),
    ("새우 버거 두 개하고 사이다 한 캔 주세요", [("shrimp-burger", 2), ("cider", 1)]),
    ("티렉스 버거 세트 한 개랑 아이스크림 콘 두 개 줘요", [("t-rex-burger-set", 1), ("soft-cone", 2)]),
    ("치즈 버거 한 개, 감자 튀김 한 개 주세요", [("cheese-burger", 1), ("fries", 1)]),
    ("불고기 버거 세트 두 개랑 생수 한 병 줘", [("bulgogi-burger-set", 2), ("water", 1)]),
    ("크리스피 치킨 한 개하고 콜라 한 캔 줘요", [("crispy-chicken", 1), ("cola", 1)]),
    ("데리 버거 한 개랑 밀크 쉐이크 한 잔 주세요", [("teriyaki-burger", 1), ("milk-shake", 1)]),
    ("치킨 텐더 두 개랑 사이다 두 캔 줘", [("chicken-tender", 2), ("cider", 2)]),
    ("에이지 버거 한 개랑 양파 튀김 한 개 줘요", [("az-burger", 1), ("onion-rings", 1)]),
    ("한우 불고기 버거 세트 한 개하고 츄러스 두 개 주세요", [("hanwoo-burger-set", 1), ("churros", 2)]),
]
for utt, items in MULTI_ITEM:
    add("single", "multi_item", utt, upd(*items))

# ── G. 멀티턴: 추가 (add) ────────────────────────────
ADD = [
    ([("bulgogi-burger", 1)], "콜라도 하나 줘", [("bulgogi-burger", 1), ("cola", 1)]),
    ([("bulgogi-burger-set", 1)], "츄러스 하나 추가해줘", [("bulgogi-burger-set", 1), ("churros", 1)]),
    ([("cola", 2)], "감자 튀김 두 개 더 줘", [("cola", 2), ("fries", 2)]),
    ([("shrimp-burger", 1)], "새우 버거 하나 더 주세요", [("shrimp-burger", 2)]),
    ([("t-rex-burger-set", 1)], "아이스크림 콘 하나 주세요", [("t-rex-burger-set", 1), ("soft-cone", 1)]),
    ([("cheese-burger", 1), ("cola", 1)], "치즈 스틱도 하나 줘요", [("cheese-burger", 1), ("cola", 1), ("cheese-sticks", 1)]),
    ([("crispy-chicken", 1)], "매운 닭날개 두 개 추가요", [("crispy-chicken", 1), ("hot-wings", 2)]),
    ([("hanwoo-burger", 1)], "생수 한 병 주세요", [("hanwoo-burger", 1), ("water", 1)]),
    ([("bulsae-burger", 1)], "복숭아 아이스티 한 잔 줘", [("bulsae-burger", 1), ("ice-tea", 1)]),
    ([("teriyaki-burger-set", 1)], "데리 버거 세트 하나 더요", [("teriyaki-burger-set", 2)]),
    ([("fries", 1)], "오징어 튀긴 거도 줘", [("fries", 1), ("squid-rings", 1)]),
    ([("cola", 1)], "제로 콜라로 하나 더 줘요", [("cola", 1), ("zero-cola", 1)]),
]
for cart, utt, items in ADD:
    add("multi", "add", utt, upd(*items), [{"id": i, "qty": q} for i, q in cart])

# ── H. 멀티턴: 제거 (remove) ─────────────────────────
REMOVE = [
    ([("cola", 1), ("fries", 1)], "콜라는 빼줘", [("fries", 1)]),
    ([("bulgogi-burger", 1), ("cola", 1)], "불고기 버거 빼주세요", [("cola", 1)]),
    ([("cola", 3)], "콜라 하나 빼줘", [("cola", 2)]),
    ([("shrimp-burger", 2), ("cider", 1)], "새우 버거 하나만 빼줘요", [("shrimp-burger", 1), ("cider", 1)]),
    ([("t-rex-burger-set", 1), ("soft-cone", 2)], "아이스크림 콘은 빼주세요", [("t-rex-burger-set", 1)]),
    ([("churros", 2), ("water", 1)], "츄러스는 빼고 주세요", [("water", 1)]),
    ([("hot-wings", 1), ("cola", 1)], "닭날개는 됐어요 빼줘", [("cola", 1)]),
    ([("cheese-burger-set", 1), ("milk-shake", 1)], "밀크 쉐이크 빼줘요", [("cheese-burger-set", 1)]),
    ([("fries", 2)], "감자 튀김 하나 빼줘", [("fries", 1)]),
    ([("bulgogi-burger", 1), ("teriyaki-burger", 1)], "데리 버거는 빼주세요", [("bulgogi-burger", 1)]),
]
for cart, utt, items in REMOVE:
    add("multi", "remove", utt, upd(*items), [{"id": i, "qty": q} for i, q in cart])

# ── I. 멀티턴: 수량 변경·하나 더 ─────────────────────
QTY_CHANGE = [
    ([("cola", 1)], "콜라 두 개로 바꿔줘", [("cola", 2)]),
    ([("fries", 3)], "감자 튀김 한 개로 해주세요", [("fries", 1)]),
    ([("bulgogi-burger", 1)], "불고기 버거 세 개로 늘려줘", [("bulgogi-burger", 3)]),
    ([("churros", 2)], "츄러스 네 개로 해줘요", [("churros", 4)]),
    ([("soft-cone", 1)], "하나 더 줘", [("soft-cone", 2)]),
    ([("milk-shake", 1)], "한 개 더 주세요", [("milk-shake", 2)]),
    ([("shrimp-burger-set", 1)], "하나 더요", [("shrimp-burger-set", 2)]),
]
for cart, utt, items in QTY_CHANGE:
    add("multi", "qty", utt, upd(*items), [{"id": i, "qty": q} for i, q in cart])

# ── J. 멀티턴: 전체 취소 (cancel) ────────────────────
CANCEL = [
    ([("cola", 1), ("fries", 2)], "전부 취소해줘"),
    ([("bulgogi-burger-set", 1)], "다 취소해주세요"),
    ([("t-rex-burger", 1), ("cider", 1)], "전체 다 빼줘"),
    ([("churros", 3)], "취소해줘"),
    ([("hanwoo-burger-set", 1), ("water", 1)], "다 빼주세요"),
]
for cart, utt in CANCEL:
    add("multi", "cancel", utt, {"action": "update", "cart": []}, [{"id": i, "qty": q} for i, q in cart])

# ── K. 확정 (confirm) ────────────────────────────────
CONFIRM = [
    ([("bulgogi-burger-set", 1)], "네 맞아요"),
    ([("cola", 2), ("fries", 1)], "그걸로 주문해줘"),
    ([("shrimp-burger", 1)], "응 됐어요"),
    ([("t-rex-burger-set", 1), ("soft-cone", 1)], "주문할게요"),
    ([("cheese-burger", 1)], "예 확인했어요"),
    ([("hot-wings", 2)], "이대로 계산해주세요"),
    ([("teriyaki-burger-set", 1)], "그래 그걸로 줘"),
    ([("milk-shake", 1)], "맞습니다"),
]
for cart, utt in CONFIRM:
    add("multi", "confirm", utt, {"action": "confirm", "cart": [{"id": i, "qty": q} for i, q in cart]}, [{"id": i, "qty": q} for i, q in cart])

# ── L. 추천 (recommend) ──────────────────────────────
RECOMMEND = [
    "뭐가 맛있어요?",
    "추천 좀 해줘",
    "달달한 거 추천해줘",
    "매운 거 추천해주세요",
    "시원한 거 추천해줘요",
    "버거 뭐가 맛있어",
    "치킨 중에 뭐가 좋아요",
    "마실 거 좀 추천해줘",
    "세트 중에 잘 나가는 걸로 추천해줘",
    "아무거나 좋은 거로 줘봐",
    "어르신 입에 맞는 부드러운 거 추천해줘",
    "요즘 인기 있는 게 뭐요",
]
for utt in RECOMMEND:
    add("single", "recommend", utt, {"action": "recommend"})

# ── M. 없는 메뉴 거절 (reject) ───────────────────────
REJECT = [
    "짜장면 하나 줘",
    "김밥 두 줄 주세요",
    "피자 한 판 줘요",
    "떡볶이 주세요",
    "쌍화차 한 잔 줘",
    "붕어빵 세 개 줘요",
    "라면 하나 끓여줘",
    "국밥 한 그릇 주세요",
    "소주 한 병 줘",
    "팥빙수 하나 주세요",
]
for utt in REJECT:
    add("single", "reject", utt, {"action": "reject"})

# ── N. 세트 전환 (LLM 변별용 — 규칙 폴백 한계 케이스) ─
SET_CONVERT = [
    ([("bulgogi-burger", 1)], "세트로 바꿔줘", [("bulgogi-burger-set", 1)]),
    ([("shrimp-burger", 1)], "그거 세트로 해주세요", [("shrimp-burger-set", 1)]),
    ([("t-rex-burger", 2)], "둘 다 세트로 바꿔줘요", [("t-rex-burger-set", 2)]),
]
for cart, utt, items in SET_CONVERT:
    add("multi", "set_convert", utt, upd(*items), [{"id": i, "qty": q} for i, q in cart])

# ── O. 사투리·구어체 심화 (hard) ─────────────────────
HARD = [
    ("불고기 버거 하나랑 콜라 하나 줘", upd(("bulgogi-burger", 1), ("cola", 1))),
    ("손주 줄 아이스께끼 두 개 주쇼", {"action": "clarify"}),
    ("여기 젤 잘 나가는 버거가 뭐요", {"action": "recommend"}),
    ("이가 안 좋아서 부드러운 걸로 추천해줘", {"action": "recommend"}),
    ("커피 말고 다른 마실 거 뭐 있어", {"action": "recommend"}),
    ("아까 그 버거 말고 새우 버거로 줘", None),  # placeholder, 아래에서 교체
]
HARD = HARD[:-1]
for utt, exp in HARD:
    add("single", "hard", utt, exp)
add(
    "multi", "hard", "불고기 버거 말고 새우 버거로 바꿔줘",
    upd(("shrimp-burger", 1), ("cola", 1)),
    [{"id": "bulgogi-burger", "qty": 1}, {"id": "cola", "qty": 1}],
)
add(
    "multi", "hard", "안 시켰던 걸로 하나 더 뭐 주지? 콜라나 줘",
    upd(("bulgogi-burger", 1), ("cola", 1)),
    [{"id": "bulgogi-burger", "qty": 1}],
)

OUT.write_text("\n".join(json.dumps(c, ensure_ascii=False) for c in cases) + "\n", encoding="utf-8")
print(f"{len(cases)} cases → {OUT}")
