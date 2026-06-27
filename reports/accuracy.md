# 매핑 정확도 리포트

- provider: **rule**  ⚠ rule은 오프라인 폴백 기준선입니다. SRS 목표는 claude 기준.
- 케이스: 106건 / 소요: 0.0s
- **전체 정확도: 85.8%** (목표 ≥90%)
- 멀티턴 정확도: 87.1% (목표 ≥85%)

## 유형별
- multi: 87.1% (27/31)
- single: 85.3% (64/75)

## 태그별
- add: 87.5% (7/8)
- attr: 75.0% (6/8)
- cancel: 100.0% (4/4)
- clarify: 90.0% (9/10)
- confirm: 100.0% (5/5)
- dict: 100.0% (29/29)
- name: 87.5% (7/8)
- qty: 81.2% (13/16)
- recommend: 100.0% (6/6)
- reject: 0.0% (0/5)
- remove: 71.4% (5/7)

## 실패 케이스 (15건, 최대 30건 표시)
- `S034` "달고 부드러운 빵 줘" → 기대 {"action": "update", "cart": [{"id": "castella", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `S037` "새콤한 거 시원한 걸로" → 기대 {"action": "update", "cart": [{"id": "strawberry-juice", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `S038` "콜라 두 개랑 단팥빵 하나 줘" → 기대 {"action": "update", "cart": [{"id": "cola", "qty": 2}, {"id": "red-bean-bread", "qty": 1}]} / 실제 {"action": "update", "cart": [["cola", 1], ["red-bean-bread", 1]]}
- `S039` "따뜻한 커피 둘이랑 꿀떡 두 개" → 기대 {"action": "update", "cart": [{"id": "hot-americano", "qty": 2}, {"id": "honey-rice-cake", "qty": 2}]} / 실제 {"action": "update", "cart": [["honey-rice-cake", 1], ["hot-americano", 1]]}
- `S048` "아메리카노 차가운 걸로 한 잔" → 기대 {"action": "update", "cart": [{"id": "ice-americano", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `S060` "시원한 거 아무거나" → 기대 {"action": "clarify"} / 실제 {"action": "recommend", "cart": []}
- `S066` "김치찌개 하나 줘" → 기대 {"action": "reject"} / 실제 {"action": "clarify", "cart": []}
- `S067` "햄버거 세트 있어요?" → 기대 {"action": "reject"} / 실제 {"action": "clarify", "cart": []}
- `S068` "아이스크림 콘 하나" → 기대 {"action": "reject"} / 실제 {"action": "clarify", "cart": []}
- `S069` "소주 한 병 줘" → 기대 {"action": "reject"} / 실제 {"action": "clarify", "cart": []}
- `S070` "담배 한 갑 주세요" → 기대 {"action": "reject"} / 실제 {"action": "clarify", "cart": []}
- `M004` "케이크는 초코로 하나 추가" → 기대 {"action": "update", "cart": [{"id": "ice-latte", "qty": 1}, {"id": "choco-cake", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["ice-latte", 1]]}
- `M012` "식혜 하나는 빼줘" → 기대 {"action": "update", "cart": [{"id": "sikhye", "qty": 1}]} / 실제 {"action": "update", "cart": []}
- `M015` "빵은 됐어요 빼주세요" → 기대 {"action": "update", "cart": [{"id": "hot-latte", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["hot-latte", 1], ["scone", 1]]}
- `M017` "약과는 두 개만 줘" → 기대 {"action": "update", "cart": [{"id": "yakgwa", "qty": 2}]} / 실제 {"action": "update", "cart": [["yakgwa", 7]]}
