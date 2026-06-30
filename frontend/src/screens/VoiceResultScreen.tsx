import { formatMenuPrice, formatPrice, menuById } from "../api";
import { MicButton, RecommendedMenuCard } from "../components";
import type { MenuItem, VoiceResultView } from "../types";

type Props = {
  utterance: string;
  view: VoiceResultView;
  menu: MenuItem[];
  onRetry: () => void;
  onBack: () => void;
};

export function VoiceResultScreen({
  utterance,
  view,
  menu,
  onRetry,
  onBack,
}: Props) {
  const item = view.kind === "menu" ? menuById(menu, view.menuId) : undefined;

  return (
    <div className="screen screen--lotte-page screen--lotte-voice-result">
      <header className="lotte-sign lotte-sign--inline" aria-label="롯데리아">
        <div className="lotte-sign__bar">
          <span className="lotte-sign__line" aria-hidden="true" />
          <span className="lotte-sign__logo">LOTTERIA</span>
          <span className="lotte-sign__line" aria-hidden="true" />
        </div>
      </header>

      <main className="lotte-voice-result">
        <section className="lotte-voice-result__utterance">
          <p className="lotte-voice-result__label">고객님이 말씀하신 내용</p>
          <blockquote className="lotte-voice-result__quote">&ldquo;{utterance}&rdquo;</blockquote>
        </section>

        {view.kind === "menu" && item ? (
          <>
            <div className="lotte-voice-result__center">
              <RecommendedMenuCard
                item={item}
                price={formatPrice(item.price)}
                qty={view.qty}
                showAsk={false}
                showBadge={false}
              />
            </div>
            <div className="lotte-order-bar">
              <span className="lotte-order-bar__label">선택 메뉴</span>
              <span className="lotte-order-bar__count">
                <strong>{view.qty}</strong> 개
              </span>
              <span className="lotte-order-bar__total">{formatMenuPrice(item.price * view.qty)}</span>
            </div>
            <div className="lotte-voice-result__mic-area">
              <MicButton active={false} onClick={onRetry} />
            </div>
          </>
        ) : null}

        {view.kind === "clarify" ? (
          <>
            <div className="lotte-voice-result__center">
              <section className="lotte-message-panel">
                <p className="lotte-message-panel__text">{view.text}</p>
              </section>
            </div>
            <div className="lotte-voice-result__mic-area">
              <MicButton active={false} onClick={onRetry} />
            </div>
          </>
        ) : null}

        {view.kind === "reject" ? (
          <>
            <div className="lotte-voice-result__center">
              <section className="lotte-message-panel">
                <p className="lotte-message-panel__text">{view.text}</p>
              </section>
            </div>
            <div className="lotte-voice-result__mic-area">
              <MicButton active={false} onClick={onRetry} />
            </div>
          </>
        ) : null}
      </main>

      <footer className="lotte-voice-result__footer">
        <button type="button" className="lotte-menu-footer__a11y-btn" onClick={onBack} aria-label="처음으로">
          ↩
        </button>
      </footer>
    </div>
  );
}
