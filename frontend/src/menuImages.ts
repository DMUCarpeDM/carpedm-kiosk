import type { MenuItem } from "./types";

export function menuImageSrc(item: Pick<MenuItem, "id">): string {
  return `/menu/products/${item.id}.png`;
}

export const MORE_IMAGE = "/menu/more.svg";
