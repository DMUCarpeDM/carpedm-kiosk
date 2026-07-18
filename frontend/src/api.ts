import type { CartItem, InterpretResult, MenuItem, OrderResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/** 실증 장소·팀원 태그 — ?site=경로당A 처럼 붙이면 모든 로그에 기록된다.
    홈 화면 추가(PWA)로 열어 쿼리가 사라져도 localStorage로 유지. */
function siteTag(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("site");
    if (q) {
      localStorage.setItem("kiosk_site", q);
      return q;
    }
    return localStorage.getItem("kiosk_site") ?? "";
  } catch {
    return "";
  }
}
const SITE = siteTag();

/** 타임아웃이 있는 fetch — 현장 Wi-Fi가 요청 도중 끊겨도 무한 대기하지 않는다.
    기본 fetch는 타임아웃이 없어, 네트워크가 끊기면 "주문을 확인하고 있어요" 화면이
    영원히 멈춘다. AbortController로 상한을 두면 호출부가 즉시 폴백(터치 주문)한다. */
async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/menu`, {}, 10000);
  if (!res.ok) throw new Error(`menu ${res.status}`);
  const data = (await res.json()) as { items: MenuItem[] };
  return data.items;
}

export async function interpretUtterance(
  utterance: string,
  cart: CartItem[],
  sessionId?: string | null,
): Promise<InterpretResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      utterance,
      cart,
      session_id: sessionId ?? undefined,
      site: SITE || undefined,
    }),
  }, 20000);
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
  if (SITE) form.append("site", SITE);
  // STT+해석+TTS 한 사이클 — 소음 재시도까지 고려해 조금 넉넉히(25초). 넘으면 폴백.
  const res = await fetchWithTimeout(`${API_BASE}/order`, { method: "POST", body: form }, 25000);
  if (!res.ok) throw new Error(`order ${res.status}`);
  return res.json() as Promise<OrderResponse>;
}

/** 고정 안내문(인사말 등) 음성 합성 — 서버 캐시됨. 실패 시 null(브라우저 TTS 폴백). */
export async function fetchTtsAudio(text: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }, 12000);
    if (!res.ok) return null;
    const data = (await res.json()) as { audio_b64: string | null; mime?: string };
    if (!data.audio_b64) return null;
    return { b64: data.audio_b64, mime: data.mime ?? "audio/mpeg" };
  } catch {
    return null;
  }
}

/** PIR 인체 감지 상태 (센서 미장착이면 enabled=false) */
export async function fetchPresence(): Promise<{ enabled: boolean; present: boolean } | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/presence`, {}, 3000);
    if (!res.ok) return null;
    return (await res.json()) as { enabled: boolean; present: boolean };
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
