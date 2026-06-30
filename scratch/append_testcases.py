import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTSET_PATH = ROOT / "data" / "testset.jsonl"

new_cases = [
    # Single-turn cases (S071 ~ S105)
    {"id":"S071","type":"single","tag":"dict","cart_before":[],"utterance":"시꺼먼 물 차갑게 한 잔","expected":{"action":"update","cart":[{"id":"ice-americano","qty":1}]}},
    {"id":"S072","type":"single","tag":"dict","cart_before":[],"utterance":"따뜻한 아메리카노 두 잔 줘","expected":{"action":"update","cart":[{"id":"hot-americano","qty":2}]}},
    {"id":"S073","type":"single","tag":"dict","cart_before":[],"utterance":"허연 우유 탄 커피 시원한 걸로 하나","expected":{"action":"update","cart":[{"id":"ice-latte","qty":1}]}},
    {"id":"S074","type":"single","tag":"dict","cart_before":[],"utterance":"설탕 듬뿍 든 달달한 커피 하나 줘","expected":{"action":"update","cart":[{"id":"dolce-caramel-macchiato","qty":1}]}},
    {"id":"S075","type":"single","tag":"dict","cart_before":[],"utterance":"고소한 검은깨 라떼 뜨거운 거","expected":{"action":"update","cart":[{"id":"black-sesame-latte","qty":1}]}},
    {"id":"S076","type":"single","tag":"dict","cart_before":[],"utterance":"따신 고구마 라떼 하나","expected":{"action":"update","cart":[{"id":"sweet-potato-latte","qty":1}]}},
    {"id":"S077","type":"single","tag":"dict","cart_before":[],"utterance":"찬 곡물 음료수 한 잔 줘","expected":{"action":"update","cart":[{"id":"grain-latte","qty":1}]}},
    {"id":"S078","type":"single","tag":"dict","cart_before":[],"utterance":"뜨뜻한 유자 차","expected":{"action":"update","cart":[{"id":"yuja-tea","qty":1}]}},
    {"id":"S079","type":"single","tag":"dict","cart_before":[],"utterance":"한방 약차 한 잔 다려줘","expected":{"action":"update","cart":[{"id":"ssanghwa-tea","qty":1}]}},
    {"id":"S080","type":"single","tag":"dict","cart_before":[],"utterance":"시원한 단술 두 대접 줘","expected":{"action":"update","cart":[{"id":"sikhye","qty":2}]}},
    {"id":"S081","type":"single","tag":"dict","cart_before":[],"utterance":"생딸기 간 거 한 잔 주세요","expected":{"action":"update","cart":[{"id":"strawberry-juice","qty":1}]}},
    {"id":"S082","type":"single","tag":"dict","cart_before":[],"utterance":"단팥빵 세 개 주세요","expected":{"action":"update","cart":[{"id":"red-bean-bread","qty":3}]}},
    {"id":"S083","type":"single","tag":"dict","cart_before":[],"utterance":"꽃 모양 과자 두 개","expected":{"action":"update","cart":[{"id":"yakgwa","qty":2}]}},
    {"id":"S084","type":"single","tag":"dict","cart_before":[],"utterance":"꿀 떡 한 팩 줘","expected":{"action":"update","cart":[{"id":"honey-rice-cake","qty":1}]}},
    {"id":"S085","type":"single","tag":"dict","cart_before":[],"utterance":"호두 든 거 하나","expected":{"action":"update","cart":[{"id":"walnut-cookie","qty":1}]}},
    {"id":"S086","type":"single","tag":"dict","cart_before":[],"utterance":"벌집 모양 빵 하나 줘","expected":{"action":"update","cart":[{"id":"croffle","qty":1}]}},
    {"id":"S087","type":"single","tag":"dict","cart_before":[],"utterance":"안 달고 담백한 빵 하나","expected":{"action":"update","cart":[{"id":"scone","qty":1}]}},
    {"id":"S088","type":"single","tag":"dict","cart_before":[],"utterance":"노란 부드러운 카스테라 하나","expected":{"action":"update","cart":[{"id":"castella","qty":1}]}},
    {"id":"S089","type":"single","tag":"dict","cart_before":[],"utterance":"말랑한 푸딩 셋","expected":{"action":"update","cart":[{"id":"pudding","qty":3}]}},
    {"id":"S090","type":"single","tag":"dict","cart_before":[],"utterance":"코카콜라 두 병","expected":{"action":"update","cart":[{"id":"cola","qty":2}]}},
    {"id":"S091","type":"single","tag":"dict","cart_before":[],"utterance":"스프라이트 세 캔","expected":{"action":"update","cart":[{"id":"cider","qty":3}]}} ,
    {"id":"S092","type":"single","tag":"dict","cart_before":[],"utterance":"치즈 케이크 하나 포장","expected":{"action":"update","cart":[{"id":"cheesecake","qty":1}]}},
    {"id":"S093","type":"single","tag":"dict","cart_before":[],"utterance":"초코 케익 둘 줘","expected":{"action":"update","cart":[{"id":"choco-cake","qty":2}]}},
    {"id":"S094","type":"single","tag":"dict","cart_before":[],"utterance":"쓴 커피 뜨거운 거 세 개랑 단팥빵 둘","expected":{"action":"update","cart":[{"id":"hot-americano","qty":3},{"id":"red-bean-bread","qty":2}]}},
    {"id":"S095","type":"single","tag":"dict","cart_before":[],"utterance":"식혜 네 잔이랑 호두 과자 하나","expected":{"action":"update","cart":[{"id":"sikhye","qty":4},{"id":"walnut-cookie","qty":1}]}},
    {"id":"S096","type":"single","tag":"dict","cart_before":[],"utterance":"딸기 주스 하나 사이다 둘","expected":{"action":"update","cart":[{"id":"strawberry-juice","qty":1},{"id":"cider","qty":2}]}},
    {"id":"S097","type":"single","tag":"dict","cart_before":[],"utterance":"뜨뜻한 우유 든 커피 한 잔이랑 카스테라 빵 하나","expected":{"action":"update","cart":[{"id":"hot-latte","qty":1},{"id":"castella","qty":1}]}},
    {"id":"S098","type":"single","tag":"dict","cart_before":[],"utterance":"약과 여섯 개","expected":{"action":"update","cart":[{"id":"yakgwa","qty":6}]}},
    {"id":"S099","type":"single","tag":"dict","cart_before":[],"utterance":"꿀 떡 세 개","expected":{"action":"update","cart":[{"id":"honey-rice-cake","qty":3}]}},
    {"id":"S100","type":"single","tag":"dict","cart_before":[],"utterance":"곡물 라떼 세 잔이요","expected":{"action":"update","cart":[{"id":"grain-latte","qty":3}]}},
    {"id":"S101","type":"single","tag":"dict","cart_before":[],"utterance":"시원한 우유 커피 다섯 잔","expected":{"action":"update","cart":[{"id":"ice-latte","qty":5}]}},
    {"id":"S102","type":"single","tag":"dict","cart_before":[],"utterance":"스콘 하나 주세요","expected":{"action":"update","cart":[{"id":"scone","qty":1}]}},
    {"id":"S103","type":"single","tag":"dict","cart_before":[],"utterance":"따뜻한 아메리카노 하나","expected":{"action":"update","cart":[{"id":"hot-americano","qty":1}]}},
    {"id":"S104","type":"single","tag":"dict","cart_before":[],"utterance":"아이스 카페라떼 한 잔","expected":{"action":"update","cart":[{"id":"ice-latte","qty":1}]}},
    {"id":"S105","type":"single","tag":"dict","cart_before":[],"utterance":"코카콜라 하나주세요","expected":{"action":"update","cart":[{"id":"cola","qty":1}]}},

    # Multi-turn cases (M031 ~ M042)
    {"id":"M031","type":"multi","tag":"add","cart_before":[{"id":"hot-americano","qty":1}],"utterance":"거기다 약과도 하나 더해줘","expected":{"action":"update","cart":[{"id":"hot-americano","qty":1},{"id":"yakgwa","qty":1}]}},
    {"id":"M032","type":"multi","tag":"add","cart_before":[{"id":"sikhye","qty":2}],"utterance":"단팥빵도 두 개만 추가","expected":{"action":"update","cart":[{"id":"sikhye","qty":2},{"id":"red-bean-bread","qty":2}]}},
    {"id":"M033","type":"multi","tag":"remove","cart_before":[{"id":"cola","qty":1},{"id":"cider","qty":1}],"utterance":"사이다는 빼줘요","expected":{"action":"update","cart":[{"id":"cola","qty":1}]}},
    {"id":"M034","type":"multi","tag":"remove","cart_before":[{"id":"red-bean-bread","qty":2},{"id":"yakgwa","qty":1}],"utterance":"약과는 빼","expected":{"action":"update","cart":[{"id":"red-bean-bread","qty":2}]}},
    {"id":"M035","type":"multi","tag":"qty","cart_before":[{"id":"ice-americano","qty":1}],"utterance":"시원한 커피 세 잔으로 변경해줘","expected":{"action":"update","cart":[{"id":"ice-americano","qty":3}]}},
    {"id":"M036","type":"multi","tag":"qty","cart_before":[{"id":"sikhye","qty":1},{"id":"honey-rice-cake","qty":1}],"utterance":"식혜는 세 잔으로 해줘","expected":{"action":"update","cart":[{"id":"sikhye","qty":3},{"id":"honey-rice-cake","qty":1}]}},
    {"id":"M037","type":"multi","tag":"remove","cart_before":[{"id":"hot-latte","qty":2}],"utterance":"따뜻한 우유 커피 하나는 빼줘","expected":{"action":"update","cart":[{"id":"hot-latte","qty":1}]}},
    {"id":"M038","type":"multi","tag":"qty","cart_before":[{"id":"cola","qty":1}],"utterance":"콜라 하나 더","expected":{"action":"update","cart":[{"id":"cola","qty":2}]}},
    {"id":"M039","type":"multi","tag":"cancel","cart_before":[{"id":"pudding","qty":2},{"id":"castella","qty":1}],"utterance":"아이고 취소할게요 다 빼줘요","expected":{"action":"update","cart":[]}},
    {"id":"M040","type":"multi","tag":"confirm","cart_before":[{"id":"ssanghwa-tea","qty":1}],"utterance":"맞아 그걸로 해줘","expected":{"action":"confirm"}},
    {"id":"M041","type":"multi","tag":"confirm","cart_before":[{"id":"strawberry-juice","qty":1},{"id":"croffle","qty":2}],"utterance":"네 맞습니다 주문 넣어주세요","expected":{"action":"confirm"}},
    {"id":"M042","type":"multi","tag":"confirm","cart_before":[{"id":"scone","qty":1}],"utterance":"응 맞아","expected":{"action":"confirm"}},

    # Recommendation cases (R007 ~ R009)
    {"id":"R007","type":"single","tag":"recommend","cart_before":[],"utterance":"시원하고 톡 쏘는 거 추천해줘","expected":{"action":"recommend"}},
    {"id":"R008","type":"single","tag":"recommend","cart_before":[],"utterance":"여기서 제일 인기 많은 거 하나 골라줘요","expected":{"action":"recommend"}},
    {"id":"R009","type":"multi","tag":"recommend","cart_before":[{"id":"red-bean-bread","qty":2}],"utterance":"같이 마실 만한 음료 추천해줘","expected":{"action":"recommend"}}
]

lines = TESTSET_PATH.read_text(encoding="utf-8").splitlines()
# Filter out empty lines to rebuild
cleaned_lines = [l.strip() for l in lines if l.strip()]

for case in new_cases:
    cleaned_lines.append(json.dumps(case, ensure_ascii=False))

# Re-write the file
TESTSET_PATH.write_text("\n".join(cleaned_lines) + "\n", encoding="utf-8")
print(f"Successfully wrote {len(cleaned_lines)} cases to {TESTSET_PATH}")
