import { useMemo, useState } from "react";
import { menuDisplayName } from "../api";
import { IconMic, ProductCard } from "../components";
import type { CartItem, MenuItem } from "../types";

const CATEGORIES = [
  { id: "recommend", label: "추천메뉴" },
  { id: "set", label: "세트" },
  { id: "burger", label: "햄버거" },
  { id: "chicken", label: "치킨" },
  { id: "side", label: "사이드" },
  { id: "dessert-drink", label: "디저트·음료" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];
const ITEMS_PER_PAGE = 6;

type Props = {
  items: MenuItem[];
  cart: CartItem[];
  onSelect: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onVoice: () => void;
  onPay: () => void;
};

function itemCategory(item: MenuItem): CategoryId {
  if (item.category === "세트") return "set";
  if (item.category === "햄버거") return "burger";
  if (item.category === "치킨") return "chicken";
  if (item.category === "사이드") return "side";
  return "dessert-drink";
}

function filterByCategory(items: MenuItem[], catId: CategoryId): MenuItem[] {
  if (catId === "recommend") return items.filter((i) => i.popular);
  return items.filter((i) => itemCategory(i) === catId);
}

function cartSummary(cart: CartItem[], items: MenuItem[]) {
  let count = 0;
  let total = 0;
  for (const c of cart) {
    const m = items.find((i) => i.id === c.id);
    if (m) {
      count += c.qty;
      total += m.price * c.qty;
    }
  }
  return { count, total };
}

export function MenuListScreen({
  items,
  cart,
  onSelect,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onVoice,
  onPay,
}: Props) {
  const [catIdx, setCatIdx] = useState(0);
  const [page, setPage] = useState(0);

  const catId = CATEGORIES[catIdx].id;
  const filtered = useMemo(() => filterByCategory(items, catId), [items, catId]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const { count, total } = cartSummary(cart, items);

  const goCategory = (idx: number) => {
    setCatIdx(idx);
    setPage(0);
  };

  return (
    <div className="lk-menu">
      <div className="lk-banner" aria-hidden="true">
        <img src="/rsc/lotteria_header2.png" alt="" />
      </div>

      <nav className="lk-cats" aria-label="메뉴 분류">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.id}
            type="button"
            className={`lk-cat ${i === catIdx ? "lk-cat--on" : ""}`}
            onClick={() => goCategory(i)}
            aria-pressed={i === catIdx}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <div className="lk-menu__body">
        <div className="lk-grid">
          {pageItems.map((item) => (
            <ProductCard key={item.id} item={item} onClick={() => onSelect(item.id)} />
          ))}
        </div>

        <div className="lk-pager">
          <button
            type="button"
            className="lk-pager__btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← 이전
          </button>
          <div className="lk-pager__dots" aria-label={`${pageCount}쪽 중 ${page + 1}쪽`}>
            {Array.from({ length: pageCount }, (_, i) => (
              <span key={i} className={`lk-pager__dot ${i === page ? "lk-pager__dot--on" : ""}`} />
            ))}
          </div>
          <button
            type="button"
            className="lk-pager__btn"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
          >
            다음 →
          </button>
        </div>
      </div>

      <section className="lk-cart" aria-label="주문 내역">
        <div className="lk-cart__head">
          <span className="lk-cart__title">주문 내역</span>
          <span className="lk-cart__total">
            {count}개 · <strong>{total.toLocaleString("ko-KR")}원</strong>
          </span>
        </div>
        <div className="lk-cart__rows" aria-live="polite">
          {cart.length === 0 ? (
            <p className="lk-cart__empty">선택한 메뉴가 없습니다. 사진을 눌러 담아 주세요.</p>
          ) : (
            cart.map((c) => {
              const m = items.find((i) => i.id === c.id);
              if (!m) return null;
              return (
                <div key={c.id} className="lk-cart-row">
                  <span className="lk-cart-row__name">{menuDisplayName(m)}</span>
                  <div className="lk-qty lk-qty--small">
                    <button
                      type="button"
                      className="lk-qty__btn"
                      onClick={() => onUpdateQty(c.id, c.qty - 1)}
                      aria-label={`${menuDisplayName(m)} 수량 줄이기`}
                    >
                      −
                    </button>
                    <span className="lk-qty__val">{c.qty}</span>
                    <button
                      type="button"
                      className="lk-qty__btn"
                      onClick={() => onUpdateQty(c.id, c.qty + 1)}
                      aria-label={`${menuDisplayName(m)} 수량 늘리기`}
                    >
                      +
                    </button>
                  </div>
                  <span className="lk-cart-row__price">{(m.price * c.qty).toLocaleString("ko-KR")}원</span>
                  <button
                    type="button"
                    className="lk-cart-row__del"
                    onClick={() => onRemoveItem(c.id)}
                    aria-label={`${menuDisplayName(m)} 빼기`}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="lk-paybar">
        <button type="button" className="lk-paybar__btn lk-paybar__btn--ghost" onClick={onClearCart} disabled={cart.length === 0}>
          전체 삭제
        </button>
        <button type="button" className="lk-paybar__btn lk-paybar__btn--pay" onClick={onPay} disabled={cart.length === 0}>
          {cart.length === 0 ? "메뉴를 선택해 주세요" : `${total.toLocaleString("ko-KR")}원 결제하기`}
        </button>
      </div>

      <button type="button" className="lk-mic-fab" onClick={onVoice}>
        <span className="lk-mic-fab__icon">
          <IconMic size={28} />
        </span>
        말로 주문
      </button>
    </div>
  );
}
