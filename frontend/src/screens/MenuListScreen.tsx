import { useMemo, useRef, useState } from "react";
import { formatMenuPrice, menuDisplayName } from "../api";
import { menuImageSrc } from "../menuImages";
import type { CartItem, MenuItem } from "../types";

const CATEGORIES = [
  { id: "recommend", label: "추천메뉴" },
  { id: "burger", label: "햄버거" },
  { id: "dessert", label: "디저트/치킨" },
  { id: "drink", label: "음료/커피" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];
const ITEMS_PER_PAGE = 8;

type Props = {
  items: MenuItem[];
  cart: CartItem[];
  onSelect: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onPay: () => void;
};

function itemCategory(item: MenuItem): CategoryId {
  if (item.category === "햄버거") return "burger";
  if (item.category === "치킨" || item.category === "먹을 것") return "dessert";
  return "drink";
}

function filterByCategory(items: MenuItem[], catId: CategoryId): MenuItem[] {
  if (catId === "recommend") return items.filter((i) => i.popular);
  return items.filter((i) => itemCategory(i) === catId);
}

function getBadge(item: MenuItem): "NEW" | "BEST" | null {
  if (item.tags?.includes("신메뉴")) return "NEW";
  if (item.popular) return "BEST";
  return null;
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

export function MenuListScreen({ items, cart, onSelect, onUpdateQty, onRemoveItem, onBack, onCancel, onPay }: Props) {
  const [catIdx, setCatIdx] = useState(1);
  const [page, setPage] = useState(0);
  const catScrollRef = useRef<HTMLDivElement>(null);

  const catId = CATEGORIES[catIdx].id;
  const filtered = useMemo(() => filterByCategory(items, catId), [items, catId]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const { count, total } = cartSummary(cart, items);

  const goCategory = (idx: number) => {
    setCatIdx(idx);
    setPage(0);
  };

  const scrollCats = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(CATEGORIES.length - 1, catIdx + dir));
    goCategory(next);
    catScrollRef.current?.children[next]?.scrollIntoView({ inline: "center", block: "nearest" });
  };

  return (
    <div className="screen screen--lotte-menu">
      <div className="lotte-menu-banner">
        <img src="/rsc/lotteria_header2.png" alt="롯데리아 프로모션" className="lotte-menu-banner__img" />
      </div>

      <nav className="lotte-cat-nav" aria-label="메뉴 카테고리">
        <button type="button" className="lotte-cat-nav__arrow" onClick={() => scrollCats(-1)} aria-label="이전 카테고리">
          ‹
        </button>
        <div className="lotte-cat-nav__tabs" ref={catScrollRef}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              type="button"
              className={`lotte-cat-nav__tab ${i === catIdx ? "lotte-cat-nav__tab--active" : ""}`}
              onClick={() => goCategory(i)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button type="button" className="lotte-cat-nav__arrow" onClick={() => scrollCats(1)} aria-label="다음 카테고리">
          ›
        </button>
      </nav>

      <main className="lotte-menu-body">
        <button
          type="button"
          className="lotte-menu-page-btn lotte-menu-page-btn--prev"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label="이전 페이지"
        >
          이전
        </button>

        <div className="lotte-menu-grid-wrap">
          <div className="lotte-menu-grid">
            {pageItems.map((item) => {
              const badge = getBadge(item);
              return (
                <button key={item.id} type="button" className="lotte-menu-item" onClick={() => onSelect(item.id)}>
                  <div className="lotte-menu-item__img-wrap">
                    {badge ? (
                      <span className={`lotte-menu-item__badge lotte-menu-item__badge--${badge.toLowerCase()}`}>
                        {badge}
                      </span>
                    ) : null}
                    <img
                      src={menuImageSrc(item)}
                      alt=""
                      className="lotte-menu-item__img"
                    />
                  </div>
                  <div className="lotte-menu-item__info">
                    <span className="lotte-menu-item__name">{menuDisplayName(item)}</span>
                    <span className="lotte-menu-item__price">{formatMenuPrice(item.price)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {pageCount > 1 ? (
            <div className="lotte-menu-dots" aria-label="페이지">
              {Array.from({ length: pageCount }, (_, i) => (
                <span key={i} className={`lotte-menu-dots__dot ${i === page ? "lotte-menu-dots__dot--active" : ""}`} />
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="lotte-menu-page-btn lotte-menu-page-btn--next"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={page >= pageCount - 1}
          aria-label="다음 페이지"
        >
          다음
        </button>
      </main>

      <section className="lotte-order-section" aria-label="총주문내역">
        <div className="lotte-order-bar">
          <span className="lotte-order-bar__label">총주문내역</span>
          <span className="lotte-order-bar__count">
            <strong>{count}</strong> 개
          </span>
          <span className="lotte-order-bar__total">{new Intl.NumberFormat("ko-KR").format(total)}</span>
        </div>

        <div className="lotte-order-list" aria-live="polite">
          {cart.length === 0 ? (
            <p className="lotte-order-list__empty">선택한 메뉴가 없습니다</p>
          ) : (
            <ul className="lotte-order-list__rows">
              {cart.map((c) => {
                const m = items.find((i) => i.id === c.id);
                if (!m) return null;
                const lineTotal = m.price * c.qty;
                return (
                  <li key={c.id} className="lotte-order-row">
                    <span className="lotte-order-row__name">{menuDisplayName(m)}</span>
                    <div className="lotte-order-row__qty">
                      <button
                        type="button"
                        className="lotte-order-row__qty-btn"
                        onClick={() => onUpdateQty(c.id, c.qty - 1)}
                        aria-label={`${menuDisplayName(m)} 수량 줄이기`}
                      >
                        ▼
                      </button>
                      <span className="lotte-order-row__qty-num">{c.qty}</span>
                      <button
                        type="button"
                        className="lotte-order-row__qty-btn"
                        onClick={() => onUpdateQty(c.id, c.qty + 1)}
                        aria-label={`${menuDisplayName(m)} 수량 늘리기`}
                      >
                        ▲
                      </button>
                    </div>
                    <span className="lotte-order-row__price">{formatMenuPrice(lineTotal)}</span>
                    <button
                      type="button"
                      className="lotte-order-row__remove"
                      onClick={() => onRemoveItem(c.id)}
                      aria-label={`${menuDisplayName(m)} 삭제`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <footer className="lotte-menu-footer">
        <div className="lotte-menu-footer__a11y">
          <button type="button" className="lotte-menu-footer__a11y-btn" onClick={onBack} aria-label="처음으로">
            ↩
          </button>
          <span className="lotte-menu-footer__a11y-btn" aria-hidden="true">♿</span>
          <span className="lotte-menu-footer__a11y-btn" aria-hidden="true">🔍</span>
          <span className="lotte-menu-footer__a11y-btn" aria-hidden="true">🔊</span>
        </div>
        <div className="lotte-menu-footer__actions">
          <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--cancel" onClick={onCancel}>
            취소하기
          </button>
          <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--pay" onClick={onPay}>
            결제하기
          </button>
        </div>
      </footer>
    </div>
  );
}
