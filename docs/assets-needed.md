# 준비하면 좋은 이미지·자산 목록

교체 방법: 아래 파일명 그대로 `frontend/public/menu/products/`에 넣으면 끝 (코드 수정 불필요).
권장 규격: **정사각형 800×800 이상, PNG, 배경 투명 또는 흰색**, 음식이 중앙에 크게.

## 1. 제품 사진 — 현재 임시 플레이스홀더인 19종 (우선순위 높음)

| 파일명 | 메뉴 |
|---|---|
| hot-crispy-burger.png | 핫크리스피버거 |
| double-cheese-burger.png | 더블치즈버거 |
| mozzarella-burger.png | 모짜렐라 인 더 버거 |
| bulsae-burger.png | 불새버거 |
| fries.png | 포테이토 (감자 튀김) — **업셀 모달에도 나와서 중요** |
| cheese-sticks.png | 치즈스틱 |
| onion-rings.png | 양파링 |
| squid-rings.png | 오징어링 |
| long-cheese-stick.png | 롱치즈스틱 |
| coleslaw.png | 코울슬로 |
| soft-cone.png | 소프트콘 |
| choco-sundae.png | 초코 선데 |
| churros.png | 츄러스 |
| apple-pie.png | 애플파이 |
| zero-cola.png | 제로 콜라 |
| ice-tea.png | 아이스티 |
| orange-juice.png | 오렌지주스 |
| milk-shake.png | 밀크쉐이크 |
| water.png | 생수 |

- strawberry-shake.png 은 지금 딸기주스 사진을 재활용 중 — 진짜 쉐이크 사진이 있으면 교체.
- 새 파일을 넣은 뒤 `python scripts/make_menu_images.py`를 한 번 돌리면 세트 이미지가 자동으로 따라간다
  (세트는 해당 버거 사진을 복사해 쓰므로, 버거 4종 사진만 넣으면 세트 4종도 같이 좋아짐).

## 2. 세트 전용 사진 (선택 — 있으면 더 좋음)

버거+감자+콜라가 한 판에 나온 사진. 파일명: `{버거id}-set.png` (예: `bulgogi-burger-set.png`).
넣으면 세트 카드가 버거 단독 사진 대신 이걸 쓴다.

## 3. 화면 배너 (선택)

- `frontend/public/rsc/lotteria_header2.png` — 메뉴판 상단 프로모션 배너 (현재 통다리 크리스피 이미지 사용 중).
  실증용으로 팀/프로젝트 소개 배너(예: "CarpeDM 말하는 키오스크 실증 중")로 바꿔도 좋다. 권장 2000×700 내외.

## 4. 사진 촬영 팁 (실물 촬영 시)

- 흰 배경(A4 용지 2장)에 자연광, 위에서 30~45도 각도
- 스마트폰 인물 모드 끄기 (배경 흐림이 들어가면 잘라내기 어려움)
- 배경 제거는 remove.bg 또는 맥 미리보기 → 인스턴트 알파

## 5. 이미지 외에 남은 준비물

- [ ] `.env` 키 (완료), 실증 후 CLOVA Client Secret 재발급
- [ ] 라즈베리파이 세팅 — [raspberry-pi.md](raspberry-pi.md) 순서대로
- [ ] 실증 동의서·설문지 인쇄 ([planning/08_실증키트.md](planning/08_실증키트.md) 참고)
