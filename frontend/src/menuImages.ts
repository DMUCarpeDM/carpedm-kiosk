import type { MenuItem } from "./types";

export function menuImageSrc(item: Pick<MenuItem, "id">): string {
  // WebP로 최적화(원본 PNG는 rsc/product-originals 백업). 태블릿·네트워크에서도 즉시 로드.
  return `/menu/products/${item.id}.webp`;
}

export const MORE_IMAGE = "/menu/more.svg";
