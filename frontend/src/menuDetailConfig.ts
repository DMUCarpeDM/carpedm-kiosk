import type { MenuItem } from "./types";

/** 이 버거의 세트 메뉴를 찾는다 (없으면 null). */
export function findSetVariant(menu: MenuItem[], item: MenuItem): MenuItem | null {
  return menu.find((m) => m.set_of === item.id) ?? null;
}

/** 이 세트의 단품 버거를 찾는다 (없으면 null). */
export function findSingleVariant(menu: MenuItem[], item: MenuItem): MenuItem | null {
  if (!item.set_of) return null;
  return menu.find((m) => m.id === item.set_of) ?? null;
}
