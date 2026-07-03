import type { MenuItem } from "./types";

export type DetailKind = "burger" | "set" | "chicken" | "side" | "dessert" | "drink";

export function classifyMenuItem(item: MenuItem): { kind: DetailKind } {
  switch (item.category) {
    case "햄버거":
      return { kind: "burger" };
    case "세트":
      return { kind: "set" };
    case "치킨":
      return { kind: "chicken" };
    case "사이드":
      return { kind: "side" };
    case "디저트":
      return { kind: "dessert" };
    default:
      return { kind: "drink" };
  }
}

export function kindLabel(kind: DetailKind): string {
  switch (kind) {
    case "burger":
      return "햄버거";
    case "set":
      return "세트";
    case "chicken":
      return "치킨";
    case "side":
      return "사이드";
    case "dessert":
      return "디저트";
    default:
      return "음료";
  }
}

/** 이 버거의 세트 메뉴를 찾는다 (없으면 null). */
export function findSetVariant(menu: MenuItem[], item: MenuItem): MenuItem | null {
  return menu.find((m) => m.set_of === item.id) ?? null;
}

/** 이 세트의 단품 버거를 찾는다 (없으면 null). */
export function findSingleVariant(menu: MenuItem[], item: MenuItem): MenuItem | null {
  if (!item.set_of) return null;
  return menu.find((m) => m.id === item.set_of) ?? null;
}
