export type Screen =
  | "main"
  | "voice-order"
  | "voice-result"
  | "menu-list"
  | "menu-detail"
  | "order-complete";

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

export type VoiceResultView =
  | { kind: "menu"; menuId: string; qty: number }
  | { kind: "clarify"; text: string }
  | { kind: "reject"; text: string };
