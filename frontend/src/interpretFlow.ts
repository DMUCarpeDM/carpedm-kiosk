import type { InterpretResult, VoiceResultView } from "./types";

export function menuIdFromResult(result: InterpretResult): string | null {
  if (result.action === "recommend" && result.suggestions.length > 0) {
    return result.suggestions[0];
  }
  if (result.action === "update" && result.cart.length > 0) {
    return result.cart[result.cart.length - 1].id;
  }
  return null;
}

export function qtyFromResult(result: InterpretResult, menuId: string): number {
  const item = result.cart.find((c) => c.id === menuId);
  return item?.qty ?? 1;
}

export function viewFromInterpret(result: InterpretResult, say?: string): VoiceResultView | "confirm" {
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
  const menuId = menuIdFromResult(result);
  if (menuId) return { kind: "menu", menuId, qty: qtyFromResult(result, menuId), say: say ?? result.reply };
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
}
