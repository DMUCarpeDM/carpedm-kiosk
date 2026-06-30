import { useState, useEffect } from "react";
import { formatPrice, menuById } from "../api";
import {
  BottomActionButton,
  KioskHeader,
  MenuImage,
  OptionChip,
  QuantitySelector,
  SubtitleBar,
  ProgressBar,
} from "../components";
import type { MenuItem } from "../types";

const SIZES = [
  { key: "S", label: "S (기본)", extra: 0 },
  { key: "M", label: "M (+500원)", extra: 500 },
  { key: "L", label: "L (+1,000원)", extra: 1000 },
] as const;

type Props = {
  menuId: string;
  menu: MenuItem[];
  qty: number;
  onQtyChange: (qty: number) => void;
  onOrder: (extrasTotal: number) => void; // Pass extra price adjustments if any
  onBack: () => void;
  largeText: boolean;
  onToggleFontSize: () => void;
  speakWithSubtitle: (text: string, onEnd?: () => void) => void;
  subtitleText: string;
};

export function MenuDetailScreen({
  menuId,
  menu,
  qty,
  onQtyChange,
  onOrder,
  onBack,
  largeText,
  onToggleFontSize,
  speakWithSubtitle,
  subtitleText,
}: Props) {
  const [size, setSize] = useState<(typeof SIZES)[number]["key"]>("S");
  const [shot, setShot] = useState(false);
  const [syrup, setSyrup] = useState(false);

  const item = menuById(menu, menuId);

  // Announce the screen and item when opened
  useEffect(() => {
    if (item) {
      speakWithSubtitle(`${item.easy_name} 화면입니다. 수량을 조절하시거나 아래 주문하기 버튼을 눌러 주세요.`);
    }
  }, [menuId, item]);

  if (!item) {
    return (
      <div className="screen">
        <KioskHeader
          largeText={largeText}
          onToggleFontSize={onToggleFontSize}
          onBack={onBack}
        />
        <p className="error-text">메뉴를 찾을 수 없어요.</p>
      </div>
    );
  }

  const isDrink = item.category === "마실 것";
  const sizeExtra = isDrink ? (SIZES.find((s) => s.key === size)?.extra ?? 0) : 0;
  const extras = isDrink ? ((shot ? 500 : 0) + (syrup ? 500 : 0)) : 0;
  const unitPrice = item.price + sizeExtra + extras;
  const total = unitPrice * qty;

  return (
    <div className="screen screen--menu-detail">
      <KioskHeader
        largeText={largeText}
        onToggleFontSize={onToggleFontSize}
        onBack={onBack}
        onReplay={() => {
          speakWithSubtitle(`${item.easy_name} 화면입니다. 수량을 조절하시거나 아래 주문하기 버튼을 눌러 주세요.`);
        }}
      />
      <main className="detail-layout">
        <div className="detail-layout__hero">
          <div className="detail-layout__image">
            <MenuImage item={item} />
          </div>
          <div className="detail-layout__info">
            <h2 className="detail-layout__name" style={{ fontSize: "var(--fz-title)", fontWeight: "800" }}>{item.easy_name}</h2>
            {item.original_name ? (
              <p className="detail-layout__sub">{item.original_name}</p>
            ) : null}
            <p className="detail-layout__price">{formatPrice(item.price)}</p>
          </div>
        </div>

        {/* Display options ONLY for drinks */}
        {isDrink ? (
          <>
            <section className="detail-section" aria-label="사이즈 선택">
              <h3 className="detail-section__title">사이즈 선택</h3>
              <div className="detail-section__chips">
                {SIZES.map((s) => (
                  <OptionChip
                    key={s.key}
                    label={s.label}
                    selected={size === s.key}
                    onClick={() => setSize(s.key)}
                  />
                ))}
              </div>
            </section>

            <section className="detail-section" aria-label="추가 옵션">
              <h3 className="detail-section__title">추가 옵션</h3>
              <div className="detail-section__checks">
                <label className="detail-check">
                  <input type="checkbox" checked={shot} onChange={(e) => setShot(e.target.checked)} />
                  <span>샷 추가 (+500원)</span>
                </label>
                <label className="detail-check" style={{ marginTop: "12px" }}>
                  <input type="checkbox" checked={syrup} onChange={(e) => setSyrup(e.target.checked)} />
                  <span>시럽 추가 (+500원)</span>
                </label>
              </div>
            </section>
          </>
        ) : null}

        <div className="detail-footer">
          <div className="detail-footer__qty">
            <span className="detail-footer__qty-label">수량</span>
            <QuantitySelector qty={qty} onChange={onQtyChange} />
          </div>
          <p className="detail-footer__total">최종 금액: {formatPrice(total)}</p>
          <BottomActionButton variant="primary" label="이걸로 주문 담기" onClick={() => onOrder(sizeExtra + extras)} />
        </div>
      </main>

      {/* Subtitle bar overlay */}
      <SubtitleBar text={subtitleText} />

      {/* Progress tracker */}
      <ProgressBar currentStep="order" />
    </div>
  );
}
