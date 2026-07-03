import { useState } from "react";
import { menuById, menuDisplayName, menuSubName } from "../api";
import { menuImageSrc } from "../menuImages";
import { QuantitySelector } from "../components";
import { IconCheck, IconWarning } from "../icons";
import { findSetVariant, findSingleVariant } from "../menuDetailConfig";
import type { MenuItem } from "../types";

type Props = {
  menuId: string;
  menu: MenuItem[];
  qty: number;
  onQtyChange: (qty: number) => void;
  /** 실제 담을 메뉴 id를 넘긴다 — 단품/세트 전환 시 id가 바뀔 수 있다 */
  onOrder: (id: string) => void;
  onBack: () => void;
};

/** 단품을 담을 때 세트 권유 (실기기의 '세트 업그레이드' 안내) */
function UpsellModal({
  single,
  set,
  onSet,
  onSingle,
}: {
  single: MenuItem;
  set: MenuItem;
  onSet: () => void;
  onSingle: () => void;
}) {
  const diff = set.price - single.price;
  return (
    <div className="lk-modal-wrap" role="dialog" aria-modal="true" aria-label="세트 안내">
      <div className="lk-modal">
        <h2 className="lk-modal__title">세트로 드시면 어떠세요?</h2>
        <p className="lk-modal__sub">
          {diff.toLocaleString("ko-KR")}원만 더 내시면
          <br />
          감자 튀김과 콜라가 함께 나와요.
        </p>
        <div className="lk-modal__imgs" aria-hidden="true">
          <img src={menuImageSrc(single)} alt="" />
          <span className="lk-modal__plus">+</span>
          <img src="/menu/products/fries.png" alt="" />
          <span className="lk-modal__plus">+</span>
          <img src="/menu/products/cola.png" alt="" />
        </div>
        <div className="lk-modal__actions">
          <button type="button" className="lk-modal__btn lk-modal__btn--yes" onClick={onSet}>
            좋아요, 세트로 주세요 ({set.price.toLocaleString("ko-KR")}원)
          </button>
          <button type="button" className="lk-modal__btn lk-modal__btn--no" onClick={onSingle}>
            아니요, 단품만 주세요 ({single.price.toLocaleString("ko-KR")}원)
          </button>
        </div>
      </div>
    </div>
  );
}

