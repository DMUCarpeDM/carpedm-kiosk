import type { ReactNode } from "react";
import { menuImageSrc } from "./menuImages";
import type { MenuItem } from "./types";

/* Icons */
function IconBack() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCup() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 8h12v8a4 4 0 01-4 4h-4a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="2" />
      <path d="M18 10h2a2 2 0 010 4h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 4c0-1 1-2 2-2h4c1 0 2 1 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheckBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* KioskHeader */
export function KioskHeader({
  title = "카페",
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="kiosk-header">
      {onBack ? (
        <button type="button" className="kiosk-header__btn" onClick={onBack} aria-label="뒤로">
          <IconBack />
        </button>
      ) : (
        <span className="kiosk-header__side" />
      )}
      <h1 className="kiosk-header__title">{title}</h1>
      <div className="kiosk-header__side kiosk-header__side--right">{right ?? <span />}</div>
    </header>
  );
}

export function KioskHeaderSettings() {
  return (
    <button type="button" className="kiosk-header__btn kiosk-header__btn--muted" aria-label="설정" disabled>
      <IconSettings />
    </button>
  );
}

export function KioskHeaderSearch() {
  return (
    <button type="button" className="kiosk-header__btn kiosk-header__btn--muted" aria-label="검색" disabled>
      <IconSearch />
    </button>
  );
}

/* PrimaryChoiceButton */
export function PrimaryChoiceButton({
  variant,
  icon,
  label,
  onClick,
}: {
  variant: "primary" | "secondary";
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`choice-btn choice-btn--${variant}`}
      onClick={onClick}
    >
      <span className="choice-btn__icon">{icon}</span>
      <span className="choice-btn__label">{label}</span>
    </button>
  );
}

/* VoiceWaveform */
export function VoiceWaveform({ active }: { active: boolean }) {
  const bars = 14;
  return (
    <div className={`voice-wave ${active ? "voice-wave--active" : ""}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="voice-wave__bar" style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}

export const Waveform = VoiceWaveform;
export const TopBar = KioskHeader;

/* MenuImage */
export function MenuImage({ item }: { item: Pick<MenuItem, "id" | "easy_name" | "category"> }) {
  const src = menuImageSrc(item);
  return (
    <div className="menu-img">
      <img src={src} alt="" className="menu-img__photo" />
    </div>
  );
}

export function MenuImageSrc({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="menu-img">
      <img src={src} alt="" className="menu-img__photo" />
      <span className="sr-only">{alt}</span>
    </div>
  );
}

/* MenuCard */
export function MenuCard({
  item,
  price,
  onClick,
}: {
  item: MenuItem;
  price: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="menu-card" onClick={onClick}>
      <MenuImage item={item} />
      <span className="menu-card__name">{item.easy_name}</span>
      <span className="menu-card__price">{price}</span>
    </button>
  );
}

export function MenuMoreCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="menu-card menu-card--more" onClick={onClick}>
      <MenuImageSrc src="/menu/more.svg" alt="더보기" />
      <span className="menu-card__name">더보기</span>
      <span className="menu-card__price menu-card__price--muted">음료/디저트</span>
    </button>
  );
}

/* RecommendedMenuCard */
export function RecommendedMenuCard({
  item,
  price,
  qty,
}: {
  item: MenuItem;
  price: string;
  qty?: number;
}) {
  return (
    <div className="rec-card">
      <div className="rec-card__badge">
        <IconCheckBadge />
        <span>추천 메뉴</span>
      </div>
      <div className="rec-card__body">
        <MenuImage item={item} />
        <div className="rec-card__info">
          <h2 className="rec-card__name">{item.easy_name}</h2>
          {item.original_name ? <p className="rec-card__sub">{item.original_name}</p> : null}
          <p className="rec-card__price">{price}</p>
          {qty && qty > 1 ? <p className="rec-card__qty">수량 {qty}개</p> : null}
          <p className="rec-card__ask">이 메뉴가 맞으신가요?</p>
        </div>
      </div>
    </div>
  );
}

/* OptionChip */
export function OptionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`option-chip ${selected ? "option-chip--selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

/* QuantitySelector */
export function QuantitySelector({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="qty-select">
      <button
        type="button"
        className="qty-select__btn"
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label="수량 줄이기"
      >
        −
      </button>
      <span className="qty-select__value">{qty}</span>
      <button
        type="button"
        className="qty-select__btn"
        onClick={() => onChange(Math.min(99, qty + 1))}
        aria-label="수량 늘리기"
      >
        +
      </button>
    </div>
  );
}

/* BottomActionButton */
export function BottomActionButton({
  variant,
  label,
  onClick,
  icon,
}: {
  variant: "primary" | "secondary";
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button type="button" className={`action-btn action-btn--${variant}`} onClick={onClick}>
      {icon ? <span className="action-btn__icon">{icon}</span> : null}
      {label}
    </button>
  );
}

/* CompletionPanel */
export function CompletionPanel({ onHome }: { onHome: () => void }) {
  return (
    <div className="complete-panel">
      <div className="complete-panel__icon" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <path d="M6 12l4 4 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="complete-panel__title">주문이 완료되었습니다</h2>
      <p className="complete-panel__sub">이용해 주셔서 감사합니다.</p>
      <span className="complete-panel__cup" aria-hidden="true">
        <IconCup />
      </span>
      <BottomActionButton variant="secondary" label="처음으로 돌아가기" onClick={onHome} icon={<IconHome />} />
    </div>
  );
}

/* MicButton for voice screen */
export function MicButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={`mic-btn ${active ? "mic-btn--active" : ""}`}
      onClick={onClick}
      aria-label="마이크"
    >
      <IconMic />
    </button>
  );
}

export { IconMic, IconCup };
