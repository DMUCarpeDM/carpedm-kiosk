# 매핑 정확도 리포트

- provider: **claude**
- 케이스: 246건 / 소요: 450.2s
- **전체 정확도: 96.3%** (목표 ≥90%)
- 멀티턴 정확도: 95.7% (목표 ≥85%)

## 유형별
- multi: 95.7% (45/47)
- single: 96.5% (192/199)

## 태그별
- add: 100.0% (12/12)
- attr: 100.0% (10/10)
- attr_ask: 100.0% (6/6)
- cancel: 100.0% (5/5)
- clarify: 92.3% (12/13)
- confirm: 100.0% (8/8)
- dict: 95.2% (60/63)
- hard: 85.7% (6/7)
- multi_item: 100.0% (10/10)
- name: 96.0% (48/50)
- qty: 100.0% (27/27)
- recommend: 100.0% (12/12)
- reject: 100.0% (10/10)
- remove: 80.0% (8/10)
- set_convert: 100.0% (3/3)

## 실패 케이스 (9건, 최대 30건 표시)
- `T009` "핫크리스피 버거 하나 주세요" → 기대 {"action": "update", "cart": [{"id": "hot-crispy-burger", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `T021` "핫크리스피 버거 세트 하나 주세요" → 기대 {"action": "update", "cart": [{"id": "hot-crispy-burger-set", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `T060` "매콤한 버거 하나 줘" → 기대 {"action": "update", "cart": [{"id": "hot-crispy-burger", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `T064` "매운 날개 튀김 주세요" → 기대 {"action": "update", "cart": [{"id": "hot-wings", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `T096` "매운 불고기 버거 하나 줘요" → 기대 {"action": "update", "cart": [{"id": "bulsae-burger", "qty": 1}]} / 실제 {"action": "clarify", "cart": []}
- `T128` "새우 든 거 하나 줘" → 기대 {"action": "clarify"} / 실제 {"action": "update", "cart": [["shrimp-burger", 1]]}
- `T189` "아이스크림 콘은 빼주세요" → 기대 {"action": "update", "cart": [{"id": "t-rex-burger-set", "qty": 1}]} / 실제 {"action": "update", "cart": [["soft-cone", 1], ["t-rex-burger-set", 1]]}
- `T193` "감자 튀김 하나 빼줘" → 기대 {"action": "update", "cart": [{"id": "fries", "qty": 1}]} / 실제 {"action": "update", "cart": []}
- `T241` "손주 줄 아이스께끼 두 개 주쇼" → 기대 {"action": "clarify"} / 실제 {"action": "update", "cart": [["soft-cone", 2]]}
