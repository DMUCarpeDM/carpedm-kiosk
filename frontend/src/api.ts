import type { CartItem, InterpretResult, MenuItem, OrderResponse } from "./types";

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

/** 음성 주문 한 사이클: 녹음 WAV → /order (STT→해석→TTS) */
export async function orderVoice(
  audio: Blob,
  cart: CartItem[],
  sessionId?: string | null,
): Promise<OrderResponse> {
  const form = new FormData();
  form.append("file", audio, "record.wav");
  form.append("cart", JSON.stringify(cart));
  if (sessionId) form.append("session_id", sessionId);
  const res = await fetch(`${API_BASE}/order`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`order ${res.status}`);
  return res.json() as Promise<OrderResponse>;
}

/** 고정 안내문(인사말 등) 음성 합성 — 서버 캐시됨. 실패 시 null(브라우저 TTS 폴백). */
export async function fetchTtsAudio(text: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { audio_b64: string | null; mime?: string };
    if (!data.audio_b64) return null;
    return { b64: data.audio_b64, mime: data.mime ?? "audio/mpeg" };
  } catch {
    return null;
  }
}

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
}

export function formatMenuPrice(price: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(price)} ~`;
}

export function menuDisplayName(item: Pick<MenuItem, "easy_name" | "original_name">): string {
  return item.original_name || item.easy_name;
}

export function menuSubName(item: Pick<MenuItem, "easy_name" | "original_name">): string | null {
  if (!item.original_name || item.original_name === item.easy_name) return null;
  return item.easy_name;
}

export function menuById(items: MenuItem[], id: string): MenuItem | undefined {
  return items.find((m) => m.id === id);
}
