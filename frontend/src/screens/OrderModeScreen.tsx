import { IconMic, IconTouch } from "../icons";

type Props = {
  onVoice: () => void;
  onTouch: () => void;
  onBack: () => void;
};

/** 주문 방식 선택 — 음성(권장)과 터치를 나란히, 한 화면 = 한 질문 */
export function OrderModeScreen({ onVoice, onTouch, onBack }: Props) {
  return (
    <div className="lk-mode">
      <h1 className="lk-mode__title">주문 방법을 선택해 주세요</h1>
      <p className="lk-mode__sub">편하신 방법으로 주문하실 수 있습니다</p>

      <div className="lk-mode__cards">
        <button type="button" className="lk-mode-card lk-mode-card--voice" onClick={onVoice}>
          <span className="lk-mode-card__flag">간편 주문</span>
          <span className="lk-mode-card__icon">
            <IconMic size={62} />
          </span>
          <span>
            <span className="lk-mode-card__label">말로 주문하기</span>
            <span className="lk-mode-card__sub">마이크에 대고 주문하실 메뉴를 말씀하시면 됩니다</span>
          </span>
        </button>

        <button type="button" className="lk-mode-card lk-mode-card--touch" onClick={onTouch}>
          <span className="lk-mode-card__icon">
            <IconTouch size={60} />
          </span>
          <span>
            <span className="lk-mode-card__label">화면 보고 주문하기</span>
            <span className="lk-mode-card__sub">사진을 보고 메뉴를 선택합니다</span>
          </span>
        </button>
      </div>

      <button type="button" className="lk-mode__back" onClick={onBack}>
        ← 이전으로
      </button>
    </div>
  );
}
