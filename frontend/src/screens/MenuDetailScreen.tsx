import { useState } from "react";
import { formatPrice, menuById } from "../api";
import {
  BottomActionButton,
  KioskHeader,
  MenuImage,
  OptionChip,
  QuantitySelector,
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
  onOrder: () => void;
  onBack: () => void;
};

export function MenuDetailScreen({
  menuId,
  menu,
  qty,
  onQtyChange,
  onOrder,
  onBack,
}: Props) {
  const [size, setSize] = useState<(typeof SIZES)[number]["key"]>("S");
  const [shot, setShot] = useState(false);
  const [syrup, setSyrup] = useState(false);

  const item = menuById(menu, menuId);
  if (!item) {
    return (
      <div className="screen">
        <KioskHeader onBack={onBack} />
        <p className="error-text">메뉴를 찾을 수 없어요.</p>
      </div>
    );
  }

  const sizeExtra = SIZES.find((s) => s.key === size)?.extra ?? 0;
  const extras = (shot ? 500 : 0) + (syrup ? 500 : 0);
  const unitPrice = item.price + sizeExtra + extras;
  const total = unitPrice * qty;

  return (
    <div className="screen screen--menu-detail">
      <KioskHeader onBack={onBack} />
      <main className="detail-layout">
        <div className="detail-layout__hero">
          <div className="detail-layout__image">
            <MenuImage item={item} />
          </div>
          <div className="detail-layout__info">
            <h2 className="detail-layout__name">{item.easy_name}</h2>
            {item.original_name ? (
              <p className="detail-layout__sub">{item.original_name}</p>
            ) : null}
            <p className="detail-layout__price">{formatPrice(item.price)}</p>
          </div>
        </div>

        <section className="detail-section" aria-label="사이즈 선택">
          <h3 className="detail-section__title">사이즈</h3>
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
              <span>샷 추가 +500원</span>
            </label>
            <label className="detail-check">
              <input type="checkbox" checked={syrup} onChange={(e) => setSyrup(e.target.checked)} />
              <span>시럽 추가 +500원</span>
            </label>
          </div>
        </section>

        <div className="detail-footer">
          <div className="detail-footer__qty">
            <span className="detail-footer__qty-label">수량</span>
            <QuantitySelector qty={qty} onChange={onQtyChange} />
          </div>
          <p className="detail-footer__total">합계 {formatPrice(total)}</p>
          <BottomActionButton variant="primary" label="이걸로 주문" onClick={onOrder} />
        </div>
      </main>
    </div>
  );
}
