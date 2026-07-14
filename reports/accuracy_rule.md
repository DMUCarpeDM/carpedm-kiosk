# 매핑 정확도 리포트

- provider: **rule**  ⚠ rule은 오프라인 폴백 기준선입니다. SRS 목표는 claude 기준.
- 케이스: 248건 / 소요: 0.1s
- **전체 정확도: 98.8%** (목표 ≥90%)
- 멀티턴 정확도: 93.6% (목표 ≥85%)

## 유형별
- multi: 93.6% (44/47)
- single: 100.0% (201/201)

## 태그별
- add: 100.0% (12/12)
- attr: 100.0% (10/10)
- attr_ask: 100.0% (6/6)
- cancel: 100.0% (5/5)
- clarify: 100.0% (13/13)
- confirm: 100.0% (8/8)
- dict: 100.0% (63/63)
- hard: 100.0% (7/7)
- multi_item: 100.0% (10/10)
- name: 100.0% (49/49)
- qty: 100.0% (27/27)
- recommend: 100.0% (12/12)
- reject: 100.0% (13/13)
- remove: 100.0% (10/10)
- set_convert: 0.0% (0/3)

## 실패 케이스 (3건, 최대 30건 표시)
- `T239` "세트로 바꿔줘" → 기대 {"action": "update", "cart": [{"id": "bulgogi-burger-set", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["bulgogi-burger", 1]]}
- `T240` "그거 세트로 해주세요" → 기대 {"action": "update", "cart": [{"id": "shrimp-burger-set", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["shrimp-burger", 1]]}
- `T241` "둘 다 세트로 바꿔줘요" → 기대 {"action": "update", "cart": [{"id": "chicken-burger-set", "qty": 2}]} / 실제 {"action": "clarify", "cart": [["chicken-burger", 2]]}
