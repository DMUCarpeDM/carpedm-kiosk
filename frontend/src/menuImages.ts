import type { MenuItem } from "./types";

const BY_ID: Record<string, string> = {
  "hot-americano": "/menu/iced-americano.svg",
  "ice-americano": "/menu/iced-americano.svg",
  "hot-latte": "/menu/cafe-latte.svg",
  "ice-latte": "/menu/cafe-latte.svg",
  "dolce-caramel-macchiato": "/menu/vanilla-latte.svg",
  "black-sesame-latte": "/menu/cafe-latte.svg",
  "sweet-potato-latte": "/menu/vanilla-latte.svg",
  "grain-latte": "/menu/cafe-latte.svg",
  cheesecake: "/menu/cake.svg",
  "choco-cake": "/menu/cake.svg",
  castella: "/menu/cake.svg",
};

export function menuImageSrc(item: Pick<MenuItem, "id" | "category">): string {
  if (BY_ID[item.id]) return BY_ID[item.id];
  if (item.category === "먹을 것") return "/menu/cake.svg";
  return "/menu/cappuccino.svg";
}

export const MORE_IMAGE = "/menu/more.svg";
