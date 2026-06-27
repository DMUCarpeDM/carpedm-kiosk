import type { CartItem, InterpretResult, MenuItem } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${API_BASE}/api/menu`);
  if (!res.ok) throw new Error(`menu ${res.status}`);
  const data = (await res.json()) as { items: MenuItem[] };
  return data.items;
}

export async function interpretUtterance(
  utterance: string,
  cart: CartItem[],
  sessionId?: string | null,
): Promise<InterpretResult> {
  const res = await fetch(`${API_BASE}/api/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      utterance,
      cart,
      session_id: sessionId ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`interpret ${res.status}`);
  return res.json() as Promise<InterpretResult>;
}

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
}

export function menuById(items: MenuItem[], id: string): MenuItem | undefined {
  return items.find((m) => m.id === id);
}
