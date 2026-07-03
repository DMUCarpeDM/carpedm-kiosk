import { useEffect } from "react";
import { formatPrice, menuById } from "../api";
import { MicButton, RecommendedMenuCard } from "../components";
import { playSpeech, stopAllAudio } from "../speech";
import type { CartItem, MenuItem, VoiceResultView } from "../types";

type Props = {
  utterance: string;
  view: VoiceResultView;
  menu: MenuItem[];
  cart: CartItem[];
  /** 서버 TTS 오디오 (없으면 브라우저 TTS로 자막을 읽어준다) */
  say?: string;
  audioB64?: string | null;
  audioMime?: string;
  onRetry: () => void;
  onConfirm: () => void;
  onOpenMenu: () => void;
  onPickSuggestion: (id: string) => void;
  onBack: () => void;
};

function cartTotal(cart: CartItem[], menu: MenuItem[]): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const c of cart) {
    const m = menuById(menu, c.id);
    if (m) {
      count += c.qty;
      total += m.price * c.qty;
    }
  }
  return { count, total };
}

export function VoiceResultScreen({
  utterance,
  view,
  menu,
  cart,
  say,
  audioB64,
  audioMime,
  onRetry,
  onConfirm,
  onOpenMenu,
  onPickSuggestion,
  onBack,
}: Props) {
  const item = view.kind === "menu" ? menuById(menu, view.menuId) : undefined;
  const spoken = say ?? (view.kind === "clarify" || view.kind === "reject" ? view.text : view.say);
  const { count, total } = cartTotal(cart, menu);

  // 안내 음성 재생 + 자막 동시 표시 (청각 보조)
  useEffect(() => {
    if (spoken || audioB64) void playSpeech(spoken ?? "", audioB64, audioMime);
    return () => stopAllAudio();
  }, [spoken, audioB64, audioMime]);

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

        {spoken ? (
          <section className="lotte-voice-subtitle" aria-live="polite">
            <span className="lotte-voice-subtitle__icon" aria-hidden="true">🔊</span>
            <p className="lotte-voice-subtitle__text">{spoken}</p>
          </section>
        ) : null}

        {view.kind === "menu" && item ? (
          <div className="lotte-voice-result__center">
            <RecommendedMenuCard
              item={item}
              price={formatPrice(item.price)}
              qty={view.qty}
              showAsk={false}
              showBadge={false}
            />
          </div>
        ) : null}

        {view.kind === "recommend" ? (
          <div className="lotte-voice-result__center">
            <div className="lotte-voice-suggestions">
              {view.menuIds.map((id) => {
                const m = menuById(menu, id);
                if (!m) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    className="lotte-voice-suggestion"
                    onClick={() => onPickSuggestion(id)}
                  >
                    <RecommendedMenuCard item={m} price={formatPrice(m.price)} qty={1} showAsk={false} showBadge={false} />
                    <span className="lotte-voice-suggestion__cta">이걸로 담기</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {view.kind === "clarify" || view.kind === "reject" ? (
          <div className="lotte-voice-result__center">
            <section className="lotte-message-panel">
              <p className="lotte-message-panel__text">{view.text}</p>
            </section>
          </div>
        ) : null}

        {cart.length > 0 ? (
          <div className="lotte-order-bar">
            <span className="lotte-order-bar__label">지금까지 담은 것</span>
            <span className="lotte-order-bar__count">
              <strong>{count}</strong> 개
            </span>
            <span className="lotte-order-bar__total">{formatPrice(total)}</span>
          </div>
        ) : null}

        <div className="lotte-voice-result__mic-area">
          <MicButton active={false} onClick={onRetry} />
          <p className="lotte-voice-result__mic-hint">버튼을 누르고 이어서 말씀하세요</p>
        </div>
      </main>

      <footer className="lotte-menu-footer">
        <div className="lotte-menu-footer__a11y">
          <button type="button" className="lotte-menu-footer__a11y-btn" onClick={onBack} aria-label="처음으로">
            ↩
          </button>
        </div>
        <div className="lotte-menu-footer__actions">
          <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--cancel" onClick={onOpenMenu}>
            메뉴판에서 고르기
          </button>
          {cart.length > 0 ? (
            <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--pay" onClick={onConfirm}>
              주문 확정
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
