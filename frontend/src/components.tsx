import type { ReactNode } from "react";
import { menuImageSrc } from "./menuImages";
import type { MenuItem, CartItem } from "./types";
import { formatPrice } from "./api";

/* SVGs */
export function IconBack() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-6v-6H10v6H4a1 1 0 01-1-1v-10.5z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconVolume() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconFont() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19L10 5h4l6 14M7.5 14h9M10 5l4 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMic() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="currentColor" strokeWidth="1" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCup() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 8h12v8a4 4 0 01-4 4h-4a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="2.5" />
      <path d="M18 10h2a2 2 0 010 4h-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 4c0-1 1-2 2-2h4c1 0 2 1 2 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheckBadge() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="var(--confirm)" stroke="var(--ink)" strokeWidth="2" />
      <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* KioskHeader */
export function KioskHeader({
  title = "말씀",
  onBack,
  onReplay,
  largeText,
  onToggleFontSize,
}: {
  title?: string;
  onBack?: () => void;
  onReplay?: () => void;
  largeText?: boolean;
  onToggleFontSize?: () => void;
}) {
  return (
    <header className="kiosk-header">
      {onBack ? (
        <button type="button" className="kiosk-header__btn" onClick={onBack} aria-label="이전 화면으로 돌아가기">
          <IconBack />
          <span style={{ marginLeft: "6px" }}>이전</span>
        </button>
      ) : (
        <span />
      )}
      <h1 className="kiosk-header__title">{title}</h1>
      <div className="kiosk-header__right-actions">
        {onReplay && (
          <button type="button" className="kiosk-header__btn" onClick={onReplay} aria-label="기계 안내 음성 다시 듣기">
            <IconVolume />
            <span style={{ marginLeft: "6px" }}>다시듣기</span>
          </button>
        )}
        {onToggleFontSize && (
          <button
            type="button"
            className="kiosk-header__btn"
            onClick={onToggleFontSize}
            aria-pressed={largeText}
            aria-label="글씨 크기 변경"
            style={{ backgroundColor: largeText ? "var(--ink)" : "var(--card)", color: largeText ? "var(--bg)" : "var(--ink)" }}
          >
            <IconFont />
            <span style={{ marginLeft: "6px" }}>{largeText ? "글씨보통" : "글씨크게"}</span>
          </button>
        )}
      </div>
    </header>
  );
}

/* SubtitleBar Overlay for Deaf/Hearing-Impaired Users */
export function SubtitleBar({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="subtitle-bar" role="alert" aria-live="polite">
      {text}
    </div>
  );
}

/* ProgressBar for visual context */
export function ProgressBar({ currentStep }: { currentStep: "order" | "verify" | "complete" }) {
  return (
    <div className="progress-container" aria-label="주문 단계 표시줄">
      <span className={`progress-step ${currentStep === "order" ? "progress-step--active" : ""}`}>
        1. 말하기/고르기
      </span>
      <span className={`progress-step ${currentStep === "verify" ? "progress-step--active" : ""}`}>
        2. 주문 확인
      </span>
      <span className={`progress-step ${currentStep === "complete" ? "progress-step--active" : ""}`}>
        3. 주문 완료
      </span>
    </div>
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

/* VoiceWaveform animation */
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

/* MenuImage loader */
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

/* MenuCategoryTabs */
export function CategoryTabs({
  activeTab,
  onChange,
}: {
  activeTab: "all" | "drinks" | "desserts";
  onChange: (tab: "all" | "drinks" | "desserts") => void;
}) {
  return (
    <div className="category-tabs" role="tablist" aria-label="메뉴 카테고리">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "all"}
        className={`tab-btn ${activeTab === "all" ? "tab-btn--active" : ""}`}
        onClick={() => onChange("all")}
      >
        전체 보기
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "drinks"}
        className={`tab-btn ${activeTab === "drinks" ? "tab-btn--active" : ""}`}
        onClick={() => onChange("drinks")}
      >
        마실 것 (음료)
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "desserts"}
        className={`tab-btn ${activeTab === "desserts" ? "tab-btn--active" : ""}`}
        onClick={() => onChange("desserts")}
      >
        먹을 것 (간식)
      </button>
    </div>
  );
}

/* MenuCard */
export function MenuCard({
  item,
  price,
  qty,
  onClick,
}: {
  item: MenuItem;
  price: string;
  qty?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`menu-card ${qty ? "menu-card--selected" : ""}`}
      onClick={onClick}
    >
      {item.popular ? <span className="menu-badge">인기</span> : null}
      {qty ? <span className="menu-card__qty-badge" aria-label={`담긴 수량 ${qty}개`}>{qty}</span> : null}
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
      <span className="menu-card__price menu-card__price--muted">전체 보기</span>
    </button>
  );
}

/* RecommendedMenuCard (Double column signature card layout) */
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
        <span>확인 중인 메뉴</span>
      </div>
      <div className="rec-card__body">
        <MenuImage item={item} />
        <div className="rec-card__info">
          <h2 className="rec-card__name">{item.easy_name}</h2>
          {item.original_name ? <p className="rec-card__sub">{item.original_name}</p> : null}
          <p className="rec-card__price">{price}</p>
          {qty && qty > 1 ? <p className="rec-card__qty">수량: {qty}개</p> : null}
          <p className="rec-card__ask">이 내역이 맞으신가요?</p>
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
        aria-label="수량 1개 줄이기"
      >
        −
      </button>
      <span className="qty-select__value" aria-live="polite">{qty}</span>
      <button
        type="button"
        className="qty-select__btn"
        onClick={() => onChange(Math.min(99, qty + 1))}
        aria-label="수량 1개 늘리기"
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
  variant: "primary" | "secondary" | "danger";
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
export function CompletionPanel({
  cart,
  menu,
  onHome,
  onCallStaff,
}: {
  cart: CartItem[];
  menu: MenuItem[];
  onHome: () => void;
  onCallStaff: () => void;
}) {
  const getMenuItem = (id: string) => menu.find((item) => item.id === id);

  const totalSum = cart.reduce((sum, item) => {
    const m = getMenuItem(item.id);
    return sum + (m ? m.price : 0) * item.qty;
  }, 0);

  return (
    <div className="complete-panel">
      <div className="complete-panel__icon" aria-hidden="true">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
          <path d="M6 12l4 4 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="complete-panel__title">주문이 완료되었습니다</h2>
      <p className="complete-panel__sub">아래 내역을 확인해 주세요.</p>

      <div className="complete-order-summary">
        {cart.map((c) => {
          const item = getMenuItem(c.id);
          if (!item) return null;
          return (
            <div key={c.id} className="complete-order-summary__item">
              <span>{item.easy_name} × {c.qty}</span>
              <span>{formatPrice(item.price * c.qty)}</span>
            </div>
          );
        })}
        <div className="complete-order-summary__total">
          <span>최종 합계 금액</span>
          <span>{formatPrice(totalSum)}</span>
        </div>
      </div>

      <div className="complete-panel__actions">
        <BottomActionButton variant="primary" label="더 주문하기" onClick={onHome} icon={<IconHome />} />
        <BottomActionButton variant="secondary" label="계산 끝내기 (직원 호출)" onClick={onCallStaff} icon={<IconCup />} />
      </div>
    </div>
  );
}

/* MicButton */
export function MicButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={`mic-btn ${active ? "mic-btn--active" : ""}`}
      onClick={onClick}
      aria-label="음성 인식 마이크"
    >
      <IconMic />
    </button>
  );
}
