import { useCallback, useEffect, useState } from "react";
import { fetchMenu, interpretUtterance } from "./api";
import { isLocalConfirmFallback, viewFromInterpret } from "./interpretFlow";
import { MainScreen } from "./screens/MainScreen";
import { MenuDetailScreen } from "./screens/MenuDetailScreen";
import { MenuListScreen } from "./screens/MenuListScreen";
import { OrderCompleteScreen } from "./screens/OrderCompleteScreen";
import { VoiceOrderScreen } from "./screens/VoiceOrderScreen";
import { VoiceResultScreen } from "./screens/VoiceResultScreen";
import type { CartItem, MenuItem, Screen, VoiceResultView } from "./types";

export default function App() {
  const [screen, setScreen] = useState<Screen>("main");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [utterance, setUtterance] = useState("");
  const [voiceView, setVoiceView] = useState<VoiceResultView | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [voiceRetry, setVoiceRetry] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const items = await fetchMenu();
      setMenu(items);
      setMenuError(null);
      setApiDown(false);
    } catch {
      setMenuError("메뉴를 불러오지 못했어요. 백엔드 서버가 켜져 있는지 확인해 주세요.");
      setApiDown(true);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const goMain = () => {
    setScreen("main");
    setCart([]);
    setSessionId(null);
    setSelectedMenuId(null);
    setDetailQty(1);
    setUtterance("");
    setVoiceView(null);
  };

  const goComplete = () => setScreen("order-complete");

  const handleInterpret = async (text: string, currentCart: CartItem[]) => {
    setUtterance(text);
    try {
      const result = await interpretUtterance(text, currentCart, sessionId);
      if (result.session_id) setSessionId(result.session_id);
      setCart(result.cart);
      setApiDown(false);

      const view = viewFromInterpret(result);
      if (view === "confirm") {
        goComplete();
        return;
      }
      setVoiceView(view);
      setScreen("voice-result");
    } catch {
      setApiDown(true);
      // ponytail: API 미연동 시에만 로컬 확정 키워드 판단
      if (currentCart.length > 0 && isLocalConfirmFallback(text)) {
        goComplete();
        return;
      }
      setVoiceView({
        kind: "reject",
        text: "서버에 연결할 수 없어요. 메뉴를 직접 골라 주시거나, 서버를 켠 뒤 다시 시도해 주세요.",
      });
      setScreen("voice-result");
    }
  };

  const onVoiceUtterance = (text: string) => {
    void handleInterpret(text, cart);
  };

  const onVoiceConfirm = () => {
    if (voiceView?.kind === "menu") {
      setCart([{ id: voiceView.menuId, qty: voiceView.qty }]);
    }
    goComplete();
  };

  const onVoiceRetry = () => {
    setVoiceView(null);
    setVoiceRetry(true);
    setScreen("voice-order");
  };

  const openMenuDetail = (id: string, qty = 1) => {
    setSelectedMenuId(id);
    setDetailQty(qty);
    setScreen("menu-detail");
  };

  if (menuError && screen === "main") {
    return (
      <div className="app">
        <div className="screen screen--main">
          <p className="error-text">{menuError}</p>
          <button type="button" className="btn btn--primary" onClick={() => void loadMenu()}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {screen === "main" ? (
        <MainScreen
          onVoiceOrder={() => {
            setVoiceRetry(false);
            setScreen("voice-order");
          }}
          onMenuSelect={() => setScreen("menu-list")}
        />
      ) : null}

      {screen === "voice-order" ? (
        <VoiceOrderScreen
          skipGreeting={voiceRetry}
          onBack={goMain}
          onUtterance={onVoiceUtterance}
        />
      ) : null}

      {screen === "voice-result" && voiceView ? (
        <VoiceResultScreen
          utterance={utterance}
          view={voiceView}
          menu={menu}
          onRetry={onVoiceRetry}
          onConfirm={onVoiceConfirm}
          onMenuSelect={() => setScreen("menu-list")}
          onBack={goMain}
        />
      ) : null}

      {screen === "menu-list" ? (
        <MenuListScreen
          items={menu}
          onSelect={(id) => openMenuDetail(id)}
          onBack={goMain}
        />
      ) : null}

      {screen === "menu-detail" && selectedMenuId ? (
        <MenuDetailScreen
          menuId={selectedMenuId}
          menu={menu}
          qty={detailQty}
          onQtyChange={setDetailQty}
          onOrder={() => {
            setCart([{ id: selectedMenuId, qty: detailQty }]);
            goComplete();
          }}
          onBack={() => setScreen("menu-list")}
        />
      ) : null}

      {screen === "order-complete" ? <OrderCompleteScreen onHome={goMain} /> : null}

      {apiDown && screen !== "main" ? (
        <p className="api-banner" role="status">
          백엔드 연결 끊김 — 일부 음성 해석이 제한될 수 있어요.
        </p>
      ) : null}
    </div>
  );
}
