import type { CartItem, InterpretResult, VoiceResultView } from "./types";

/** 이번 발화로 새로 담기거나 수량이 바뀐 항목 — 결과 화면에서 강조 표시용 */
export function changedItemIds(prev: CartItem[], next: CartItem[]): string[] {
  const before = new Map(prev.map((c) => [c.id, c.qty]));
  return next.filter((c) => before.get(c.id) !== c.qty).map((c) => c.id);
}

export function viewFromInterpret(
  result: InterpretResult,
  say?: string,
  prevCart: CartItem[] = [],
): VoiceResultView | "confirm" {
  if (result.action === "confirm") return "confirm";
  if (result.action === "clarify") {
    return { kind: "clarify", text: result.question || result.reply || "다시 한 번 말씀해 주세요." };
  }
  if (result.action === "reject") {
    return { kind: "reject", text: result.reply || "죄송합니다. 다시 말씀해 주시거나 메뉴판에서 선택해 주세요." };
  }
  if (result.action === "recommend" && result.suggestions.length > 0) {
    return { kind: "recommend", menuIds: result.suggestions.slice(0, 3), say: say ?? result.reply };
  }
  if (result.action === "update" && result.cart.length > 0) {
    // "불고기버거랑 콜라 주세요"처럼 여러 개를 말해도 전부 보이도록 전체 장바구니를 넘긴다
    return { kind: "cart", changedIds: changedItemIds(prevCart, result.cart), say: say ?? result.reply };
  }
  return { kind: "clarify", text: result.reply || "다시 한 번 말씀해 주세요." };
}

// ponytail: API 미연동 시에만 사용. 실제 키오스크는 /api/interpret confirm 액션 우선.
const CONFIRM_HINTS = ["맞아", "이걸로", "구매", "주문", "확인", "네", "응", "좋아", "줘"];

export function isLocalConfirmFallback(utterance: string): boolean {
  const t = utterance.replace(/\s/g, "");
  return CONFIRM_HINTS.some((h) => t.includes(h));
}

// ponytail: self-check — interpret 결과 라우팅 최소 검증
if (import.meta.env.DEV) {
  const sample: InterpretResult = {
    action: "recommend",
    cart: [],
    reply: "",
    suggestions: ["hot-latte"],
    provider: "rule",
  };
  const v = viewFromInterpret(sample);
  console.assert(v !== "confirm" && v.kind === "recommend" && v.menuIds[0] === "hot-latte");

  const multi: InterpretResult = {
    action: "update",
    cart: [
      { id: "bulgogi-burger", qty: 1 },
      { id: "cola", qty: 2 },
    ],
    reply: "",
    suggestions: [],
    provider: "rule",
  };
  const m = viewFromInterpret(multi, undefined, [{ id: "bulgogi-burger", qty: 1 }]);
  console.assert(
    m !== "confirm" && m.kind === "cart" && m.changedIds.length === 1 && m.changedIds[0] === "cola",
  );
}
