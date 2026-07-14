# 준비하면 좋은 이미지·자산 목록

교체 방법 (2단계, 코드 수정 불필요):
1. 아래 파일명 그대로 `frontend/public/menu/products/`에 PNG를 넣는다.
2. `bash scripts/optimize-images.sh` 실행 — **필수.** 화면은 WebP만 로드하므로(`frontend/src/menuImages.ts`)
   PNG만 넣으면 사진이 안 나온다. 원본 PNG는 `rsc/product-originals/`로 자동 백업된다.

권장 규격: **정사각형 800×800 이상, PNG, 배경 투명 또는 흰색**, 음식이 중앙에 크게.

## 1. 제품 사진 — 남은 플레이스홀더 2종

> 2026-07-13 실사진 47종 반영 완료 ✅ (49종 중 47). 남은 것:

| 파일명 | 메뉴 |
|---|---|
| hot-latte.png | 따뜻한 카페라떼 |
| ice-latte.png | 아이스 카페라떼 |

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
