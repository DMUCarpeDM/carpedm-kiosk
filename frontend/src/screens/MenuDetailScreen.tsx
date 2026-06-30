import { useMemo, useState, type ReactNode } from "react";
import { formatMenuPrice, formatPrice, menuById, menuDisplayName, menuSubName } from "../api";
import { menuImageSrc } from "../menuImages";
import { OptionChip, QuantitySelector } from "../components";
import {
  BURGER_EXTRAS,
  BURGER_ORDER_TYPES,
  BURGER_SIDES,
  CHICKEN_ORDER_TYPES,
  CHICKEN_SAUCES,
  CHICKEN_SIDES,
  COFFEE_EXTRAS,
  DESSERT_EXTRAS,
  DRINK_SIZES,
  ICE_LEVELS,
  SET_DRINKS,
  calcUnitPrice,
  classifyMenuItem,
  defaultBurgerState,
  defaultChickenState,
  defaultDessertState,
  defaultDrinkState,
  toggleSet,
  type BurgerDetailState,
  type ChickenDetailState,
  type DessertDetailState,
  type DrinkDetailState,
} from "../menuDetailConfig";
import type { MenuItem } from "../types";

type Props = {
  menuId: string;
  menu: MenuItem[];
  qty: number;
  onQtyChange: (qty: number) => void;
  onOrder: () => void;
  onBack: () => void;
};

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="lotte-detail-section" aria-label={title}>
      <h3 className="lotte-detail-section__title">{title}</h3>
      {children}
    </section>
  );
}

