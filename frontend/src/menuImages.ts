import type { SyntheticEvent } from "react";
import type { MenuItem } from "./types";

export function menuImageSrc(item: Pick<MenuItem, "id">): string {
  // WebP로 최적화(원본 PNG는 rsc/product-originals 백업). 태블릿·네트워크에서도 즉시 로드.
  return `/menu/products/${item.id}.webp`;
}

export const MORE_IMAGE = "/menu/more.svg";

// 사진 파일이 없거나 로드에 실패해도 깨진 아이콘 대신 접시 그림을 보여 준다
// (배포 기기에서 빌드·자산이 어긋나도 메뉴판이 무너지지 않게 하는 안전망)
const FALLBACK_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>" +
      "<circle cx='48' cy='48' r='36' fill='#f3f3f3' stroke='#d8d8d8' stroke-width='3'/>" +
      "<circle cx='48' cy='48' r='21' fill='#fff' stroke='#d8d8d8' stroke-width='3'/>" +
      "</svg>",
  );

export function menuImageFallback(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
}
