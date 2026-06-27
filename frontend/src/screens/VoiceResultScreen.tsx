import { formatPrice, menuById } from "../api";
import { BottomActionButton, KioskHeader, RecommendedMenuCard } from "../components";
import type { MenuItem, VoiceResultView } from "../types";

type Props = {
  utterance: string;
  view: VoiceResultView;
  menu: MenuItem[];
  onRetry: () => void;
  onConfirm: () => void;
  onMenuSelect: () => void;
  onBack: () => void;
};

export function VoiceResultScreen({
  utterance,
  view,
  menu,
  onRetry,
  onConfirm,
  onMenuSelect,
  onBack,
}: Props) {
  const item = view.kind === "menu" ? menuById(menu, view.menuId) : undefined;

  return (
    <div className="screen screen--voice-result">
      <KioskHeader onBack={onBack} />
      <main className="voice-result">
        <section className="voice-result__utterance">
          <p className="voice-result__label">고객님이 말씀하신 내용</p>
          <blockquote className="voice-result__quote">&ldquo;{utterance}&rdquo;</blockquote>
        </section>

        {view.kind === "menu" && item ? (
          <>
            <p className="voice-result__heading">이렇게 이해했어요!</p>
            <RecommendedMenuCard item={item} price={formatPrice(item.price)} qty={view.qty} />
            <div className="voice-result__actions">
              <BottomActionButton variant="secondary" label="다시 말하기" onClick={onRetry} />
              <BottomActionButton variant="primary" label="맞아요, 주문할게요" onClick={onConfirm} />
            </div>
          </>
        ) : null}

        {view.kind === "clarify" ? (
          <section className="message-panel">
            <p className="message-panel__text">{view.text}</p>
            <BottomActionButton variant="primary" label="다시 말하기" onClick={onRetry} />
          </section>
        ) : null}

        {view.kind === "reject" ? (
          <section className="message-panel">
            <p className="message-panel__text">{view.text}</p>
            <div className="voice-result__actions">
              <BottomActionButton variant="secondary" label="다시 말하기" onClick={onRetry} />
              <BottomActionButton variant="primary" label="메뉴선택" onClick={onMenuSelect} />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
