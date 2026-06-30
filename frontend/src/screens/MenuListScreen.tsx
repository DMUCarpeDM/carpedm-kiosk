import { useMemo, useState } from "react";
import { formatPrice } from "../api";
import { KioskHeader, MenuCard, CategoryTabs, BottomActionButton, ProgressBar, SubtitleBar } from "../components";
import type { MenuItem, CartItem } from "../types";

type Props = {
  items: MenuItem[];
  cart: CartItem[];
  onSelect: (id: string) => void;
  onOrder: () => void;
  onBack: () => void;
  largeText: boolean;
  onToggleFontSize: () => void;
  speakWithSubtitle: (text: string, onEnd?: () => void) => void;
  subtitleText: string;
};

export function MenuListScreen({
  items,
  cart,
  onSelect,
  onOrder,
  onBack,
  largeText,
  onToggleFontSize,
  speakWithSubtitle,
  subtitleText,
}: Props) {
  const [activeTab, setActiveTab] = useState<"all" | "drinks" | "desserts">("all");

  const handleTabChange = (tab: "all" | "drinks" | "desserts") => {
    setActiveTab(tab);
    if (tab === "drinks") {
      speakWithSubtitle("마실 것 메뉴를 보여드릴게요.");
    } else if (tab === "desserts") {
      speakWithSubtitle("먹을 것 메뉴를 보여드릴게요.");
    } else {
      speakWithSubtitle("전체 메뉴를 보여드릴게요.");
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab === "drinks") {
      result = items.filter((i) => i.category === "마실 것");
    } else if (activeTab === "desserts") {
      result = items.filter((i) => i.category === "먹을 것");
    }

    // Sort popular items first
    const popular = result.filter((i) => i.popular);
    const rest = result.filter((i) => !i.popular);
    return [...popular, ...rest];
  }, [items, activeTab]);

  const cartMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cart) {
      map[c.id] = (map[c.id] || 0) + c.qty;
    }
    return map;
  }, [cart]);

  return (
    <div className="screen screen--menu-list">
      <KioskHeader
        largeText={largeText}
        onToggleFontSize={onToggleFontSize}
        onBack={onBack}
      />
      
      <main className="menu-grid-wrap" style={{ display: "flex", flexDirection: "column" }}>
        <CategoryTabs activeTab={activeTab} onChange={handleTabChange} />
        
        <div className="menu-grid" style={{ flex: 1 }}>
          {filteredItems.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              price={formatPrice(item.price)}
              qty={cartMap[item.id]}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>

        {cart.length > 0 ? (
          <div style={{ marginTop: "24px" }}>
            <BottomActionButton
              variant="primary"
              label="이대로 주문 완료하기"
              onClick={onOrder}
            />
          </div>
        ) : null}
      </main>

      {/* Subtitle overlay */}
      <SubtitleBar text={subtitleText} />

      {/* Step tracker */}
      <ProgressBar currentStep="order" />
    </div>
  );
}
