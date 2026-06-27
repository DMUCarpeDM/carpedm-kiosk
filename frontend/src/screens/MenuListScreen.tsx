import { useMemo, useState } from "react";
import { formatPrice } from "../api";
import { KioskHeader, KioskHeaderSearch, MenuCard, MenuMoreCard } from "../components";
import type { MenuItem } from "../types";

const PREVIEW_COUNT = 5;

type Props = {
  items: MenuItem[];
  onSelect: (id: string) => void;
  onBack: () => void;
};

export function MenuListScreen({ items, onSelect, onBack }: Props) {
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const popular = items.filter((i) => i.popular);
    const rest = items.filter((i) => !i.popular);
    return [...popular, ...rest];
  }, [items]);

  const visible = showAll ? sorted : sorted.slice(0, PREVIEW_COUNT);

  return (
    <div className="screen screen--menu-list">
      <KioskHeader onBack={onBack} right={<KioskHeaderSearch />} />
      <main className="menu-grid-wrap">
        <div className="menu-grid">
          {visible.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              price={formatPrice(item.price)}
              onClick={() => onSelect(item.id)}
            />
          ))}
          {!showAll && sorted.length > PREVIEW_COUNT ? (
            <MenuMoreCard onClick={() => setShowAll(true)} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
