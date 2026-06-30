import { useEffect } from "react";
import { CompletionPanel, SubtitleBar, ProgressBar, KioskHeader } from "../components";
import type { CartItem, MenuItem } from "../types";

type Props = {
  cart: CartItem[];
  menu: MenuItem[];
  onHome: () => void;
  largeText: boolean;
  onToggleFontSize: () => void;
  speakWithSubtitle: (text: string, onEnd?: () => void) => void;
  subtitleText: string;
};

export function OrderCompleteScreen({
  cart,
  menu,
  onHome,
  largeText,
  onToggleFontSize,
  speakWithSubtitle,
  subtitleText,
}: Props) {
  useEffect(() => {
    speakWithSubtitle("주문이 완료되었습니다. 카드나 현금을 준비하시고 기다려 주시면 직원이 도와드릴게요.");
    
    // Auto-return to home screen after 15 seconds of inactivity
    const timer = setTimeout(() => {
      onHome();
    }, 15000);

    return () => clearTimeout(timer);
  }, [onHome]);

  const handleCallStaff = () => {
    speakWithSubtitle("직원을 호출했습니다. 잠시만 기다려 주세요.");
    setTimeout(() => {
      onHome();
    }, 4000);
  };

  return (
    <div className="screen screen--complete">
      <KioskHeader
        largeText={largeText}
        onToggleFontSize={onToggleFontSize}
        title="주문 완료"
      />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <CompletionPanel
          cart={cart}
          menu={menu}
          onHome={onHome}
          onCallStaff={handleCallStaff}
        />
      </main>

      {/* Subtitle bar overlay */}
      <SubtitleBar text={subtitleText} />

      {/* Step tracker */}
      <ProgressBar currentStep="complete" />
    </div>
  );
}
