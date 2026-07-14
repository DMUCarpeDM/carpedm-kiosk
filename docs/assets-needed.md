# 준비하면 좋은 이미지·자산 목록

교체 방법 (2단계, 코드 수정 불필요):
1. 아래 파일명 그대로 `frontend/public/menu/products/`에 PNG를 넣는다.
2. `bash scripts/optimize-images.sh` 실행 — **필수.** 화면은 WebP만 로드하므로(`frontend/src/menuImages.ts`)
   PNG만 넣으면 사진이 안 나온다. 원본 PNG는 `rsc/product-originals/`로 자동 백업된다.

권장 규격: **정사각형 800×800 이상, PNG, 배경 투명 또는 흰색**, 음식이 중앙에 크게.

## 1. 제품 사진 — 현재 임시 플레이스홀더인 16종 (우선순위 높음)

> 2026-07-12 메뉴 최신화 + 2026-07-13 실사진 10장 반영
> (핫크리스피·더블치즈·모짜렐라 버거+세트, 감자튀김, 치즈스틱, 롱치즈스틱, 통오징어링 ✅).
> 세트 이미지는 버거 사진을 자동 복사하므로 아래 단품만 찍으면 된다.

**버거 (4종 — 카드가 커서 가장 눈에 띔, 최우선):**

| 파일명 | 메뉴 |
|---|---|
| chicken-burger.png | 치킨버거 |
| bulgogi-burger-double.png | 리아 불고기 더블 (빅불) |
| miracle-burger.png | 미라클버거 |
| bibim-rice-burger.png | 전주 비빔라이스 버거 |

**치킨·사이드 (5종):**

| 파일명 | 메뉴 |
|---|---|
| chicken-fillet.png | 치킨휠레 2조각 |
| fire-wing.png | 화이어윙 2조각 |
| chicken-leg.png | 치킨다리 1조각 |
| seasoned-fries.png | 양념감자 |
| coleslaw.png | 코울슬로 |

**디저트·음료 (7종):**

| 파일명 | 메뉴 |
|---|---|
| sundae-icecream.png | 선데아이스크림 플레인 |
| tornado-choco.png | 토네이도 더블초코 |
| tornado-strawberry.png | 토네이도 스트로베리 |
| soft-cone.png | 소프트콘 |
| lemonade.png | 레몬에이드 |
| zero-cola.png | 제로슈거콜라 |
| ice-tea.png | 아이스티 |
| orange-juice.png | 오렌지주스 |
| water.png | 생수 |

(라떼류 hot-latte/ice-latte도 플레이스홀더 — 여유 되면 추가)

- 새 파일을 넣은 뒤 `python scripts/make_menu_images.py`를 한 번 돌리면 세트 이미지가 자동으로 따라간다
  (세트는 해당 버거 사진을 복사해 쓰므로, 버거 사진만 넣으면 세트도 같이 좋아짐).
- ⚠ make_menu_images.py는 products/ 폴더의 **PNG 기준**으로 판단한다. 실사진을 넣을 때는
  반드시 PNG 투입 → make_menu_images.py → optimize-images.sh 순서로.

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
