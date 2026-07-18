"""주문 해석 엔진 — CarpeDM 고령층 AI 음성 키오스크.

설계 원칙 (요구사항정의서 SRS v1):
- P-5 환각 차단: LLM은 메뉴 id만 산출. 이름·가격은 menu.json에서 시스템이 조회.
- FR-N2 멀티턴: 현재 장바구니를 프롬프트에 포함, LLM은 '최종 전체 장바구니'를 반환.
- FR-N3 임의 확정 금지: 모호하면 반드시 clarify.
- FR-V2 폴백: 네트워크/LLM 불가 시 RuleProvider(표현 사전 기반 최소 주문)로 전환.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field, field_validator

# ── 경로 ─────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("KIOSK_DATA_DIR", ROOT / "data"))

ACTIONS = {"update", "confirm", "clarify", "reject", "recommend"}


# ── 스키마 ───────────────────────────────────────────
class CartItem(BaseModel):
    id: str
    qty: int = Field(ge=1, le=99)


class InterpretResult(BaseModel):
    action: str
    cart: list[CartItem] = []
    reply: str = ""
    question: str | None = None
    suggestions: list[str] = []  # recommend 시 추천 메뉴 id (최대 3)
    provider: str = ""

    @field_validator("action")
    @classmethod
    def _check_action(cls, v: str) -> str:
        if v not in ACTIONS:
            raise ValueError(f"unknown action: {v}")
        return v


class ValidationErr(Exception):
    """LLM 출력이 메뉴/수량 규칙을 위반 (P-5)."""


# ── 데이터 로더 ──────────────────────────────────────
def load_menu(path: Path | None = None) -> dict[str, dict]:
    p = path or (DATA_DIR / "menu.json")
    items = json.loads(p.read_text(encoding="utf-8"))["items"]
    return {it["id"]: it for it in items}


def load_expressions(path: Path | None = None) -> dict:
    p = path or (DATA_DIR / "expressions.yaml")
    return yaml.safe_load(p.read_text(encoding="utf-8"))


# ── 검증 (P-5 환각 차단) ─────────────────────────────
def validate_cart(cart: list[dict] | list[CartItem], menu: dict[str, dict]) -> list[CartItem]:
    merged: dict[str, int] = {}
    for c in cart:
        d = c.model_dump() if isinstance(c, CartItem) else dict(c)
        cid = d.get("id")
        try:
            qty = int(d.get("qty", 0))
        except (TypeError, ValueError) as e:
            raise ValidationErr(f"qty not int: {d.get('qty')!r}") from e
        if cid not in menu:
            raise ValidationErr(f"unknown menu id: {cid!r}")
        if not (1 <= qty <= 99):
            raise ValidationErr(f"qty out of range: {qty}")
        merged[cid] = merged.get(cid, 0) + qty
    if len(merged) > 20:
        raise ValidationErr("too many cart lines")
    return [CartItem(id=k, qty=v) for k, v in merged.items()]


def validate_suggestions(ids: list[str], menu: dict[str, dict]) -> list[str]:
    """추천 id도 환각 차단 — 메뉴에 있는 것만, 최대 3개, 중복 제거 (P-5)."""
    out: list[str] = []
    for i in ids:
        if i in menu and i not in out:
            out.append(i)
        if len(out) == 3:
            break
    return out


# ── 프롬프트 ─────────────────────────────────────────
SYSTEM_TMPL = """너는 고령 어르신을 돕는 롯데리아(햄버거 가게) 키오스크의 주문 해석기다.
어르신이 메뉴 이름을 정확히 몰라도, 아래 메뉴와 표현 사전을 참고해 의도를 해석한다.

[메뉴] (id | 쉬운 이름 | 원래 이름 | 분류 | 특징)
{menu_lines}

[어르신 표현 사전 (참고)]
{expr_lines}

[현재 장바구니]는 이어지는 사용자 메시지에 함께 제공된다.

