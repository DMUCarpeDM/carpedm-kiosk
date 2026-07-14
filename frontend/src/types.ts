export type Screen =
  | "main"
  | "order-mode"
  | "voice-order"
  | "voice-result"
  | "menu-list"
  | "menu-detail"
  | "order-complete";

/** 식사 장소 (실기기 첫 질문) */
export type DiningOption = "store" | "togo";

export type VoiceState =
  | "idle"
  | "speaking"
  | "listening"
  | "processing"
  | "result"
  | "error";

export type MenuItem = {
  id: string;
  easy_name: string;
  original_name: string;
  category: string;
  price: number;
  temp: "hot" | "ice" | "none" | string;
  tags?: string[];
  popular?: boolean;
  allergens?: string[];
  set_of?: string;
  set_includes?: string[];
  desc?: string;
  kcal?: number;
  origin?: string[];
};

export type CartItem = {
  id: string;
  qty: number;
};

export type InterpretAction =
  | "update"
  | "confirm"
  | "clarify"
  | "reject"
  | "recommend";

export type InterpretResult = {
  action: InterpretAction;
  cart: CartItem[];
  reply: string;
  question?: string | null;
  suggestions: string[];
  provider: string;
  session_id?: string;
  fallback?: boolean;
  latency_ms?: number;
};

/** POST /order 응답 — STT→해석→TTS 한 사이클 */
export type OrderResponse =
  | {
      ok: true;
      action: InterpretAction;
      cart: CartItem[];
      reply: string;
      question?: string | null;
      suggestions: string[];
      provider: string;
      utterance: string;
      say: string;
      audio_b64: string | null;
      audio_mime: string;
      session_id: string;
      fallback: boolean;
      latency: { stt_ms: number; interpret_ms: number; tts_ms: number; total_ms: number };
    }
  | { ok: false; stage: "stt"; session_id: string; message: string };

export type VoiceResultView =
  /** update 결과 — 전체 장바구니를 보여주고, 이번 발화로 바뀐 항목을 강조한다 */
  | { kind: "cart"; changedIds: string[]; say?: string }
  | { kind: "recommend"; menuIds: string[]; say?: string }
  | { kind: "clarify"; text: string }
  | { kind: "reject"; text: string };
