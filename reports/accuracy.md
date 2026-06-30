# 매핑 정확도 리포트

- provider: **rule**  ⚠ rule은 오프라인 폴백 기준선입니다. SRS 목표는 claude 기준.
- 케이스: 200건 / 소요: 0.1s
- **전체 정확도: 95.0%** (목표 ≥90%)
- 멀티턴 정확도: 91.7% (목표 ≥85%)

## 유형별
- multi: 91.7% (44/48)
- single: 96.1% (146/152)

## 태그별
- add: 90.9% (10/11)
- attr: 75.0% (6/8)
- cancel: 100.0% (5/5)
- clarify: 60.0% (6/10)
- confirm: 100.0% (9/9)
- dict: 100.0% (104/104)
- name: 100.0% (8/8)
- qty: 95.0% (19/20)
- recommend: 100.0% (9/9)
- reject: 100.0% (5/5)
- remove: 81.8% (9/11)

## 실패 케이스 (10건, 최대 30건 표시)
- `S034` "달고 부드러운 빵 줘" → 기대 {"action": "update", "cart": [{"id": "castella", "qty": 1}]} / 실제 {"action": "reject", "cart": []}
- `S037` "새콤한 거 시원한 걸로" → 기대 {"action": "update", "cart": [{"id": "strawberry-juice", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `S059` "케이크 주세요" → 기대 {"action": "clarify"} / 실제 {"action": "update", "cart": [["cheesecake", 1]]}
- `S060` "시원한 거 아무거나" → 기대 {"action": "clarify"} / 실제 {"action": "recommend", "cart": []}
- `S063` "톡 쏘는 거 하나" → 기대 {"action": "clarify"} / 실제 {"action": "reject", "cart": []}
- `S065` "빵 하나 줘" → 기대 {"action": "clarify"} / 실제 {"action": "reject", "cart": []}
- `M004` "케이크는 초코로 하나 추가" → 기대 {"action": "update", "cart": [{"id": "ice-latte", "qty": 1}, {"id": "choco-cake", "qty": 1}]} / 실제 {"action": "update", "cart": [["cheesecake", 1], ["choco-cake", 1], ["ice-latte", 1]]}
- `M010` "약과 취소해줘" → 기대 {"action": "update", "cart": [{"id": "hot-americano", "qty": 2}]} / 실제 {"action": "update", "cart": [["hot-americano", 2], ["yakgwa", 2]]}
- `M015` "빵은 됐어요 빼주세요" → 기대 {"action": "update", "cart": [{"id": "hot-latte", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["hot-latte", 1], ["scone", 1]]}
- `M017` "약과는 두 개만 줘" → 기대 {"action": "update", "cart": [{"id": "yakgwa", "qty": 2}]} / 실제 {"action": "update", "cart": [["yakgwa", 7]]}
