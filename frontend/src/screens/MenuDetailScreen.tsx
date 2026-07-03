import { useMemo, useState, type ReactNode } from "react";
import { formatMenuPrice, formatPrice, menuById, menuDisplayName, menuSubName } from "../api";
import { menuImageSrc } from "../menuImages";
import { OptionChip, QuantitySelector } from "../components";
import {
  classifyMenuItem,
  findSetVariant,
  findSingleVariant,
  kindLabel,
} from "../menuDetailConfig";
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

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lotte-detail-section" aria-label={title}>
      <h3 className="lotte-detail-section__title">{title}</h3>
      {children}
    </section>
  );
}

export function MenuDetailScreen({ menuId, menu, qty, onQtyChange, onOrder, onBack }: Props) {
  const item = menuById(menu, menuId);
  const classification = item ? classifyMenuItem(item) : null;

  // 단품 ↔ 세트 전환: 화면에 열린 항목과 상관없이 "지금 선택된 실제 메뉴"를 추적한다
  const [chosenId, setChosenId] = useState(menuId);

  const chosen = menuById(menu, chosenId) ?? item;
  const setVariant = item ? (findSetVariant(menu, item) ?? (findSingleVariant(menu, item) ? item : null)) : null;
  const singleVariant = item ? (findSingleVariant(menu, item) ?? (findSetVariant(menu, item) ? item : null)) : null;

  const unitPrice = chosen?.price ?? 0;
  const total = useMemo(() => unitPrice * qty, [unitPrice, qty]);

  if (!item || !classification || !chosen) {
    return (
      <div className="screen screen--lotte-page">
        <div className="lotte-page-top">
          <button type="button" className="lotte-page-top__back" onClick={onBack} aria-label="뒤로">
            ‹
          </button>
          <h1 className="lotte-page-top__title">메뉴 상세</h1>
        </div>
        <p className="lotte-error-text">메뉴를 찾을 수 없어요.</p>
      </div>
    );
  }

  const { kind } = classifyMenuItem(chosen);
  const canChooseSet = Boolean(setVariant && singleVariant);
  const allergens = chosen.allergens ?? [];
  const setIncludes = chosen.set_includes ?? [];

  return (
    <div className="screen screen--lotte-page screen--lotte-detail">
      <div className="lotte-menu-banner lotte-menu-banner--compact">
        <img src="/rsc/lotteria_header2.png" alt="" className="lotte-menu-banner__img" />
      </div>

      <header className="lotte-page-top">
        <button type="button" className="lotte-page-top__back" onClick={onBack} aria-label="메뉴 목록으로">
          ‹
        </button>
        <h1 className="lotte-page-top__title">{menuDisplayName(chosen)}</h1>
      </header>

      <main className="lotte-detail-body">
        <div className="lotte-detail-hero">
          <div className="lotte-detail-hero__img-wrap">
            <img src={menuImageSrc(chosen)} alt="" className="lotte-detail-hero__img" />
          </div>
          <div className="lotte-detail-hero__info">
            <h2 className="lotte-detail-hero__name">{menuDisplayName(chosen)}</h2>
            {menuSubName(chosen) ? <p className="lotte-detail-hero__sub">{menuSubName(chosen)}</p> : null}
            <p className="lotte-detail-hero__price">{formatMenuPrice(chosen.price)}</p>
            <p className="lotte-detail-hero__kind">{kindLabel(kind)}</p>
          </div>
        </div>

        {canChooseSet && setVariant && singleVariant ? (
          <DetailSection title="주문 유형">
            <div className="lotte-detail-section__chips">
              <OptionChip
                label={`단품 ${formatMenuPrice(singleVariant.price)}`}
                selected={chosenId === singleVariant.id}
                onClick={() => setChosenId(singleVariant.id)}
              />
              <OptionChip
                label={`세트 ${formatMenuPrice(setVariant.price)}`}
                selected={chosenId === setVariant.id}
                onClick={() => setChosenId(setVariant.id)}
              />
            </div>
          </DetailSection>
        ) : null}

        {setIncludes.length > 0 ? (
          <DetailSection title="세트 구성">
            <p className="lotte-detail-note">버거 + {setIncludes.join(" + ")}</p>
          </DetailSection>
        ) : null}

        {allergens.length > 0 ? (
          <DetailSection title="알레르기 주의">
            <p className="lotte-detail-note lotte-detail-note--allergy">{allergens.join(", ")} 이(가) 들어 있어요.</p>
          </DetailSection>
        ) : null}

        <div className="lotte-detail-qty">
          <span className="lotte-detail-qty__label">수량</span>
          <QuantitySelector qty={qty} onChange={onQtyChange} />
        </div>
      </main>

      <div className="lotte-order-bar">
        <span className="lotte-order-bar__label">합계</span>
        <span className="lotte-order-bar__count">
          <strong>{qty}</strong> 개
        </span>
        <span className="lotte-order-bar__total">{formatPrice(total)}</span>
      </div>

      <footer className="lotte-menu-footer">
        <div className="lotte-menu-footer__a11y">
          <button type="button" className="lotte-menu-footer__a11y-btn" onClick={onBack} aria-label="목록으로">
            ↩
          </button>
          <span className="lotte-menu-footer__a11y-btn" aria-hidden="true">♿</span>
          <span className="lotte-menu-footer__a11y-btn" aria-hidden="true">🔍</span>
          <span className="lotte-menu-footer__a11y-btn" aria-hidden="true">🔊</span>
        </div>
        <div className="lotte-menu-footer__actions">
          <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--cancel" onClick={onBack}>
            취소하기
          </button>
          <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--pay" onClick={() => onOrder(chosen.id)}>
            담기
          </button>
        </div>
      </footer>
    </div>
  );
}
