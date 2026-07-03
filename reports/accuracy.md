# 매핑 정확도 리포트

- provider: **rule**  ⚠ rule은 오프라인 폴백 기준선입니다. SRS 목표는 claude 기준.
- 케이스: 222건 / 소요: 0.1s
- **전체 정확도: 98.6%** (목표 ≥90%)
- 멀티턴 정확도: 93.6% (목표 ≥85%)

## 유형별
- multi: 93.6% (44/47)
- single: 100.0% (175/175)

## 태그별
- add: 100.0% (12/12)
- attr: 100.0% (10/10)
- cancel: 100.0% (5/5)
- clarify: 100.0% (17/17)
- confirm: 100.0% (8/8)
- dict: 100.0% (41/41)
- hard: 100.0% (7/7)
- multi_item: 100.0% (10/10)
- name: 100.0% (50/50)
- qty: 100.0% (27/27)
- recommend: 100.0% (12/12)
- reject: 100.0% (10/10)
- remove: 100.0% (10/10)
- set_convert: 0.0% (0/3)

## 실패 케이스 (3건, 최대 30건 표시)
- `T213` "세트로 바꿔줘" → 기대 {"action": "update", "cart": [{"id": "bulgogi-burger-set", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["bulgogi-burger", 1]]}
- `T214` "그거 세트로 해주세요" → 기대 {"action": "update", "cart": [{"id": "shrimp-burger-set", "qty": 1}]} / 실제 {"action": "clarify", "cart": [["shrimp-burger", 1]]}
- `T215` "둘 다 세트로 바꿔줘요" → 기대 {"action": "update", "cart": [{"id": "t-rex-burger-set", "qty": 2}]} / 실제 {"action": "clarify", "cart": [["t-rex-burger", 2]]}
