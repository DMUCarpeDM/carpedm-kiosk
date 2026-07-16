import { IconMic, IconTouch } from "../icons";

type Props = {
  onVoice: () => void;
  onTouch: () => void;
};

/** 시작 화면 — 우리 키오스크의 강점인 '말로 주문'을 전면에 둔다.
    낯선 기계 앞의 심리적 부담을 낮추려 "그냥 말씀하시면 됩니다"로 안심시키고,
    익숙한 터치 주문은 보조 선택지로 함께 제공한다(음성·터치 병행 원칙). */
export function MainScreen({ onVoice, onTouch }: Props) {
  return (
    <div className="lk-start">
      <div className="lk-start__hero">
        <p className="lk-start__tag">어서 오세요</p>
        <h1 className="lk-start__question">무엇을 드릴까요?</h1>
        <p className="lk-start__reassure">그냥 편하게 말씀하시면 됩니다</p>
      </div>

      <button type="button" className="lk-start__voice" onClick={onVoice}>
        <span className="lk-start__voice-icon">
          <IconMic size={72} />
        </span>
        <span className="lk-start__voice-text">
          <span className="lk-start__voice-label">말로 주문하기</span>
          <span className="lk-start__voice-sub">마이크에 대고 드시고 싶은 메뉴를 말씀하세요</span>
        </span>
      </button>

      <button type="button" className="lk-start__touch" onClick={onTouch}>
        <IconTouch size={34} />
        화면 보고 고를게요
      </button>
    </div>
  );
}
