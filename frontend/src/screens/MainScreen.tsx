import {
  IconCup,
  IconMic,
  KioskHeader,
  PrimaryChoiceButton,
} from "../components";

type Props = {
  onVoiceOrder: () => void;
  onMenuSelect: () => void;
  largeText: boolean;
  onToggleFontSize: () => void;
};

export function MainScreen({ onVoiceOrder, onMenuSelect, largeText, onToggleFontSize }: Props) {
  return (
    <div className="screen screen--main">
      <KioskHeader 
        largeText={largeText} 
        onToggleFontSize={onToggleFontSize} 
      />
      <main className="main-hero" style={{ display: "flex", flexDirection: "column", gap: "24px", justifyContent: "center" }}>
        <h2 style={{ fontSize: "var(--fz-heading)", margin: "0 0 16px", textAlign: "center", fontWeight: "800" }}>
          원하시는 주문 방법을 선택해 주세요
        </h2>
        <div style={{ display: "flex", gap: "32px", width: "100%", flex: 1 }}>
          <PrimaryChoiceButton
            variant="primary"
            icon={<IconMic />}
            label="🎤 말로 주문"
            onClick={onVoiceOrder}
          />
          <PrimaryChoiceButton
            variant="secondary"
            icon={<IconCup />}
            label="👆 그림 보고 누르기"
            onClick={onMenuSelect}
          />
        </div>
      </main>
      <footer className="main-welcome">
        <p>말씀을 듣고 주문을 도와드릴게요.</p>
      </footer>
    </div>
  );
}
