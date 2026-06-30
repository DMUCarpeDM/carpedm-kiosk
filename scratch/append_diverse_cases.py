import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTSET_PATH = ROOT / "data" / "testset.jsonl"

diverse_cases = [
    # Dialect variations (S106 ~ S120)
    {"id":"S106","type":"single","tag":"dict","cart_before":[],"utterance":"시원한 단술 한 사발 주이소","expected":{"action":"update","cart":[{"id":"sikhye","qty":1}]}},
    {"id":"S107","type":"single","tag":"dict","cart_before":[],"utterance":"뜨뜻한 한방차 한 잔 달여주소","expected":{"action":"update","cart":[{"id":"ssanghwa-tea","qty":1}]}},
    {"id":"S108","type":"single","tag":"dict","cart_before":[],"utterance":"커피 따순 걸로다가 두 잔 주련","expected":{"action":"update","cart":[{"id":"hot-americano","qty":2}]}},
    {"id":"S109","type":"single","tag":"dict","cart_before":[],"utterance":"우유 커피 시원하게 해서 하나 주소","expected":{"action":"update","cart":[{"id":"ice-latte","qty":1}]}},
    {"id":"S110","type":"single","tag":"dict","cart_before":[],"utterance":"단팥빵 한 봉다리하고 콜라 하나 주이소","expected":{"action":"update","cart":[{"id":"red-bean-bread","qty":1},{"id":"cola","qty":1}]}},
    {"id":"S111","type":"single","tag":"dict","cart_before":[],"utterance":"미숫가루 물 차가운 놈으로 한 그릇 줘봐요","expected":{"action":"update","cart":[{"id":"grain-latte","qty":1}]}},
    {"id":"S112","type":"single","tag":"dict","cart_before":[],"utterance":"꽃 모양 과자 고거 두 개 주소","expected":{"action":"update","cart":[{"id":"yakgwa","qty":2}]}},
    {"id":"S113","type":"single","tag":"dict","cart_before":[],"utterance":"치즈 빵 노란 거 한 조각 주련","expected":{"action":"update","cart":[{"id":"cheesecake","qty":1}]}},
    {"id":"S114","type":"single","tag":"dict","cart_before":[],"utterance":"따신 고구마 라떼 한 잔 주이소","expected":{"action":"update","cart":[{"id":"sweet-potato-latte","qty":1}]}},
    {"id":"S115","type":"single","tag":"dict","cart_before":[],"utterance":"쓴 커피 뜨거운 거 세 잔 부탁함메","expected":{"action":"update","cart":[{"id":"hot-americano","qty":3}]}},
    {"id":"S116","type":"single","tag":"dict","cart_before":[],"utterance":"꿀떡 한 팩 담아주소","expected":{"action":"update","cart":[{"id":"honey-rice-cake","qty":1}]}},
    {"id":"S117","type":"single","tag":"dict","cart_before":[],"utterance":"사이다 시원하게 두 캔 주소","expected":{"action":"update","cart":[{"id":"cider","qty":2}]}},
    {"id":"S118","type":"single","tag":"dict","cart_before":[],"utterance":"딸기 간 거 한 대접 주시라예","expected":{"action":"update","cart":[{"id":"strawberry-juice","qty":1}]}},
    {"id":"S119","type":"single","tag":"dict","cart_before":[],"utterance":"담백한 스콘 빵 하나 주련","expected":{"action":"update","cart":[{"id":"scone","qty":1}]}},
    {"id":"S120","type":"single","tag":"dict","cart_before":[],"utterance":"초코 케이크 달달한 놈으로다가 하나 주이소","expected":{"action":"update","cart":[{"id":"choco-cake","qty":1}]}},

    # Filler words and slow-speech markers (S121 ~ S135)
    {"id":"S121","type":"single","tag":"dict","cart_before":[],"utterance":"어... 그러니까... 그... 뜨거운 커피 한 잔하고... 저... 팥 든 빵 하나","expected":{"action":"update","cart":[{"id":"hot-americano","qty":1},{"id":"red-bean-bread","qty":1}]}},
    {"id":"S122","type":"single","tag":"dict","cart_before":[],"utterance":"음... 저기요, 아메리카노 시원한 거 한 잔만 줘 봐요","expected":{"action":"update","cart":[{"id":"ice-americano","qty":1}]}},
    {"id":"S123","type":"single","tag":"dict","cart_before":[],"utterance":"아이고... 날이 더우니까 식혜 한 잔 시원하게 주소","expected":{"action":"update","cart":[{"id":"sikhye","qty":1}]}},
    {"id":"S124","type":"single","tag":"dict","cart_before":[],"utterance":"어... 그... 고구마 우유 음료 뜨겁게 한 잔 주세요","expected":{"action":"update","cart":[{"id":"sweet-potato-latte","qty":1}]}},
    {"id":"S125","type":"single","tag":"dict","cart_before":[],"utterance":"저기... 약과가 어디 있나... 약과 두 개 주시오","expected":{"action":"update","cart":[{"id":"yakgwa","qty":2}]}},
    {"id":"S126","type":"single","tag":"dict","cart_before":[],"utterance":"음... 쓴 커피 뜨거운 걸로 한 잔 주이소","expected":{"action":"update","cart":[{"id":"hot-americano","qty":1}]}},
    {"id":"S127","type":"single","tag":"dict","cart_before":[],"utterance":"에... 또... 사이다 하나랑 꿀떡 하나 주시오","expected":{"action":"update","cart":[{"id":"cider","qty":1},{"id":"honey-rice-cake","qty":1}]}},
    {"id":"S128","type":"single","tag":"dict","cart_before":[],"utterance":"어... 음... 허연 우유 커피 따뜻한 거 한 잔 주이소","expected":{"action":"update","cart":[{"id":"hot-latte","qty":1}]}},
    {"id":"S129","type":"single","tag":"dict","cart_before":[],"utterance":"저... 시원한 곡물 미숫가루 음료 한 잔 주시오","expected":{"action":"update","cart":[{"id":"grain-latte","qty":1}]}},
    {"id":"S130","type":"single","tag":"dict","cart_before":[],"utterance":"아이고... 달콤한 설탕 커피 하나 시원한 걸로 주소","expected":{"action":"update","cart":[{"id":"dolce-caramel-macchiato","qty":1}]}},
    {"id":"S131","type":"single","tag":"dict","cart_before":[],"utterance":"음... 카스텔라 빵 부드러운 거 하나 줘봐요","expected":{"action":"update","cart":[{"id":"castella","qty":1}]}},
    {"id":"S132","type":"single","tag":"dict","cart_before":[],"utterance":"어... 호두 과자 하나랑... 음... 식혜 하나","expected":{"action":"update","cart":[{"id":"walnut-cookie","qty":1},{"id":"sikhye","qty":1}]}},
    {"id":"S133","type":"single","tag":"dict","cart_before":[],"utterance":"저기... 노란 치즈 케이크 하나 포장해주소","expected":{"action":"update","cart":[{"id":"cheesecake","qty":1}]}},
    {"id":"S134","type":"single","tag":"dict","cart_before":[],"utterance":"음... 그러니까... 빨간 딸기 쥬스 하나 주시오","expected":{"action":"update","cart":[{"id":"strawberry-juice","qty":1}]}},
    {"id":"S135","type":"single","tag":"dict","cart_before":[],"utterance":"에... 벌집 모양 크로플 하나 주세요","expected":{"action":"update","cart":[{"id":"croffle","qty":1}]}},

    # Typo/STT pronunciation approximations (S136 ~ S145)
    {"id":"S136","type":"single","tag":"dict","cart_before":[],"utterance":"아메리카노아이스 한잔","expected":{"action":"update","cart":[{"id":"ice-americano","qty":1}]}},
    {"id":"S137","type":"single","tag":"dict","cart_before":[],"utterance":"카패라때 뜨거운거 한잔","expected":{"action":"update","cart":[{"id":"hot-latte","qty":1}]}},
    {"id":"S138","type":"single","tag":"dict","cart_before":[],"utterance":"돌채 카라맬 마끼아또 한잔","expected":{"action":"update","cart":[{"id":"dolce-caramel-macchiato","qty":1}]}},
    {"id":"S139","type":"single","tag":"dict","cart_before":[],"utterance":"흑임자라때 뜨끈한걸로 하나","expected":{"action":"update","cart":[{"id":"black-sesame-latte","qty":1}]}},
    {"id":"S140","type":"single","tag":"dict","cart_before":[],"utterance":"유자차 뜨뜻하게 한잔","expected":{"action":"update","cart":[{"id":"yuja-tea","qty":1}]}},
    {"id":"S141","type":"single","tag":"dict","cart_before":[],"utterance":"쌍화차 따뜻한거 한그릇","expected":{"action":"update","cart":[{"id":"ssanghwa-tea","qty":1}]}},
    {"id":"S142","type":"single","tag":"dict","cart_before":[],"utterance":"생딸기주스 얼음띄워서 하나","expected":{"action":"update","cart":[{"id":"strawberry-juice","qty":1}]}},
    {"id":"S143","type":"single","tag":"dict","cart_before":[],"utterance":"카스테라빵 노란거 하나","expected":{"action":"update","cart":[{"id":"castella","qty":1}]}},
    {"id":"S144","type":"single","tag":"dict","cart_before":[],"utterance":"치즈케익 하나만","expected":{"action":"update","cart":[{"id":"cheesecake","qty":1}]}},
    {"id":"S145","type":"single","tag":"dict","cart_before":[],"utterance":"코카꼴라 시원한거 하나","expected":{"action":"update","cart":[{"id":"cola","qty":1}]}},

    # Complex multi-turn corrections (M043 ~ M046)
    {"id":"M043","type":"multi","tag":"remove","cart_before":[{"id":"hot-americano","qty":2},{"id":"castella","qty":1}],"utterance":"아메리카노 하나만 취소해줘","expected":{"action":"update","cart":[{"id":"hot-americano","qty":1},{"id":"castella","qty":1}]}},
    {"id":"M044","type":"multi","tag":"add","cart_before":[{"id":"sikhye","qty":1}],"utterance":"거기다가 단팥빵 하나 더 얹어주소","expected":{"action":"update","cart":[{"id":"sikhye","qty":1},{"id":"red-bean-bread","qty":1}]}},
    {"id":"M045","type":"multi","tag":"qty","cart_before":[{"id":"yakgwa","qty":1}],"utterance":"약과는 총 여섯 개로 늘려주소","expected":{"action":"update","cart":[{"id":"yakgwa","qty":6}]}},
    {"id":"M046","type":"multi","tag":"confirm","cart_before":[{"id":"hot-latte","qty":2}],"utterance":"그래 고것이 맞다 주문 진행해라","expected":{"action":"confirm"}}
]

lines = TESTSET_PATH.read_text(encoding="utf-8").splitlines()
cleaned_lines = [l.strip() for l in lines if l.strip()]

for case in diverse_cases:
    cleaned_lines.append(json.dumps(case, ensure_ascii=False))

TESTSET_PATH.write_text("\n".join(cleaned_lines) + "\n", encoding="utf-8")
print(f"Successfully appended 44 cases. Total cases: {len(cleaned_lines)}")
