import { menuDisplayName } from "./api";
import { menuImageSrc } from "./menuImages";
import type { DiningOption, MenuItem } from "./types";

/* ── 아이콘 ─────────────────────────────────────────── */
export function IconMic({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
            ⌂ 처음으로
          </button>
        ) : null}
      </div>
    </header>
  );
}

/* ── 접근성 바 (전 화면 하단) ───────────────────────── */
export function A11yBar({
  lowScreen,
  bigText,
  onToggleLow,
  onToggleBig,
}: {
  lowScreen: boolean;
  bigText: boolean;
  onToggleLow: () => void;
  onToggleBig: () => void;
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
          ♿ 낮은 화면
        </button>
        <button
          type="button"
          className={`lk-a11y__btn ${bigText ? "lk-a11y__btn--on" : ""}`}
          onClick={onToggleBig}
          aria-pressed={bigText}
        >
          가<small>A</small> 큰 글씨
        </button>
      </div>
      <div className="lk-a11y__lang" aria-label="언어">
        <b>한국어</b>
        <span>English</span>
        <span>中文</span>
        <span>日本語</span>
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
export function ProductCard({
  item,
  onClick,
}: {
  item: MenuItem;
  onClick: () => void;
}) {
  return (
    <button type="button" className="lk-card" onClick={onClick}>
      <MenuBadge item={item} />
      <span className="lk-card__img">
        <img src={menuImageSrc(item)} alt="" />
      </span>
      <span className="lk-card__name">{menuDisplayName(item)}</span>
      <span className="lk-card__meta">
        {typeof item.kcal === "number" ? `${item.kcal.toLocaleString("ko-KR")}kcal` : " "}
      </span>
      <span className="lk-card__price">{item.price.toLocaleString("ko-KR")}원</span>
    </button>
  );
}
