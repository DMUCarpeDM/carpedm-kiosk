import { useEffect } from "react";
import { formatPrice, menuById } from "../api";
import { BottomActionButton, KioskHeader, RecommendedMenuCard, SubtitleBar, ProgressBar } from "../components";
import type { MenuItem, VoiceResultView } from "../types";

type Props = {
  utterance: string;
  view: VoiceResultView;
  menu: MenuItem[];
  onRetry: () => void;
  onConfirm: () => void;
  onMenuSelect: () => void;
  onBack: () => void;
  largeText: boolean;
  onToggleFontSize: () => void;
  speakWithSubtitle: (text: string, onEnd?: () => void) => void;
  subtitleText: string;
};

export function VoiceResultScreen({
  utterance,
  view,
  menu,
  onRetry,
  onConfirm,
  onMenuSelect,
  onBack,
  largeText,
  onToggleFontSize,
  speakWithSubtitle,
  subtitleText,
}: Props) {
  const item = view.kind === "menu" ? menuById(menu, view.menuId) : undefined;

  // Speak the result or clarification request automatically on mount
  useEffect(() => {
    if (view.kind === "menu" && item) {
      const qtyText = view.qty && view.qty > 1 ? `${view.qty}개` : "한 잔";
      speakWithSubtitle(`${item.easy_name} ${qtyText} 주문하시겠어요? 맞으면 '네'라고 말씀하시거나 버튼을 눌러 주세요.`);
    } else if (view.kind === "clarify") {
      speakWithSubtitle(view.text);
    } else if (view.kind === "reject") {
      speakWithSubtitle(view.text);
    }
  }, [view, item]);

  return (
    <div className="screen screen--voice-result">
      <KioskHeader
        largeText={largeText}
        onToggleFontSize={onToggleFontSize}
        onBack={onBack}
        onReplay={() => {
          if (view.kind === "menu" && item) {
            const qtyText = view.qty && view.qty > 1 ? `${view.qty}개` : "한 잔";
            speakWithSubtitle(`${item.easy_name} ${qtyText} 주문하시겠어요? 맞으면 '네'라고 말씀하시거나 버튼을 눌러 주세요.`);
          } else if (view.kind === "clarify" || view.kind === "reject") {
            speakWithSubtitle(view.text);
          }
        }}
      />
      
      <main className="voice-result">
        {/* Double-column signature layout: 어르신 말씀 -> 알아들은 것 */}
        <section className="voice-result__utterance">
          <p className="voice-result__label" style={{ fontWeight: "800" }}>어르신이 하신 말씀</p>
          <blockquote className="voice-result__quote">&ldquo;{utterance}&rdquo;</blockquote>
        </section>

        {view.kind === "menu" && item ? (
          <>
            <p className="voice-result__heading">이렇게 이해했어요!</p>
            <RecommendedMenuCard item={item} price={formatPrice(item.price)} qty={view.qty} />
            <div className="voice-result__actions">
              <BottomActionButton variant="secondary" label="🎤 다시 말하기" onClick={onRetry} />
              <BottomActionButton variant="primary" label="✓ 네, 맞아요" onClick={onConfirm} />
            </div>
          </>
        ) : null}

        {view.kind === "clarify" ? (
          <section className="message-panel">
            <p className="message-panel__text" style={{ fontWeight: "800" }}>{view.text}</p>
            <div className="voice-result__actions" style={{ width: "100%" }}>
              <BottomActionButton variant="primary" label="🎤 다시 말하기" onClick={onRetry} />
            </div>
          </section>
        ) : null}

        {view.kind === "reject" ? (
          <section className="message-panel">
            <p className="message-panel__text" style={{ fontWeight: "800" }}>{view.text}</p>
            <div className="voice-result__actions">
              <BottomActionButton variant="secondary" label="🎤 다시 말하기" onClick={onRetry} />
              <BottomActionButton variant="primary" label="👆 직접 메뉴 선택" onClick={onMenuSelect} />
            </div>
          </section>
        ) : null}
      </main>

      {/* Subtitles Overlay */}
      <SubtitleBar text={subtitleText} />

      {/* Step Tracker */}
      <ProgressBar currentStep="verify" />
    </div>
  );
}