export function MenuDetailScreen({ menuId, menu, qty, onQtyChange, onOrder, onBack }: Props) {
  const item = menuById(menu, menuId);
  const [chosenId, setChosenId] = useState(menuId);
  const [showUpsell, setShowUpsell] = useState(false);

  const chosen = menuById(menu, chosenId) ?? item;

  if (!item || !chosen) {
    return (
      <div className="lk-detail">
        <div className="lk-pagehead">
          <button type="button" className="lk-pagehead__back" onClick={onBack} aria-label="뒤로">
            ←
          </button>
          <h1 className="lk-pagehead__title">메뉴 상세</h1>
        </div>
        <div className="lk-error">
          <p className="lk-error__text">메뉴를 찾을 수 없어요.</p>
        </div>
      </div>
    );
  }

  const setVariant = findSetVariant(menu, item) ?? (findSingleVariant(menu, item) ? item : null);
  const singleVariant = findSingleVariant(menu, item) ?? (findSetVariant(menu, item) ? item : null);
  const canChooseSet = Boolean(setVariant && singleVariant);

  const allergens = chosen.allergens ?? [];
  const setIncludes = chosen.set_includes ?? [];
  const origin = chosen.origin ?? [];
  const total = chosen.price * qty;

  const handleOrder = () => {
    // 단품 버거를 담을 때 세트가 있으면 한 번만 권유한다
    if (canChooseSet && singleVariant && setVariant && chosen.id === singleVariant.id && chosen.category === "햄버거") {
      setShowUpsell(true);
      return;
    }
    onOrder(chosen.id);
  };

  return (
    <div className="lk-detail">
      <div className="lk-pagehead">
        <button type="button" className="lk-pagehead__back" onClick={onBack} aria-label="메뉴판으로">
          ←
        </button>
        <h1 className="lk-pagehead__title">{menuDisplayName(chosen)}</h1>
      </div>

      <div className="lk-detail__body">
        <div className="lk-detail__hero">
          <div className="lk-detail__photo">
            <img src={menuImageSrc(chosen)} alt="" />
          </div>
          <div>
            <h2 className="lk-detail__name">{menuDisplayName(chosen)}</h2>
            {menuSubName(chosen) ? <p className="lk-detail__sub">{menuSubName(chosen)}</p> : null}
            {chosen.desc ? <p className="lk-detail__desc">{chosen.desc}</p> : null}
            {typeof chosen.kcal === "number" ? (
              <p className="lk-detail__kcal">열량 {chosen.kcal.toLocaleString("ko-KR")}kcal</p>
            ) : null}
            <p className="lk-detail__price">{chosen.price.toLocaleString("ko-KR")}원</p>
          </div>
        </div>

        {canChooseSet && singleVariant && setVariant ? (
          <section className="lk-section" aria-label="주문 유형">
            <h3 className="lk-section__title">단품과 세트 중 골라 주세요</h3>
            <div className="lk-seg">
              <button
                type="button"
                className={`lk-seg__btn ${chosenId === singleVariant.id ? "lk-seg__btn--on" : ""}`}
                onClick={() => setChosenId(singleVariant.id)}
                aria-pressed={chosenId === singleVariant.id}
              >
                <span className="lk-seg__label">단품</span>
                <span className="lk-seg__price">{singleVariant.price.toLocaleString("ko-KR")}원</span>
              </button>
              <button
                type="button"
                className={`lk-seg__btn ${chosenId === setVariant.id ? "lk-seg__btn--on" : ""}`}
                onClick={() => setChosenId(setVariant.id)}
                aria-pressed={chosenId === setVariant.id}
              >
                <span className="lk-seg__label">세트 (감자+콜라)</span>
                <span className="lk-seg__price">{setVariant.price.toLocaleString("ko-KR")}원</span>
              </button>
            </div>
          </section>
        ) : null}

        {setIncludes.length > 0 && singleVariant ? (
          <section className="lk-section" aria-label="세트 구성">
            <h3 className="lk-section__title">세트 구성</h3>
            <div className="lk-includes">
              <span className="lk-includes__item">
                <img src={menuImageSrc(singleVariant)} alt="" />
                <span>버거</span>
              </span>
              <span className="lk-includes__plus" aria-hidden="true">+</span>
              <span className="lk-includes__item">
                <img src="/menu/products/fries.png" alt="" />
                <span>감자 튀김</span>
              </span>
              <span className="lk-includes__plus" aria-hidden="true">+</span>
              <span className="lk-includes__item">
                <img src="/menu/products/cola.png" alt="" />
                <span>콜라</span>
              </span>
            </div>
          </section>
        ) : null}

        <section className="lk-section" aria-label="알레르기 및 원산지">
          <h3 className="lk-section__title">드시기 전에 확인해 주세요</h3>
          {allergens.length > 0 ? (
            <div className="lk-allergy">
              <span className="lk-allergy__icon">
                <IconWarning size={28} />
              </span>
              <p className="lk-allergy__text">
                알레르기 주의: {allergens.join(", ")}이(가) 들어 있어요.
                <br />
                결제 전에 한 번 더 확인해 드릴게요.
              </p>
            </div>
          ) : (
            <div className="lk-allergy lk-allergy--safe">
              <span className="lk-allergy__icon">
                <IconCheck size={28} />
              </span>
              <p className="lk-allergy__text">주요 알레르기 유발 성분이 없어요.</p>
            </div>
          )}
          {origin.length > 0 ? <p className="lk-origin">원산지: {origin.join(" · ")}</p> : null}
        </section>

        <section className="lk-section lk-qty-row" aria-label="수량">
          <h3 className="lk-section__title" style={{ margin: 0 }}>수량</h3>
          <QuantitySelector qty={qty} onChange={onQtyChange} />
        </section>
      </div>

      <div className="lk-paybar">
        <button type="button" className="lk-paybar__btn lk-paybar__btn--ghost" onClick={onBack}>
          이전으로
        </button>
        <button type="button" className="lk-paybar__btn lk-paybar__btn--pay" onClick={handleOrder}>
          {total.toLocaleString("ko-KR")}원 · 담기
        </button>
      </div>

      {showUpsell && singleVariant && setVariant ? (
        <UpsellModal
          single={singleVariant}
          set={setVariant}
          onSet={() => {
            setShowUpsell(false);
            onOrder(setVariant.id);
          }}
          onSingle={() => {
            setShowUpsell(false);
            onOrder(singleVariant.id);
          }}
        />
      ) : null}
    </div>
  );
}
