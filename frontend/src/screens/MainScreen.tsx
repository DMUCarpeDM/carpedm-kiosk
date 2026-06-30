import { IconMic } from "../components";

type Props = {
  onVoiceOrder: () => void;
  onMenuSelect: () => void;
};

function IconTouchHand() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="22" stroke="#8f1d3a" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="10" fill="#8f1d3a" />
    </svg>
  );
}

function IconBurger() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10h16M4 14h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7c2-2 10-2 12 0M6 17c2 2 10 2 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconWheelchair() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <path d="M9 8v5h5l2 5M7 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="18" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconEar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 10a6 6 0 1112 0v2a3 3 0 01-3 3h-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9 17a3 3 0 006 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconZoom() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4-4M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MainScreen({ onVoiceOrder, onMenuSelect }: Props) {
  return (
    <div className="screen screen--main screen--lotte">
      <header className="lotte-sign" aria-label="롯데리아">
        <div className="lotte-sign__bar">
          <span className="lotte-sign__line" aria-hidden="true" />
          <span className="lotte-sign__logo">LOTTERIA</span>
          <span className="lotte-sign__line" aria-hidden="true" />
        </div>
      </header>

      <section className="lotte-hero" aria-label="주문 안내">
        <p className="lotte-hero__tagline">기다리지 않고 간편하게</p>
        <h1 className="lotte-hero__title">
          여기에서
          <br />
          주문하세요!
        </h1>
        <div className="lotte-hero__touch" aria-hidden="true">
          <IconTouchHand />
          <span>화면을 터치해 주세요</span>
        </div>
      </section>

      <section className="lotte-store" aria-label="주문 방식 선택">
        <div className="lotte-store__body">
          <button type="button" className="lotte-order-btn" onClick={onVoiceOrder}>
            <span className="lotte-order-btn__icon">
              <IconMic />
            </span>
            음성주문
          </button>
          <button type="button" className="lotte-order-btn" onClick={onMenuSelect}>
            <span className="lotte-order-btn__icon">
              <IconBurger />
            </span>
            메뉴주문
          </button>
        </div>
      </section>

      <footer className="lotte-footer">
        <div className="lotte-footer__a11y" aria-label="접근성">
          <span className="lotte-footer__a11y-btn" aria-hidden="true">
            <IconWheelchair />
          </span>
          <span className="lotte-footer__a11y-btn" aria-hidden="true">
            <IconEar />
          </span>
          <span className="lotte-footer__a11y-btn" aria-hidden="true">
            <IconZoom />
          </span>
        </div>
        <div className="lotte-footer__lang" aria-label="언어 선택">
          <span className="lotte-footer__lang--active">한국어</span>
          <span>English</span>
          <span>中国語</span>
          <span>日本語</span>
        </div>
      </footer>
    </div>
  );
}
