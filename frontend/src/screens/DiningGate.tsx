import { IconDineIn, IconTakeout } from "../icons";
import type { DiningOption } from "../types";

type Props = {
  onSelect: (dining: DiningOption) => void;
  onCancel: () => void;
};

/** 결제 직전 '매장/포장'을 묻는다 — 첫 화면의 부담을 줄이려 주문이 끝난 뒤로 옮겼다. */
export function DiningGate({ onSelect, onCancel }: Props) {
  return (
    <div className="lk-modal-wrap" role="dialog" aria-modal="true" aria-label="식사 장소 선택">
      <div className="lk-modal lk-modal--dining">
        <h2 className="lk-modal__title">어디에서 드시나요?</h2>
        <p className="lk-modal__sub">선택하시면 주문이 끝납니다.</p>

        <div className="lk-dining">
          <button type="button" className="lk-dining__btn" onClick={() => onSelect("store")}>
            <span className="lk-dining__icon">
              <IconDineIn size={64} />
            </span>
            <span className="lk-dining__label">매장에서 먹고 가요</span>
          </button>
          <button type="button" className="lk-dining__btn" onClick={() => onSelect("togo")}>
            <span className="lk-dining__icon">
              <IconTakeout size={64} />
            </span>
            <span className="lk-dining__label">포장해서 가져가요</span>
          </button>
        </div>

        <button type="button" className="lk-modal__cancel" onClick={onCancel}>
          이전으로
        </button>
      </div>
    </div>
  );
}
