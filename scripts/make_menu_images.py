"""메뉴 이미지 정비 도구.

- 세트 메뉴: 해당 버거 이미지를 복사해 사용
- 이미지가 없는 신규 품목: 카테고리 색 + 메뉴명 플레이스홀더 PNG 생성
  (실제 제품 사진으로 교체 전까지의 임시 이미지)

사용: python scripts/make_menu_images.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "frontend" / "public" / "menu" / "products"
MENU = json.loads((ROOT / "data" / "menu.json").read_text(encoding="utf-8"))["items"]

SIZE = 480
CATEGORY_BG = {
    "햄버거": "#FFE8CC",
    "세트": "#FFE0B2",
    "치킨": "#FFF3BF",
    "사이드": "#E9FAC8",
    "디저트": "#FFDEEB",
    "마실 것": "#D0EBFF",
}
CATEGORY_ICON = {
    "햄버거": "🍔",
    "세트": "🍔",
    "치킨": "🍗",
    "사이드": "🍟",
    "디저트": "🍦",
    "마실 것": "🥤",
}

KOREAN_FONTS = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",  # macOS
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",  # 라즈베리파이(리눅스)
]
EMOJI_FONTS = ["/System/Library/Fonts/Apple Color Emoji.ttc"]


def load_font(paths: list[str], size: int) -> ImageFont.FreeTypeFont | None:
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return None


def wrap_name(name: str, limit: int = 7) -> list[str]:
    words = name.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > limit:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines[:3]


def make_placeholder(item: dict, out: Path) -> None:
    bg = CATEGORY_BG.get(item["category"], "#F1F3F5")
    img = Image.new("RGB", (SIZE, SIZE), bg)
    d = ImageDraw.Draw(img)

    emoji_font = load_font(EMOJI_FONTS, 160)
    icon = CATEGORY_ICON.get(item["category"], "🍽")
    if emoji_font:
        try:
            d.text((SIZE // 2, 150), icon, font=emoji_font, anchor="mm", embedded_color=True)
        except (OSError, ValueError):
            pass

    name_font = load_font(KOREAN_FONTS, 52)
    if name_font:
        lines = wrap_name(item["easy_name"])
        y = 300
        for line in lines:
            d.text((SIZE // 2, y), line, font=name_font, anchor="mm", fill="#343A40")
            y += 62

    img.save(out)


def main() -> None:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    by_id = {m["id"]: m for m in MENU}
    copied, created, kept = 0, 0, 0

    # 딸기 쉐이크: 기존 딸기 주스 사진 재활용
    legacy = IMG_DIR / "strawberry-juice.png"
    target = IMG_DIR / "strawberry-shake.png"
    if legacy.exists() and not target.exists():
        shutil.copy(legacy, target)
        copied += 1

    for m in MENU:
        out = IMG_DIR / f"{m['id']}.png"
        if out.exists():
            kept += 1
            continue
        # 세트: 버거 이미지 복사 (버거 이미지가 먼저 준비되어야 함 → 2패스)
        src_id = m.get("set_of")
        if src_id and (IMG_DIR / f"{src_id}.png").exists():
            shutil.copy(IMG_DIR / f"{src_id}.png", out)
            copied += 1
            continue
        make_placeholder(m, out)
        created += 1

    # 2패스: 버거 플레이스홀더가 방금 생성된 세트 처리
    for m in MENU:
        out = IMG_DIR / f"{m['id']}.png"
        src_id = m.get("set_of")
        if src_id and not out.exists() and (IMG_DIR / f"{src_id}.png").exists():
            shutil.copy(IMG_DIR / f"{src_id}.png", out)
            copied += 1

    # 메뉴에 없는 옛 이미지 정리는 하지 않는다 (팀원 자료 보존)
    missing = [m["id"] for m in by_id.values() if not (IMG_DIR / f"{m['id']}.png").exists()]
    print(f"유지 {kept} / 복사 {copied} / 생성 {created} / 누락 {len(missing)}")
    if missing:
        print("누락:", ", ".join(missing))
        sys.exit(1)


if __name__ == "__main__":
    main()
