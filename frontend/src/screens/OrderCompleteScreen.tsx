import { useEffect, useState } from "react";
import { fetchTtsAudio, menuById, menuDisplayName } from "../api";
import { IconCheck } from "../icons";
import { playSpeech, stopAllAudio } from "../speech";
import type { CartItem, DiningOption, MenuItem } from "../types";

const AUTO_HOME_SEC = 12; // 고령 사용자 — 여유 있게

type Props = {
  orderNo: number;
  dining: DiningOption | null;
  cart: CartItem[];
  menu: MenuItem[];
  onHome: () => void;
};

export function OrderCompleteScreen({ orderNo, dining, cart, menu, onHome }: Props) {
  const [left, setLeft] = useState(AUTO_HOME_SEC);
  // 안내 음성이 끝난 뒤에야 초읽기 시작 — 도중에 홈으로 넘어가 말이 끊기지 않게
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    if (!counting) return;
    const tick = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(tick);
  }, [counting]);

  // 주문 완료 음성 안내 (자막은 화면 전체가 대신한다) — 재생 완료 후 초읽기 시작
  useEffect(() => {
    const say = `주문이 완료되었습니다. 주문 번호는 ${orderNo}번입니다. 카운터 화면에 번호가 표시되면 받아 가세요. 감사합니다.`;
    let cancelled = false;
    // 안내가 어떤 이유로든 끝나지 않아도 화면이 영원히 머물지 않도록 안전장치
    const safety = window.setTimeout(() => setCounting(true), 15000);
    void (async () => {
      const audio = await fetchTtsAudio(say);
      if (cancelled) return;
      await playSpeech(say, audio?.b64, audio?.mime);
      if (!cancelled) setCounting(true);
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (left <= 0) onHome();
  }, [left, onHome]);

  const total = cart.reduce((sum, c) => sum + (menuById(menu, c.id)?.price ?? 0) * c.qty, 0);

  return (
    <div className="lk-complete">
      <span className="lk-complete__check" aria-hidden="true">
        <IconCheck size={56} />
      </span>
      <h1 className="lk-complete__title">주문이 완료되었습니다</h1>
      <p className="lk-complete__dine">
        {dining === "togo" ? "포장 주문입니다. 카운터에서 받아 가세요." : "매장 식사 주문입니다. 잠시 후 준비해 드리겠습니다."}
      </p>

      <p className="lk-complete__no-label">주문 번호</p>
      <p className="lk-complete__no">{orderNo}</p>

      {cart.length > 0 ? (
        <div className="lk-receipt" aria-label="주문 내역">
          {cart.map((c) => {
            const m = menuById(menu, c.id);
            if (!m) return null;
            return (
              <div key={c.id} className="lk-receipt__row">
                <span>
                  {menuDisplayName(m)} × {c.qty}
                </span>
                <span>{(m.price * c.qty).toLocaleString("ko-KR")}원</span>
              </div>
            );
          })}
          <div className="lk-receipt__row lk-receipt__row--total">
            <span>합계</span>
            <span>{total.toLocaleString("ko-KR")}원</span>
          </div>
        </div>
      ) : null}

      <p className="lk-complete__hint">카운터 화면에 번호가 표시되면 받아 가세요.</p>

      {/* 정직성: 실제 결제·조리가 아닌 시연용 모의 주문임을 분명히 밝힌다 */}
      <p className="lk-complete__demo">체험용 시연입니다 · 실제 결제와 조리는 이루어지지 않습니다</p>

      <button type="button" className="lk-complete__home" onClick={onHome}>
        처음으로 ({left}초 후 자동 이동)
      </button>
    </div>
  );
}