function CheckOptions({
  options,
  selected,
  onToggle,
}: {
  options: readonly { key: string; label: string; extra: number }[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="lotte-detail-section__checks">
      {options.map((opt) => (
        <label key={opt.key} className="lotte-detail-check">
          <input
            type="checkbox"
            checked={selected.has(opt.key)}
            onChange={() => onToggle(opt.key)}
          />
          <span>
            {opt.label}
            {opt.extra > 0 ? ` +${opt.extra.toLocaleString("ko-KR")}원` : ""}
          </span>
        </label>
      ))}
    </div>
  );
}

function ChipOptions({
  options,
  selected,
  onSelect,
}: {
  options: readonly { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="lotte-detail-section__chips">
      {options.map((opt) => (
        <OptionChip
          key={opt.key}
          label={opt.label}
          selected={selected === opt.key}
          onClick={() => onSelect(opt.key)}
        />
      ))}
    </div>
  );
}

export function MenuDetailScreen({
  menuId,
  menu,
  qty,
  onQtyChange,
  onOrder,
  onBack,
}: Props) {
  const item = menuById(menu, menuId);
  const classification = item ? classifyMenuItem(item) : null;

  const [burger, setBurger] = useState<BurgerDetailState>(defaultBurgerState);
  const [chicken, setChicken] = useState<ChickenDetailState>(defaultChickenState);
  const [drink, setDrink] = useState<DrinkDetailState>(() =>
    item ? defaultDrinkState(item) : { size: "R", ice: "normal", extras: new Set() },
  );
  const [dessert, setDessert] = useState<DessertDetailState>(defaultDessertState);

  const unitPrice = useMemo(() => {
    if (!item || !classification) return 0;
    return calcUnitPrice(
      item,
      classification.kind,
      classification.drinkSubtype,
      burger,
      chicken,
      drink,
      dessert,
    );
  }, [item, classification, burger, chicken, drink, dessert]);

  if (!item || !classification) {
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

  const total = unitPrice * qty;
  const { kind, drinkSubtype } = classification;
  const showIce = kind === "drink" && (drinkSubtype === "carbonated" || item.temp === "ice");
  const showCoffeeExtras = kind === "drink" && drinkSubtype === "coffee";

  return (
    <div className="screen screen--lotte-page screen--lotte-detail">
      <div className="lotte-menu-banner lotte-menu-banner--compact">
        <img src="/rsc/lotteria_header2.png" alt="" className="lotte-menu-banner__img" />
      </div>

      <header className="lotte-page-top">
        <button type="button" className="lotte-page-top__back" onClick={onBack} aria-label="메뉴 목록으로">
          ‹
        </button>
        <h1 className="lotte-page-top__title">{menuDisplayName(item)}</h1>
      </header>

      <main className="lotte-detail-body">
        <div className="lotte-detail-hero">
          <div className="lotte-detail-hero__img-wrap">
            <img src={menuImageSrc(item)} alt="" className="lotte-detail-hero__img" />
          </div>
          <div className="lotte-detail-hero__info">
            <h2 className="lotte-detail-hero__name">{menuDisplayName(item)}</h2>
            {menuSubName(item) ? <p className="lotte-detail-hero__sub">{menuSubName(item)}</p> : null}
            <p className="lotte-detail-hero__price">{formatMenuPrice(item.price)}</p>
            <p className="lotte-detail-hero__kind">
              {kind === "burger" && "햄버거"}
              {kind === "chicken" && "치킨"}
              {kind === "drink" && "음료"}
              {kind === "dessert" && "디저트"}
            </p>
          </div>
        </div>

        {kind === "burger" ? (
          <>
            <DetailSection title="주문 유형">
              <ChipOptions
                options={BURGER_ORDER_TYPES}
                selected={burger.orderType}
                onSelect={(key) =>
                  setBurger((s) => ({
                    ...s,
                    orderType: key as BurgerDetailState["orderType"],
                  }))
                }
              />
            </DetailSection>

            {burger.orderType === "set" ? (
              <DetailSection title="세트 음료 선택">
                <ChipOptions
                  options={SET_DRINKS}
                  selected={burger.setDrink}
                  onSelect={(key) =>
                    setBurger((s) => ({
                      ...s,
                      setDrink: key as BurgerDetailState["setDrink"],
                    }))
                  }
                />
              </DetailSection>
            ) : null}

            <DetailSection title="버거 변경">
              <CheckOptions
                options={BURGER_EXTRAS}
                selected={burger.extras}
                onToggle={(key) => setBurger((s) => ({ ...s, extras: toggleSet(s.extras, key) }))}
              />
            </DetailSection>

            <DetailSection title="사이드 추가">
              <CheckOptions
                options={BURGER_SIDES}
                selected={burger.sides}
                onToggle={(key) => setBurger((s) => ({ ...s, sides: toggleSet(s.sides, key) }))}
              />
            </DetailSection>
          </>
        ) : null}

        {kind === "chicken" ? (
          <>
            <DetailSection title="주문 유형">
              <ChipOptions
                options={CHICKEN_ORDER_TYPES}
                selected={chicken.orderType}
                onSelect={(key) =>
                  setChicken((s) => ({
                    ...s,
                    orderType: key as ChickenDetailState["orderType"],
                  }))
                }
              />
            </DetailSection>

            <DetailSection title="소스 선택">
              <ChipOptions
                options={CHICKEN_SAUCES}
                selected={chicken.sauce}
                onSelect={(key) =>
                  setChicken((s) => ({
                    ...s,
                    sauce: key as ChickenDetailState["sauce"],
                  }))
                }
              />
            </DetailSection>

            <DetailSection title="사이드 추가">
              <CheckOptions
                options={CHICKEN_SIDES}
                selected={chicken.sides}
                onToggle={(key) => setChicken((s) => ({ ...s, sides: toggleSet(s.sides, key) }))}
              />
            </DetailSection>
          </>
        ) : null}

        {kind === "drink" ? (
          <>
            <DetailSection title="사이즈">
              <ChipOptions
                options={DRINK_SIZES}
                selected={drink.size}
                onSelect={(key) =>
                  setDrink((s) => ({ ...s, size: key as DrinkDetailState["size"] }))
                }
              />
            </DetailSection>

            {showIce ? (
              <DetailSection title="얼음량">
                <ChipOptions
                  options={ICE_LEVELS}
                  selected={drink.ice}
                  onSelect={(key) =>
                    setDrink((s) => ({ ...s, ice: key as DrinkDetailState["ice"] }))
                  }
                />
              </DetailSection>
            ) : null}

            {showCoffeeExtras ? (
              <DetailSection title="추가 옵션">
                <CheckOptions
                  options={COFFEE_EXTRAS}
                  selected={drink.extras}
                  onToggle={(key) => setDrink((s) => ({ ...s, extras: toggleSet(s.extras, key) }))}
                />
              </DetailSection>
            ) : null}
          </>
        ) : null}

        {kind === "dessert" ? (
          <DetailSection title="추가 토핑">
            <CheckOptions
              options={DESSERT_EXTRAS}
              selected={dessert.extras}
              onToggle={(key) => setDessert((s) => ({ ...s, extras: toggleSet(s.extras, key) }))}
            />
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
          <button type="button" className="lotte-menu-footer__btn lotte-menu-footer__btn--pay" onClick={onOrder}>
            담기
          </button>
        </div>
      </footer>
    </div>
  );
}
