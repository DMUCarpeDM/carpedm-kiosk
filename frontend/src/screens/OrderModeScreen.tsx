import { IconMic } from "../components";

type Props = {
  onVoice: () => void;
  onTouch: () => void;
  onBack: () => void;
};

/** 주문 방식 선택 — 음성(권장)과 터치를 나란히, 한 화면 = 한 질문 */
export function OrderModeScreen({ onVoice, onTouch, onBack }: Props) {
  return (
    <div className="lk-mode">
      <h1 className="lk-mode__title">어떻게 주문할까요?</h1>
      <p className="lk-mode__sub">두 가지 중 편한 방법을 골라 주세요</p>

      <div className="lk-mode__cards">
        <button type="button" className="lk-mode-card lk-mode-card--voice" onClick={onVoice}>
          <span className="lk-mode-card__flag">쉽고 빨라요</span>
          <span className="lk-mode-card__icon">
            <IconMic size={62} />
          </span>
          <span>
            <span className="lk-mode-card__label">말로 주문하기</span>
            <span className="lk-mode-card__sub">"불고기버거 세트 하나 주세요" 라고 말씀만 하세요</span>
          </span>
        </button>

        <button type="button" className="lk-mode-card lk-mode-card--touch" onClick={onTouch}>
          <span className="lk-mode-card__icon" aria-hidden="true">👆</span>
          <span>
            <span className="lk-mode-card__label">화면 보고 주문하기</span>
            <span className="lk-mode-card__sub">사진을 보면서 하나씩 골라요</span>
          </span>
        </button>
      </div>

      <button type="button" className="lk-mode__back" onClick={onBack}>
        ← 이전으로
      </button>
    </div>
  );
}
