import { menuDisplayName } from "./api";
import { IconBell, IconHome, IconMic, IconTextSize, IconWheelchair } from "./icons";
import { menuImageFallback, menuImageSrc } from "./menuImages";
import type { DiningOption, MenuItem } from "./types";

export { IconMic };

/* ── 상단 바 ────────────────────────────────────────── */
export function TopBar({
  dining,
  onHome,
  showHome = true,
}: {
  dining: DiningOption | null;
  onHome: () => void;
  showHome?: boolean;
}) {
  return (
    <header className="lk-topbar">
      <div className="lk-topbar__side">
        {dining ? (
          <span className="lk-topbar__badge">{dining === "store" ? "매장 식사" : "포장 주문"}</span>
        ) : null}
      </div>
      <span className="lk-topbar__logo">LOTTERIA</span>
      <div className="lk-topbar__side lk-topbar__side--right">
        {showHome ? (
          <button type="button" className="lk-topbar__home" onClick={onHome}>
            <IconHome size={20} /> 처음으로
          </button>
        ) : null}
      </div>
    </header>
  );
}

/* ── 진행 단계 표시 (유니버설 디자인: 내가 어디쯤인지 항상 보인다) ── */
const STEPS = ["주문 방법", "메뉴 고르기", "확인·결제"] as const;

export function StepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav className="lk-steps" aria-label={`3단계 중 ${current}단계`}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "now" : "todo";
        return (
          <span key={label} className={`lk-steps__item lk-steps__item--${state}`}>
            <span className="lk-steps__num">{n}</span>
            <span className="lk-steps__label">{label}</span>
            {n < STEPS.length ? <span className="lk-steps__arrow" aria-hidden="true" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

/* ── 접근성 바 (전 화면 하단) ───────────────────────── */
export function A11yBar({
  lowScreen,
  bigText,
  onToggleLow,
  onToggleBig,
  onHelp,
}: {
  lowScreen: boolean;
  bigText: boolean;
  onToggleLow: () => void;
  onToggleBig: () => void;
  onHelp: () => void;
}) {
  return (
    <footer className="lk-a11y" aria-label="접근성 설정">
      <div className="lk-a11y__group">
        <button
          type="button"
          className={`lk-a11y__btn ${lowScreen ? "lk-a11y__btn--on" : ""}`}
          onClick={onToggleLow}
          aria-pressed={lowScreen}
        >
          <IconWheelchair /> 낮은 화면
        </button>
        <button
          type="button"
          className={`lk-a11y__btn ${bigText ? "lk-a11y__btn--on" : ""}`}
          onClick={onToggleBig}
          aria-pressed={bigText}
        >
          <IconTextSize /> 큰 글씨
        </button>
        <button type="button" className="lk-a11y__btn lk-a11y__btn--help" onClick={onHelp}>
          <IconBell /> 직원 호출
        </button>
      </div>
    </footer>
  );
}

/* ── 음성 파형 ──────────────────────────────────────── */
export function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div className={`lk-wave ${active ? "lk-wave--active" : ""}`} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="lk-wave__bar" style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}

/* ── 마이크 버튼 ────────────────────────────────────── */
export function MicButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={`lk-mic ${active ? "lk-mic--active" : ""}`}
      onClick={onClick}
      aria-label={active ? "말하기 끝내기" : "말하기 시작"}
    >
      <IconMic size={64} />
    </button>
  );
}

/* ── 수량 조절 ──────────────────────────────────────── */
export function QuantitySelector({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  return (
    <div className="lk-qty">
      <button type="button" className="lk-qty__btn" onClick={() => onChange(Math.max(1, qty - 1))} aria-label="수량 줄이기">
        −
      </button>
      <span className="lk-qty__val">{qty}</span>
      <button type="button" className="lk-qty__btn" onClick={() => onChange(Math.min(99, qty + 1))} aria-label="수량 늘리기">
        +
      </button>
    </div>
  );
}

/* ── 메뉴 뱃지 ──────────────────────────────────────── */
export function MenuBadge({ item }: { item: MenuItem }) {
  if (item.tags?.includes("신메뉴")) return <span className="lk-badge lk-badge--new">NEW</span>;
  if (item.popular) return <span className="lk-badge lk-badge--best">BEST</span>;
  return null;
}

/* ── 상품 카드 (메뉴판 그리드) ──────────────────────── */
export function ProductCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <button type="button" className="lk-card" onClick={onClick}>
      <MenuBadge item={item} />
      <span className="lk-card__img">
        <img src={menuImageSrc(item)} alt="" onError={menuImageFallback} />
      </span>
      <span className="lk-card__name">{menuDisplayName(item)}</span>
      {/* 칼로리는 카드에서 빼고 상세 화면(열량 ○○kcal)에서만 — 메뉴판은 이름·가격만 크게 */}
      <span className="lk-card__price">{item.price.toLocaleString("ko-KR")}원</span>
    </button>
  );
}

/* ── 추천 이유 라벨 ─────────────────────────────────── */
export function recommendReason(item: MenuItem): string {
  if (item.popular) return "많이 찾는 메뉴";
  const tags = item.tags ?? [];
  if (tags.includes("맵다")) return "매콤한 맛";
  if (tags.includes("달다")) return "달콤한 맛";
  if (tags.includes("부드럽다")) return "부드러운 맛";
  if (tags.includes("바삭하다")) return "바삭한 식감";
  if (tags.includes("신메뉴")) return "신메뉴";
  return "추천 메뉴";
}
