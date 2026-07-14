#!/bin/bash
# 상품 사진 최적화 — 큰 PNG/JPG를 키오스크용 작은 WebP로 변환한다.
# 태블릿·네트워크에서 즉시 로드되게 하는 핵심 스크립트 (원본 2MB → ~25KB).
#
# 사용법:
#   1) 실사진(고해상 PNG)을 frontend/public/menu/products/<메뉴id>.png 로 넣는다
#      (메뉴 id는 data/menu.json의 id와 정확히 일치해야 함)
#   2) bash scripts/optimize-images.sh
#   3) 원본 PNG는 rsc/product-originals/ 로 자동 백업되고, public에는 webp만 남는다
#
# 필요: cwebp (brew install webp / 파이: sudo apt install webp)
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
PROD="$DIR/frontend/public/menu/products"
BACKUP="$DIR/rsc/product-originals"
MAXW="${1:-512}"   # 최대 폭(px). 카드 표시가 ~250px라 512면 2x 레티나로 충분

if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp가 없습니다. 설치: brew install webp (맥) 또는 sudo apt install webp (파이)"
  exit 1
fi

mkdir -p "$BACKUP"
cd "$PROD"

shopt -s nullglob
pngs=(*.png *.jpg *.jpeg)
if [ ${#pngs[@]} -eq 0 ]; then
  echo "변환할 PNG/JPG가 없습니다. ($PROD 에 실사진을 넣으세요)"
  exit 0
fi

cnt=0
for f in "${pngs[@]}"; do
  base="${f%.*}"
  if cwebp -quiet -q 80 -resize "$MAXW" 0 "$f" -o "$base.webp"; then
    mv "$f" "$BACKUP/"
    cnt=$((cnt+1))
    echo "  ✓ $f → $base.webp ($(ls -la "$base.webp" | awk '{print $5}') bytes)"
  else
    echo "  ✗ 변환 실패: $f"
  fi
done

echo ""
echo "완료: $cnt개 최적화. 원본은 $BACKUP 에 백업됨."

# 투명 여백 트리밍 — 카드에서 실물 크기가 통일돼 보이게 (모짜렐라버거 등)
if [ -x "$DIR/.venv/bin/python" ]; then
  "$DIR/.venv/bin/python" "$DIR/scripts/trim_product_images.py"
else
  python3 "$DIR/scripts/trim_product_images.py" || echo "(트리밍 생략 — Pillow 필요: pip install pillow)"
fi

echo "프론트 다시 빌드하세요: (cd frontend && npm run build)"