출력 규칙 — 반드시 지킨다:
1) JSON 객체 하나만 출력한다. 마크다운, 백틱, 설명 금지.
2) 형식: {{"action":"update|confirm|clarify|reject|recommend","cart":[{{"id":"...","qty":1}}],"reply":"...","question":null,"suggestions":[]}}
3) action=update: 사용자의 요청(추가/수량 변경/항목 제거/전체 취소)을 현재 장바구니에 적용한 '최종 전체 장바구니'를 cart에 담는다. 전체 취소면 cart는 [].
4) action=confirm: 사용자가 주문을 확정하는 말("네 맞아요", "그걸로 줘"). cart는 현재 장바구니 그대로.
5) action=clarify: 후보가 여럿이거나 알아듣기 어려울 때. cart는 현재 그대로, question에 보기 2~4개를 든 짧은 질문 한 문장.
6) action=reject: 메뉴에 없는 것을 찾을 때. reply에 없다는 안내와 가까운 대안 1개를 공손히 제안. cart는 현재 그대로.
7) action=recommend: 사용자가 추천을 청하거나("뭐가 맛있어?", "따뜻한 거 추천해줘", "아무거나 좋은 거") 무엇을 고를지 망설일 때. suggestions에 추천 메뉴 id를 1~3개 담고(반드시 아래 [메뉴]의 id), reply에 왜 추천하는지 쉬운 말로 1~2문장. cart는 현재 그대로. 사용자가 조건을 말하면(따뜻한/시원한/달달한/부드러운 등) 거기 맞춰 고른다.
8) cart와 suggestions의 id는 위 [메뉴]의 id만 쓴다. 메뉴 이름·가격을 창작하지 않는다.
9) 추가/수량 변경/항목 제거/전체 취소/확인/추천 외의 요청(환불, 배달, 잡담 등)은 clarify로 공손히 되묻는다.
10) reply와 question은 쉬운 우리말의 정중한 존댓말(-습니다체) 1~2문장. 외래어·감탄사·과장 표현은 쓰지 않는다. 재촉하지 않는다.
11) 온도(뜨거운/시원한)가 필요한 메뉴인데 온도를 말하지 않았으면 clarify로 묻는다. 단 추천(recommend) 상황에서는 적절히 골라 제안해도 된다.
12) '세트'는 버거에 감자 튀김과 콜라가 함께 나오는 메뉴다. "~세트", "세트로 줘"라고 하면 분류가 '세트'인 id를 담는다. 장바구니의 버거를 "세트로 바꿔줘"라고 하면 그 버거를 빼고 같은 버거의 세트 id로 바꾼 최종 장바구니를 반환한다.
13) 메뉴 이름(쉬운 이름·원래 이름)과 정확히 일치하게 말하면 되묻지 말고 바로 그 메뉴로 update한다. 위 [표현 사전]에 있는 표현은 그 매핑을 그대로 따른다 — 후보가 1개면 비슷한 다른 메뉴가 있어도 되묻지 않고 확정한다. 후보가 2개 이상일 때만 clarify.
14) 온도 표현(뜨거운/따뜻한/따끈한/핫 ↔ 아이스/시원한/차가운/찬)이 발화에 있으면, hot/ice 쌍 후보를 그 온도에 맞는 하나로 좁혀 바로 확정한다. 예: "아이스 아메리카노"=ice-americano, "따뜻한 커피"=hot-americano, "시원한 부드러운 커피"=ice-latte.
15) 단품/세트 구분: 발화에 '세트'가 없으면 단품 id로 확정한다. 세트로 드실지 되묻지 않는다 (화면에서 따로 권한다).
16) "하나 더", "한 개 더"처럼 대상 없이 더 달라고 하면 장바구니에서 가장 마지막에 담긴 메뉴의 수량을 1 늘린다. 되묻지 않는다.
17) 빼기: "하나/한 개 빼줘"처럼 수량을 말하면 정확히 그만큼만 줄인다 (2개에서 하나 빼면 1개가 남는다). 수량 없이 "~는 빼줘"라고 하면 그 메뉴를 전부 뺀다.
18) "~도 줘", "~도 하나"는 기존 장바구니를 유지한 채 그 메뉴를 추가한다."""


def build_system_prompt(menu: dict[str, dict], expressions: dict) -> str:
    """메뉴·표현사전·규칙만으로 구성 — 발화·장바구니에 무관하게 항상 동일하다.
    이 고정 프리픽스를 프롬프트 캐시에 올려(cache_control) 매 호출의 재처리 비용·지연을 없앤다.
    """
    menu_lines = "\n".join(
        f"- {m['id']} | {m['easy_name']} | {m.get('original_name') or '-'} | {m.get('category', '-')} | {','.join(m.get('tags', []))}"
        for m in menu.values()
    )
    expr_lines = "\n".join(
        f"- {' / '.join(mp['phrases'])} → {', '.join(mp['ids'])}"
        for mp in expressions.get("mappings", [])
    )
    return SYSTEM_TMPL.format(menu_lines=menu_lines, expr_lines=expr_lines)


def build_user_content(utterance: str, cart: list[CartItem]) -> str:
    """장바구니(매 턴 변함)와 발화를 사용자 메시지로 — 캐시 프리픽스(시스템)를 깨지 않는다."""
    cart_line = json.dumps([c.model_dump() for c in cart], ensure_ascii=False) if cart else "(비어 있음)"
    return f"[현재 장바구니]\n{cart_line}\n\n[주문 발화]\n{utterance}"


def parse_llm_json(text: str) -> dict:
    """LLM 출력에서 첫 번째 JSON 객체만 안전하게 꺼낸다 (뒤에 딸린 설명·중복 객체 무시)."""
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    start = cleaned.find("{")
    if start == -1:
        raise ValidationErr("no JSON object in LLM output")
    try:
        obj, _ = json.JSONDecoder().raw_decode(cleaned[start:])
    except json.JSONDecodeError as e:
        raise ValidationErr(f"bad JSON from LLM: {e}") from e
    if not isinstance(obj, dict):
        raise ValidationErr("LLM output is not a JSON object")
    return obj


# ── 공통 후처리 ──────────────────────────────────────
def finalize(raw: dict, cart_before: list[CartItem], menu: dict[str, dict], provider: str) -> InterpretResult:
    action = raw.get("action", "")
    if action not in ACTIONS:
        raise ValidationErr(f"bad action {action!r}")
    if action == "update":
        cart = validate_cart(raw.get("cart", []), menu)
    else:
        cart = list(cart_before)  # confirm/clarify/reject/recommend은 장바구니 불변 (P-2)
    suggestions = validate_suggestions(raw.get("suggestions", []), menu) if action == "recommend" else []
    return InterpretResult(
        action=action,
        cart=cart,
        reply=str(raw.get("reply") or ""),
        question=(str(raw["question"]) if raw.get("question") else None),
        suggestions=suggestions,
        provider=provider,
    )


# ── Claude 프로바이더 (클라우드, 기본) ───────────────
class ClaudeProvider:
    name = "claude"

    def __init__(self, model: str | None = None):
        import anthropic  # 지연 임포트: 폴백 단독 환경에서도 동작

        self.client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 (FR-B1)
        # 기본값은 .env의 권장값(비용·지연이 낮은 Haiku)과 일치시킨다 — KIOSK_MODEL이
        # 비어 있어도 존재하는 모델로 안전하게 뜨도록. 품질을 올리려면 .env에서 교체.
        self.model = model or os.getenv("KIOSK_MODEL", "claude-haiku-4-5-20251001")

    def interpret(
        self, utterance: str, cart: list[CartItem], menu: dict[str, dict], expressions: dict
    ) -> InterpretResult:
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=700,
            temperature=0,
            # 고정 프리픽스(메뉴·사전·규칙 ~7천 토큰)를 캐시 → 같은 손님의 멀티턴에서 재처리 없이 빠르게 응답
            system=[{"type": "text", "text": build_system_prompt(menu, expressions), "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": build_user_content(utterance, cart)}],
        )
        text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
        return finalize(parse_llm_json(text), cart, menu, self.name)

    def warm(self, menu: dict[str, dict], expressions: dict) -> None:
        """고정 프리픽스를 캐시에 미리 올린다(max_tokens=0). 첫 손님의 첫 발화도 캐시 적중으로 빠르게.
        캐시 TTL은 5분이라, 손님 간격이 길면 이 워밍은 부팅 직후 첫 손님에게만 유효하다(무해)."""
        self.client.messages.create(
            model=self.model,
            max_tokens=0,
            temperature=0,
            system=[{"type": "text", "text": build_system_prompt(menu, expressions), "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": "워밍"}],
        )


# ── 규칙 폴백 프로바이더 (오프라인 최소 주문, FR-V2) ─
NUM_WORDS = {
    "한": 1, "하나": 1, "두": 2, "둘": 2, "세": 3, "셋": 3,
    "네": 4, "넷": 4, "다섯": 5,
    "여섯": 6, "일곱": 7, "여덟": 8, "아홉": 9, "열": 10,
}
COUNTER_RE = re.compile(r"(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(개|잔|병|봉지|캔|조각|줄|대접|그릇|팩)")
STANDALONE_NUM_RE = re.compile(r"(?<![가-힣])(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)(?![가-힣])")
CONFIRM_RE = re.compile(
    r"(네|예|응|그래)(?!\s*(개|잔|병|봉지|캔|조각|줄|팩|마리))|맞아|맞습니다|맞아요|확인|그걸로|주문할게|주문해|계산해|됐어요|다 시켰"
)
NEG_RE = re.compile(r"(빼|취소|추가|더 |말고|바꿔|아니)")
REMOVE_RE = re.compile(r"(빼|없애|취소|말고)")
REPLACE_RE = re.compile(r"(바꿔|바꾸|교체|변경)")
CANCEL_ALL_RE = re.compile(r"(전부|전체|다)\s*(취소|빼)|^\s*취소(해줘|해 줘|요)?\s*$")


def particle_ro(word: str) -> str:
    """'로/으로' 조사 선택 — 받침이 있으면 '으로', 없거나 ㄹ 받침이면 '로'."""
    code = ord(word[-1]) if word else 0
    if 0xAC00 <= code <= 0xD7A3 and (code - 0xAC00) % 28 not in (0, 8):
        return "으로"
    return "로"
MORE_RE = re.compile(r"^.{0,6}(하나|한 개|한개)?\s*더\s*(줘|주세요|요)?.{0,3}$")
RECOMMEND_RE = re.compile(r"(추천|뭐가\s*(맛있|좋|괜찮)|뭐\s*(먹|마시|있)|아무거나|골라|좋은\s*거|인기\s*있는|많이\s*(먹|시키|찾)|잘\s*나가|게\s*뭐)")
FOOD_CONTEXT_RE = re.compile(r"(먹|마시|줘|주세요|있어|하나|한 개|한개|개|잔|병|줘요|주세요|주요|드릴까|할게|세트|세 개|두 개|한 잔|한 병|한 봉지|줘라|다오|주소|포장|갑)")
TASTE_WORDS = {
    "단": "달다", "달달": "달다", "달콤": "달다", "단거": "달다", "단 거": "달다",
    "고소": "고소하다", "부드러": "부드럽다", "말랑": "말랑하다",
    "담백": "담백하다", "바삭": "바삭하다", "새콤": "새콤하다", "시원": "톡쏘다",
    "진한": "진하다", "진하게": "진하다", "쓴": "쓰다",
    "매운": "맵다", "매콤": "맵다", "얼큰": "맵다", "화끈": "맵다", "칼칼": "맵다",
}


def _norm(s: str) -> str:
    return s.replace(" ", "")


class RuleProvider:
    """표현 사전 기반 결정적 매핑. 클라우드 불가 시 최소 주문 보장 + 테스트 하네스."""

    name = "rule"

    def _match(self, utter: str, menu: dict, expressions: dict) -> list[tuple[str, list[str]]]:
        """발화에서 (매칭된 구절, 후보 id들) 목록을 찾는다. 긴 구절 우선."""
        u = _norm(utter)
        found: list[tuple[str, list[str]]] = []
        entries: list[tuple[str, list[str]]] = []
        for mp in expressions.get("mappings", []):
            for ph in mp["phrases"]:
                entries.append((ph, list(mp["ids"])))
        for m in menu.values():  # 메뉴 이름 직접 언급
            entries.append((m["easy_name"], [m["id"]]))
            if m.get("original_name"):
                entries.append((m["original_name"], [m["id"]]))
        entries.sort(key=lambda e: len(_norm(e[0])), reverse=True)
        consumed: list[str] = []
        for ph, ids in entries:
            np = _norm(ph)
            if np and np in u and not any(np in c for c in consumed):
                found.append((ph, ids))
                consumed.append(np)
        return found

    @staticmethod
    def _check_temp_words(utter: str, words: list[str]) -> bool:
        """Check if any temperature word appears in the utterance (normalized)."""
        u_norm = _norm(utter)
        for w in words:
            w = w.strip()
            if not w:
                continue
            if w in utter or _norm(w) in u_norm:
                return True
        return False

    def _temp_filter(self, ids: list[str], utter: str, menu: dict, expressions: dict) -> list[str]:
        tw = expressions.get("temp_words", {})
        want = None
        if self._check_temp_words(utter, tw.get("hot", [])):
            want = "hot"
        elif self._check_temp_words(utter, tw.get("ice", [])):
            want = "ice"
        if want:
            kept = [i for i in ids if menu[i].get("temp") in (want, "none")]
            if kept:
                return kept
        return ids

    def _qty(self, utter: str) -> int:
        m = re.search(r"(\d+)\s*(개|잔|병|봉지|캔|조각|줄)?", utter)
        if m:
            return max(1, min(99, int(m.group(1))))
        m = COUNTER_RE.search(utter)
        if m:
            return NUM_WORDS[m.group(1)]
        m = STANDALONE_NUM_RE.search(utter)
        if m:
            return NUM_WORDS[m.group(1)]
        return 1

    @staticmethod
    def _qty_candidates(window: str) -> list[tuple[int, int]]:
        """창(window) 안의 (위치, 수량) 후보를 전부 수집한다."""
        out: list[tuple[int, int]] = []
        for m in re.finditer(r"(\d+)\s*(개|잔|병|봉지|캔|조각|줄|대접|그릇|팩|마리)?", window):
            out.append((m.start(), max(1, min(99, int(m.group(1))))))
        for m in COUNTER_RE.finditer(window):
            out.append((m.start(), NUM_WORDS[m.group(1)]))
        for m in STANDALONE_NUM_RE.finditer(window):
            out.append((m.start(), NUM_WORDS[m.group(1)]))
        # 조사가 붙은 수사: "하나랑", "하나하고", "하나만", "둘이요"
        for m in re.finditer(r"(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)(?=랑|이랑|하고|만|요|씩)", window):
            out.append((m.start(), NUM_WORDS[m.group(1)]))
        return out

    def _qty_near(self, utterance: str, phrase_end: int) -> int:
        """구절 위치에 가장 가까운 수량 표현을 고른다. 뒤쪽 창 우선, 없으면 앞쪽 창."""
        after_window = utterance[phrase_end : phrase_end + 12]
        cands = self._qty_candidates(after_window)
        if cands:
            return min(cands)[1]  # 구절에 가장 가까운(앞선) 후보

        start = max(0, phrase_end - 15)
        before_window = utterance[start:phrase_end]
        cands = self._qty_candidates(before_window)
        if cands:
            return max(cands)[1]  # 앞쪽 창에서는 구절에 가장 가까운(뒤쪽) 후보

        return 1

    def _recommend(self, utter: str, menu: dict, expressions: dict) -> list[str]:
        """조건(온도·맛·분류)에 맞는 메뉴를 고른다. 조건 없으면 인기 메뉴."""
        cands = list(menu.values())
        # 온도 조건
        if self._check_temp_words(utter, expressions.get("temp_words", {}).get("hot", [])):
            cands = [m for m in cands if m.get("temp") == "hot"]
        elif self._check_temp_words(utter, expressions.get("temp_words", {}).get("ice", [])):
            cands = [m for m in cands if m.get("temp") == "ice"]
        # 분류 조건 (롯데리아: 햄버거/세트/치킨/사이드/디저트/마실 것)
        if re.search(r"마실|마시|음료|목마", utter):
            cands = [m for m in cands if m.get("category") == "마실 것"]
        elif re.search(r"세트", utter):
            cands = [m for m in cands if m.get("category") == "세트"]
        elif re.search(r"버거|햄버거|빵", utter):
            cands = [m for m in cands if m.get("category") == "햄버거"]
        elif re.search(r"치킨|닭", utter):
            cands = [m for m in cands if m.get("category") == "치킨"]
        elif re.search(r"디저트|후식|아이스크림|주전부리", utter):
            cands = [m for m in cands if m.get("category") == "디저트"]
        elif re.search(r"곁들|사이드|간식|튀김", utter):
            cands = [m for m in cands if m.get("category") in ("사이드", "디저트")]
        elif re.search(r"먹을", utter):
            cands = [m for m in cands if m.get("category") != "마실 것"]
        # 맛 조건
        wanted_taste = {t for kw, t in TASTE_WORDS.items() if kw in utter}
        if wanted_taste:
            taste_hit = [m for m in cands if wanted_taste & set(m.get("tags", []))]
            if taste_hit:
                cands = taste_hit
        if not cands:
            cands = list(menu.values())
        # 인기 우선, 그다음 입력 순서
        cands.sort(key=lambda m: (not m.get("popular", False)))
        # 같은 버거 계열(단품·세트)은 한 번만 추천한다
        out: list[str] = []
        seen_base: set[str] = set()
        for m in cands:
            base = m.get("set_of") or m["id"]
            if base in seen_base:
                continue
            seen_base.add(base)
            out.append(m["id"])
            if len(out) == 3:
                break
        return out

    def interpret(
        self, utterance: str, cart: list[CartItem], menu: dict[str, dict], expressions: dict
    ) -> InterpretResult:
        u = utterance.strip()
        cart_map = {c.id: c.qty for c in cart}

        # 0) 추천 요청 — 특정 메뉴를 콕 집지 않고 추천을 청할 때
        if RECOMMEND_RE.search(u):
            sugg = self._recommend(u, menu, expressions)
            names = ", ".join(menu[i]["easy_name"] for i in sugg)
            return finalize(
                {
                    "action": "recommend",
                    "suggestions": sugg,
                    "reply": f"손님들이 많이 찾는 메뉴입니다. {names} 어떠세요? 화면에서 선택하실 수도 있습니다.",
                },
                cart, menu, self.name,
            )

        matches = self._match(u, menu, expressions)

        # 1) 확정 — 메뉴 언급이 없을 때만 ("불고기 버거 네 개"의 '네'를 확정으로 오인 방지)
        if cart and not matches and len(u) <= 25 and CONFIRM_RE.search(u) and not NEG_RE.search(u):
            return finalize({"action": "confirm", "reply": "주문을 확정하겠습니다."}, cart, menu, self.name)

        # 2) 전체 취소
        if CANCEL_ALL_RE.search(u):
            return finalize(
                {"action": "update", "cart": [], "reply": "전부 취소했습니다."}, cart, menu, self.name
            )

        # 3) 항목 제거 / 교체 (장바구니 안 항목 언급 + 동사)
        if cart and REMOVE_RE.search(u):
            targets = [i for _, ids in matches for i in ids if i in cart_map]
            if targets:
                # 수량을 말했으면 그만큼 빼고, 말하지 않았으면("콜라는 빼줘") 항목을 전부 뺀다
                explicit_qty = bool(self._qty_candidates(u))
                remove_qty = self._qty(u) if explicit_qty else None
                for t in set(targets):
                    if remove_qty is None:
                        cart_map.pop(t, None)
                        continue
                    new_val = cart_map.get(t, 0) - remove_qty
                    if new_val <= 0:
                        cart_map.pop(t, None)
                    else:
                        cart_map[t] = new_val
                reply = "담은 메뉴에서 뺐습니다."
                # "A 말고 B로" — 장바구니에 없는 단일 후보는 교체로 보고 새로 담는다
                if re.search(r"말고|대신", u):
                    for _, ids in matches:
                        ids2 = self._temp_filter(ids, u, menu, expressions)
                        if len(set(ids2)) == 1 and ids2[0] not in targets and ids2[0] not in cart_map:
                            cart_map[ids2[0]] = 1
                            reply = "변경했습니다."
                new_cart = [{"id": k, "qty": v} for k, v in cart_map.items()]
                return finalize(
                    {"action": "update", "cart": new_cart, "reply": reply}, cart, menu, self.name
                )
            return finalize(
                {"action": "clarify", "question": "어떤 것을 뺄까요?"}, cart, menu, self.name
            )

        # 3.5) 항목 교체 — "새우버거를 불고기버거로 바꿔줘"
        # 담긴 항목 하나 + 새 메뉴 하나가 정확히 짚어질 때만 처리. 모호하면 그대로 흘려보내
        # 되묻기/LLM이 맡는다 (확신 없는 규칙이 확신에 찬 오답을 내지 않도록).
        if cart and REPLACE_RE.search(u) and matches:
            resolved: list[str] = []
            for _, ids in matches:
                ids2 = self._temp_filter(ids, u, menu, expressions)
                if len(set(ids2)) == 1 and ids2[0] not in resolved:
                    resolved.append(ids2[0])

            def cart_id_for(mid: str) -> str | None:
                """언급 메뉴가 담겨 있으면 그 id, 단품을 말했는데 세트가 담겨 있으면 세트 id."""
                if mid in cart_map:
                    return mid
                return next((c for c in cart_map if menu.get(c, {}).get("set_of") == mid), None)

            src_in_cart: str | None = None
            tgt: str | None = None
            if len(resolved) == 2:
                pairs = [(m, cart_id_for(m)) for m in resolved]
                sources = [(m, cid) for m, cid in pairs if cid]
                news = [m for m, cid in pairs if cid is None]
                if len(sources) == 1 and len(news) == 1:
                    src_said, src_in_cart = sources[0]
                    tgt = news[0]
                    if src_in_cart != src_said:  # 세트가 담겨 있었으면 교체도 세트로
                        tgt = next((k for k, m in menu.items() if m.get("set_of") == tgt), tgt)
            elif len(resolved) == 1 and cart_id_for(resolved[0]) is None and len(cart_map) == 1:
                # "불고기버거로 바꿔줘" — 담긴 게 하나뿐이면 그것을 교체 대상으로 본다
                src_in_cart = next(iter(cart_map))
                tgt = resolved[0]
                if menu.get(src_in_cart, {}).get("set_of"):  # 담긴 게 세트면 세트로 교체
                    tgt = next((k for k, m in menu.items() if m.get("set_of") == tgt), tgt)

            if src_in_cart and tgt:
                qty = cart_map.pop(src_in_cart)
                cart_map[tgt] = cart_map.get(tgt, 0) + qty
                new_cart = [{"id": k, "qty": v} for k, v in cart_map.items()]
                src_name, tgt_name = menu[src_in_cart]["easy_name"], menu[tgt]["easy_name"]
                reply = f"{src_name} 대신 {tgt_name}{particle_ro(tgt_name)} 바꿔 담았습니다."
                return finalize(
                    {"action": "update", "cart": new_cart, "reply": reply}, cart, menu, self.name
                )

        # 4) "하나 더" — 메뉴 언급이 없을 때만 (있으면 6번 추가 로직이 처리)
        if cart and not matches and MORE_RE.search(u):
            last = cart[-1]
            cart_map[last.id] = cart_map[last.id] + 1
            new_cart = [{"id": k, "qty": v} for k, v in cart_map.items()]
            return finalize(
                {"action": "update", "cart": new_cart, "reply": "하나 더 담았습니다."},
                cart, menu, self.name,
            )

        # 5) 장바구니 항목 수량 변경 ("콜라 두 개로 해줘/바꿔줘")
        # 수량을 실제로 말했을 때만 — 없는데 '바꿔'만 보고 수량 변경으로 오인하면
        # 교체 요청이 여기서 확신에 찬 오답으로 끝나 버린다 (규칙 우선 게이트가 LLM을 건너뜀)
        if cart and self._qty_candidates(u) and re.search(r"(개로|잔으로|으로|로)\s*(해|바꿔|변경|늘려|줄여|맞춰|설정)", u):
            targets = [i for _, ids in matches for i in ids if i in cart_map]
            if len(set(targets)) == 1:
                cart_map[targets[0]] = self._qty(u)
                new_cart = [{"id": k, "qty": v} for k, v in cart_map.items()]
                return finalize(
                    {"action": "update", "cart": new_cart, "reply": "수량을 변경했습니다."},
                    cart, menu, self.name,
                )

        # 6) 추가 주문
        singles: list[str] = []
        singles_phrases: list[str] = []  # matched phrases for per-item qty
        ambiguous: list[list[str]] = []
        for ph, ids in matches:
            ids2 = self._temp_filter(ids, u, menu, expressions)
            if len(set(ids2)) == 1:
                singles.append(ids2[0])
                singles_phrases.append(ph)
            else:
                ambiguous.append(sorted(set(ids2)))
        # Filter out ambiguous groups that contain an item already uniquely resolved in singles
        ambiguous = [ids for ids in ambiguous if not any(x in singles for x in ids)]
        if singles and not ambiguous:
            distinct = list(dict.fromkeys(singles))
            if len(distinct) == 1:
                # 단일 품목: 발화의 수량 적용
                cart_map[distinct[0]] = cart_map.get(distinct[0], 0) + self._qty(u)
            else:
                # 복수 품목: 각 항목 근처의 수량을 개별 파싱
                # Build a mapping: item_id -> phrase for position lookup
                item_phrase: dict[str, str] = {}
                for sid, ph in zip(singles, singles_phrases):
                    if sid not in item_phrase:
                        item_phrase[sid] = ph
                for sid in distinct:
                    ph = item_phrase[sid]
                    # Find the phrase position in the original utterance
                    np = _norm(ph)
                    u_norm = _norm(u)
                    pos = u_norm.find(np)
                    if pos >= 0:
                        # Map position back to original utterance approximately
                        # Find the phrase in original utterance for better position
                        orig_pos = u.find(ph)
                        if orig_pos >= 0:
                            phrase_end = orig_pos + len(ph)
                        else:
                            phrase_end = pos + len(np)
                        qty = self._qty_near(u, phrase_end)
                    else:
                        qty = 1
                    cart_map[sid] = cart_map.get(sid, 0) + qty
            new_cart = [{"id": k, "qty": v} for k, v in cart_map.items()]
            return finalize(
                {"action": "update", "cart": new_cart, "reply": "담았습니다."}, cart, menu, self.name
            )
        if ambiguous:
            names = ", ".join(menu[i]["easy_name"] for i in ambiguous[0][:4])
            return finalize(
                {"action": "clarify", "question": f"{names} 중에 어느 것으로 드릴까요?"},
                cart, menu, self.name,
            )

        # 7) Reject — no menu items matched but utterance looks like a food order
        if not matches and FOOD_CONTEXT_RE.search(u):
            return finalize(
                {"action": "reject", "reply": "죄송합니다. 저희 매장에 없는 메뉴입니다. 다른 메뉴를 선택해 주시겠어요?"},
                cart, menu, self.name,
            )

        return finalize(
            {"action": "clarify", "question": "다시 한 번 천천히 말씀해 주시겠어요?"},
            cart, menu, self.name,
        )


def make_provider(kind: str | None = None):
    kind = (kind or os.getenv("KIOSK_PROVIDER", "auto")).lower()
    if kind == "rule":
        return RuleProvider()
    if kind == "claude":
        return ClaudeProvider()
    # auto: 키 있으면 Claude, 없으면 규칙 폴백
    return ClaudeProvider() if os.getenv("ANTHROPIC_API_KEY") else RuleProvider()
