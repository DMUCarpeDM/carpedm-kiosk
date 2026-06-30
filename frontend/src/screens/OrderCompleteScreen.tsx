import { useEffect } from "react";

type Props = {
  onHome: () => void;
};

export function OrderCompleteScreen({ onHome }: Props) {
  useEffect(() => {
    const timer = setTimeout(onHome, 3000);
    return () => clearTimeout(timer);
  }, [onHome]);

  return (
    <div className="screen screen--lotte-page screen--lotte-complete">
      <header className="lotte-sign lotte-sign--inline" aria-label="롯데리아">
        <div className="lotte-sign__bar">
          <span className="lotte-sign__line" aria-hidden="true" />
          <span className="lotte-sign__logo">LOTTERIA</span>
          <span className="lotte-sign__line" aria-hidden="true" />
        </div>
      </header>

      <main className="lotte-complete-main">
        <div className="lotte-complete-icon" aria-hidden="true">
          <svg width="144" height="144" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f5c400" />
            <path d="M7 12l3 3 7-7" stroke="#8f1d3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="lotte-complete-title">주문이 완료되었습니다</h2>
        <p className="lotte-complete-sub">이용해 주셔서 감사합니다.</p>
        <p className="lotte-complete-hint">잠시 후 카운터에서 주문번호를 확인해 주세요.</p>
      </main>
    </div>
  );
}
