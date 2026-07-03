import { useEffect, useState } from "react";
import { menuById, menuDisplayName } from "../api";
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

  useEffect(() => {
    const tick = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (left <= 0) onHome();
  }, [left, onHome]);

  const total = cart.reduce((sum, c) => sum + (menuById(menu, c.id)?.price ?? 0) * c.qty, 0);

  return (
    <div className="lk-complete">
      <span className="lk-complete__check" aria-hidden="true">✓</span>
      <h1 className="lk-complete__title">주문이 완료되었습니다</h1>
      <p className="lk-complete__dine">
        {dining === "togo" ? "포장 주문이에요. 카운터에서 받아 가세요." : "매장 식사예요. 자리에 앉아 계세요."}
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

      <p className="lk-complete__hint">번호가 화면에 뜨면 카운터에서 받아 가세요.</p>

      <button type="button" className="lk-complete__home" onClick={onHome}>
        처음 화면으로 ({left}초 후 자동 이동)
      </button>
    </div>
  );
}
