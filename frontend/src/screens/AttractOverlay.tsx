/**
 * 대기(어트랙트) 화면 — 일정 시간 조작이 없으면 표시된다.
 * 인체감지센서(PIR)가 손님 접근을 감지하면 자동으로 걷히며 인사한다.
 */
type Props = {
  onWake: () => void;
};

export function AttractOverlay({ onWake }: Props) {
  return (
    <button type="button" className="lk-attract" onClick={onWake} aria-label="주문 시작">
      <span className="lk-attract__logo">LOTTERIA</span>
      <span className="lk-attract__ring" aria-hidden="true" />
      <span className="lk-attract__title">어서 오세요</span>
      <span className="lk-attract__sub">화면을 터치하시면 주문이 시작됩니다</span>
    </button>
  );
}
