"""menu.json 보강 — 한 줄 설명(desc)·열량(kcal)·원산지(origin)를 채운다.

실제 키오스크 표기 항목(열량 표시, 원산지 고지)을 재현하기 위한 데이터.
열량은 공개 영양정보를 참고한 근사값이며 실증용 표시 데이터다.
사용: python scripts/enrich_menu.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "data" / "menu.json"

DESC = {
    "bulgogi-burger": "달콤한 불고기 소스의 국민 버거",
    "cheese-burger": "고소한 치즈가 들어간 기본 버거",
    "shrimp-burger": "통새우 살이 바삭한 인기 버거",
    "teriyaki-burger": "달짝지근한 간장 맛 버거",
    "hanwoo-burger": "한우로 만든 고급 불고기 버거",
    "shrimp-mozza-burger": "새우와 모짜렐라 치즈가 함께",
    "t-rex-burger": "큼직한 닭다리살 튀김 버거",
    "az-burger": "두툼한 소고기 패티의 든든한 버거",
    "hot-crispy-burger": "매콤하고 바삭한 닭고기 버거",
    "double-cheese-burger": "치즈와 고기가 두 배로 든 버거",
    "mozzarella-burger": "치즈가 쭉 늘어나는 부드러운 버거",
    "bulsae-burger": "매콤 불고기와 새우가 함께",
    "crispy-chicken": "겉은 바삭, 속은 촉촉한 치킨",
    "hot-wings": "매콤한 양념의 닭날개 튀김",
    "chicken-nugget": "한입 크기 부드러운 닭고기 튀김",
    "chicken-tender": "담백한 닭가슴살 길쭉 튀김",
    "fries": "노릇하게 튀긴 감자",
    "cheese-sticks": "쭉 늘어나는 치즈 튀김",
    "onion-rings": "바삭한 양파 링 튀김",
    "squid-rings": "쫄깃한 오징어 링 튀김",
    "long-cheese-stick": "길게 즐기는 치즈 스틱",
    "coleslaw": "아삭하고 새콤한 양배추 샐러드",
    "soft-cone": "부드러운 우유 아이스크림 콘",
    "choco-sundae": "초콜릿을 얹은 아이스크림",
    "churros": "설탕을 뿌린 바삭한 과자빵",
    "apple-pie": "따뜻한 사과 조림이 든 파이",
    "cola": "시원하고 톡 쏘는 콜라",
    "zero-cola": "설탕 없이 톡 쏘는 콜라",
    "cider": "맑고 시원한 탄산음료",
    "hot-americano": "따뜻하고 진한 원두 커피",
    "ice-americano": "얼음을 넣은 시원한 커피",
    "hot-latte": "우유를 넣어 부드러운 커피",
    "ice-latte": "시원하고 부드러운 우유 커피",
    "ice-tea": "달콤한 복숭아 맛 홍차",
    "orange-juice": "상큼한 오렌지 주스",
    "milk-shake": "진하고 시원한 우유 쉐이크",
    "strawberry-shake": "달콤한 딸기 우유 쉐이크",
    "water": "깨끗한 생수",
}

KCAL = {
    "bulgogi-burger": 495, "cheese-burger": 438, "shrimp-burger": 447,
    "teriyaki-burger": 468, "hanwoo-burger": 620, "shrimp-mozza-burger": 561,
    "t-rex-burger": 465, "az-burger": 622, "hot-crispy-burger": 484,
    "double-cheese-burger": 649, "mozzarella-burger": 685, "bulsae-burger": 520,
    "crispy-chicken": 330, "hot-wings": 420, "chicken-nugget": 265, "chicken-tender": 310,
    "fries": 387, "cheese-sticks": 305, "onion-rings": 300, "squid-rings": 340,
    "long-cheese-stick": 225, "coleslaw": 130,
    "soft-cone": 175, "choco-sundae": 240, "churros": 290, "apple-pie": 230,
    "cola": 168, "zero-cola": 0, "cider": 165,
    "hot-americano": 8, "ice-americano": 8, "hot-latte": 110, "ice-latte": 105,
    "ice-tea": 120, "orange-juice": 130, "milk-shake": 320, "strawberry-shake": 345,
    "water": 0,
}
SET_EXTRA_KCAL = 555  # 감자 튀김(387) + 콜라(168)

ORIGIN = {
    "bulgogi-burger": ["쇠고기: 호주산", "빵: 밀(수입산)"],
    "cheese-burger": ["쇠고기: 호주산", "치즈: 뉴질랜드산"],
    "shrimp-burger": ["새우: 베트남산"],
    "teriyaki-burger": ["닭고기: 국내산"],
    "hanwoo-burger": ["쇠고기: 국내산 한우"],
    "shrimp-mozza-burger": ["새우: 베트남산", "치즈: 뉴질랜드산"],
    "t-rex-burger": ["닭고기: 국내산"],
    "az-burger": ["쇠고기: 호주산"],
    "hot-crispy-burger": ["닭고기: 국내산"],
    "double-cheese-burger": ["쇠고기: 호주산", "치즈: 뉴질랜드산"],
    "mozzarella-burger": ["치즈: 뉴질랜드산"],
    "bulsae-burger": ["새우: 베트남산", "쇠고기: 호주산"],
    "crispy-chicken": ["닭고기: 국내산"],
    "hot-wings": ["닭고기: 국내산"],
    "chicken-nugget": ["닭고기: 국내산"],
    "chicken-tender": ["닭고기: 국내산"],
    "fries": ["감자: 미국산"],
    "squid-rings": ["오징어: 페루산"],
}


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    for it in data["items"]:
        mid = it["id"]
        base = it.get("set_of") or mid
        desc = DESC.get(base, "")
        if it.get("set_of"):
            desc = "감자 튀김·콜라가 함께 나오는 세트"
            it["kcal"] = KCAL.get(base, 0) + SET_EXTRA_KCAL
        elif base in KCAL:
            it["kcal"] = KCAL[base]
        if desc:
            it["desc"] = desc
        origin = ORIGIN.get(base)
        if origin:
            it["origin"] = origin
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    n_desc = sum(1 for i in data["items"] if i.get("desc"))
    n_kcal = sum(1 for i in data["items"] if "kcal" in i)
    print(f"{len(data['items'])}종 — desc {n_desc}, kcal {n_kcal}, origin {sum(1 for i in data['items'] if i.get('origin'))}")


if __name__ == "__main__":
    main()
