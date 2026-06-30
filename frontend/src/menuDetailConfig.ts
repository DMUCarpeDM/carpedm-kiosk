import type { MenuItem } from "./types";

export type DetailKind = "burger" | "chicken" | "drink" | "dessert";
export type DrinkSubtype = "coffee" | "carbonated" | "other";

const CARBONATED_IDS = new Set(["cola", "cider"]);
const COFFEE_IDS = new Set([
  "hot-americano",
  "ice-americano",
  "hot-latte",
  "ice-latte",
  "dolce-caramel-macchiato",
  "black-sesame-latte",
  "sweet-potato-latte",
  "grain-latte",
]);

export function classifyMenuItem(item: MenuItem): { kind: DetailKind; drinkSubtype?: DrinkSubtype } {
  if (item.category === "햄버거") return { kind: "burger" };
  if (item.category === "치킨") return { kind: "chicken" };
  if (item.category === "먹을 것") return { kind: "dessert" };
  if (CARBONATED_IDS.has(item.id)) return { kind: "drink", drinkSubtype: "carbonated" };
  if (COFFEE_IDS.has(item.id)) return { kind: "drink", drinkSubtype: "coffee" };
  return { kind: "drink", drinkSubtype: "other" };
}

export const BURGER_ORDER_TYPES = [
  { key: "single", label: "단품", extra: 0 },
  { key: "set", label: "세트 (+2,500원)", extra: 2500 },
] as const;

export const SET_DRINKS = [
  { key: "cola", label: "콜라", extra: 0 },
  { key: "cider", label: "사이다", extra: 0 },
  { key: "americano", label: "아메리카노 (+500원)", extra: 500 },
] as const;

export const BURGER_SIDES = [
  { key: "fries", label: "감자튀김", extra: 1500 },
  { key: "nugget", label: "치킨너겟", extra: 2000 },
  { key: "onion", label: "양파링", extra: 1500 },
] as const;

export const BURGER_EXTRAS = [
  { key: "patty", label: "패티 추가", extra: 2000 },
  { key: "cheese", label: "치즈 추가", extra: 500 },
  { key: "noPickle", label: "피클 빼기", extra: 0 },
] as const;

export const CHICKEN_ORDER_TYPES = [
  { key: "single", label: "단품", extra: 0 },
  { key: "set", label: "세트 (+2,000원)", extra: 2000 },
] as const;

export const CHICKEN_SAUCES = [
  { key: "original", label: "기본", extra: 0 },
  { key: "seasoned", label: "양념", extra: 0 },
  { key: "spicy", label: "매콤", extra: 0 },
] as const;

export const CHICKEN_SIDES = [
  { key: "fries", label: "감자튀김", extra: 1500 },
  { key: "coleslaw", label: "코울슬로", extra: 1000 },
  { key: "nugget", label: "치킨너겟", extra: 2000 },
] as const;

export const DRINK_SIZES = [
  { key: "R", label: "레귤러", extra: 0 },
  { key: "L", label: "라지 (+500원)", extra: 500 },
] as const;

export const ICE_LEVELS = [
  { key: "normal", label: "보통", extra: 0 },
  { key: "less", label: "얼음 적게", extra: 0 },
  { key: "none", label: "얼음 없음", extra: 0 },
] as const;

export const COFFEE_EXTRAS = [
  { key: "shot", label: "샷 추가", extra: 500 },
  { key: "syrup", label: "시럽 추가", extra: 500 },
  { key: "whip", label: "휘핑 추가", extra: 500 },
] as const;

export const DESSERT_EXTRAS = [
  { key: "syrup", label: "시럽 추가", extra: 300 },
  { key: "icecream", label: "아이스크림 토핑", extra: 800 },
] as const;

export type BurgerDetailState = {
  orderType: (typeof BURGER_ORDER_TYPES)[number]["key"];
  setDrink: (typeof SET_DRINKS)[number]["key"];
  sides: Set<string>;
  extras: Set<string>;
};

export type ChickenDetailState = {
  orderType: (typeof CHICKEN_ORDER_TYPES)[number]["key"];
  sauce: (typeof CHICKEN_SAUCES)[number]["key"];
  sides: Set<string>;
};

export type DrinkDetailState = {
  size: (typeof DRINK_SIZES)[number]["key"];
  ice: (typeof ICE_LEVELS)[number]["key"];
  extras: Set<string>;
};

export type DessertDetailState = {
  extras: Set<string>;
};

export function defaultBurgerState(): BurgerDetailState {
  return { orderType: "single", setDrink: "cola", sides: new Set(), extras: new Set() };
}

export function defaultChickenState(): ChickenDetailState {
  return { orderType: "single", sauce: "original", sides: new Set() };
}

export function defaultDrinkState(item: MenuItem): DrinkDetailState {
  const iceDefault = item.temp === "hot" ? "none" : "normal";
  return { size: "R", ice: iceDefault, extras: new Set() };
}

export function defaultDessertState(): DessertDetailState {
  return { extras: new Set() };
}

function sumFromKeys<T extends { key: string; extra: number }>(
  options: readonly T[],
  keys: Set<string>,
): number {
  let sum = 0;
  for (const opt of options) {
    if (keys.has(opt.key)) sum += opt.extra;
  }
  return sum;
}

export function calcUnitPrice(
  item: MenuItem,
  kind: DetailKind,
  drinkSubtype: DrinkSubtype | undefined,
  burger: BurgerDetailState,
  chicken: ChickenDetailState,
  drink: DrinkDetailState,
  dessert: DessertDetailState,
): number {
  let price = item.price;

  if (kind === "burger") {
    price += BURGER_ORDER_TYPES.find((o) => o.key === burger.orderType)?.extra ?? 0;
    if (burger.orderType === "set") {
      price += SET_DRINKS.find((d) => d.key === burger.setDrink)?.extra ?? 0;
    }
    price += sumFromKeys(BURGER_SIDES, burger.sides);
    price += sumFromKeys(BURGER_EXTRAS, burger.extras);
    return price;
  }

  if (kind === "chicken") {
    price += CHICKEN_ORDER_TYPES.find((o) => o.key === chicken.orderType)?.extra ?? 0;
    price += sumFromKeys(CHICKEN_SIDES, chicken.sides);
    return price;
  }

  if (kind === "drink") {
    price += DRINK_SIZES.find((s) => s.key === drink.size)?.extra ?? 0;
    if (drinkSubtype === "coffee" || drinkSubtype === "carbonated" || item.temp === "ice") {
      price += sumFromKeys(COFFEE_EXTRAS, drink.extras);
    }
    return price;
  }

  price += sumFromKeys(DESSERT_EXTRAS, dessert.extras);
  return price;
}

export function toggleSet(prev: Set<string>, key: string): Set<string> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

// ponytail: self-check — 세트 업차지 합산
if (import.meta.env.DEV) {
  const burgerItem: MenuItem = {
    id: "test-burger",
    easy_name: "테스트",
    original_name: "",
    category: "햄버거",
    price: 4000,
    temp: "none",
  };
  const setPrice = calcUnitPrice(
    burgerItem,
    "burger",
    undefined,
    { orderType: "set", setDrink: "americano", sides: new Set(), extras: new Set() },
    defaultChickenState(),
    defaultDrinkState(burgerItem),
    defaultDessertState(),
  );
  console.assert(setPrice === 7000, "burger set + americano upgrade");
}
