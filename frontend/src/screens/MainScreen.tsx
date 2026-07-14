import { IconDineIn, IconTakeout } from "../icons";
import type { DiningOption } from "../types";

type Props = {
  onSelect: (dining: DiningOption) => void;
};

/** 시작 화면 — 실기기와 동일하게 식사 장소부터 묻는다 (한 화면 = 한 질문) */
export function MainScreen({ onSelect }: Props) {
  return (
    <div className="lk-start">
      <div className="lk-start__hero">
        <p className="lk-start__tag">어서 오세요</p>
        <h1 className="lk-start__question">어디에서 드시겠어요?</h1>
      </div>

      <div className="lk-start__choices">
        <button type="button" className="lk-choice" onClick={() => onSelect("store")}>
          <span className="lk-choice__icon lk-choice__icon--store">
            <IconDineIn size={84} />
          </span>
          <span className="lk-choice__label">매장에서
먹고 가요</span>
          <span className="lk-choice__sub">매장 이용</span>
        </button>
        <button type="button" className="lk-choice" onClick={() => onSelect("togo")}>
          <span className="lk-choice__icon lk-choice__icon--togo">
            <IconTakeout size={84} />
          </span>
          <span className="lk-choice__label">포장해서
가져가요</span>
          <span className="lk-choice__sub">가지고 가기</span>
        </button>
      </div>

      <p className="lk-start__hint">화면을 눌러 선택해 주세요</p>
    </div>
  );
}
