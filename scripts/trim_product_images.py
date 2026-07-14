"""상품 이미지 투명 여백 트리밍 — 카드마다 실물 크기가 달라 보이는 문제 해결.

원인: 일부 실사진(webp)은 피사체 위아래에 큰 투명 여백이 있어(예: 모짜렐라버거)
      contain 박스 안에서 다른 메뉴보다 작게 그려진다.
처리: 알파 채널 bbox로 여백을 잘라내고 4%의 균일 여백만 남긴다.
      여백이 원래 작은 이미지(잘릴 부분 5% 미만)와 배경이 불투명한 이미지는 건드리지 않는다.
사용: python scripts/trim_product_images.py   # frontend/public/menu/products/*.webp 제자리 갱신
      (optimize-images.sh로 이미지를 다시 생성했다면 이 스크립트도 다시 실행할 것)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "frontend" / "public" / "menu" / "products"
MARGIN = 0.04  # 트리밍 후 남길 균일 여백 비율


def trim(path: Path) -> str | None:
    img = Image.open(path)
    if "A" not in img.getbands():
        return None  # 불투명 배경 — 여백 판단 불가, 건드리지 않음
    img = img.convert("RGBA")
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return None
    left, top, right, bottom = bbox
    mx = round((right - left) * MARGIN)
    my = round((bottom - top) * MARGIN)
    left = max(0, left - mx)
    top = max(0, top - my)
    right = min(img.width, right + mx)
    bottom = min(img.height, bottom + my)
    if (right - left) >= img.width * 0.95 and (bottom - top) >= img.height * 0.95:
        return None  # 이미 여백이 작다
    img.crop((left, top, right, bottom)).save(path, "WEBP", quality=82, method=6)
    return f"{img.width}x{img.height} → {right - left}x{bottom - top}"


def main() -> None:
    changed = 0
    for path in sorted(PRODUCTS.glob("*.webp")):
        result = trim(path)
        if result:
            changed += 1
            print(f"트리밍: {path.name}  {result}")
    print(f"완료 — {changed}개 이미지 트리밍됨 (frontend 재빌드 필요)")


if __name__ == "__main__":
    main()
