import { useCallback, useEffect, useState } from "react";
import { fetchMenu, interpretUtterance } from "./api";
import { isLocalConfirmFallback, viewFromInterpret } from "./interpretFlow";
import { MainScreen } from "./screens/MainScreen";
import { MenuDetailScreen } from "./screens/MenuDetailScreen";
import { MenuListScreen } from "./screens/MenuListScreen";
import { OrderCompleteScreen } from "./screens/OrderCompleteScreen";
import { VoiceOrderScreen } from "./screens/VoiceOrderScreen";
import { VoiceResultScreen } from "./screens/VoiceResultScreen";
import { speak } from "./speech";
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

  // Global Accessibility settings
  const [largeText, setLargeText] = useState(false);
  const [subtitleText, setSubtitleText] = useState("");

  const toggleFontSize = () => {
    setLargeText((prev) => {
      const next = !prev;
      document.body.classList.toggle("large-text", next);
      return next;
    });
  };

  const speakWithSubtitle = (text: string, onEnd?: () => void) => {
    setSubtitleText(text);
    speak(
      text,
      undefined,
      () => {
        setSubtitleText("");
        if (onEnd) onEnd();
      }
    );
  };

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
    setSubtitleText("");
  };

  const goComplete = () => {
    setScreen("order-complete");
    setSubtitleText("");
  };

  const addToCart = (id: string, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === id);
      if (existing) {
        return prev.map((x) => (x.id === id ? { ...x, qty: x.qty + qty } : x));
      }
      return [...prev, { id, qty }];
    });
  };

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
      addToCart(voiceView.menuId, voiceView.qty);
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
        <div className="screen screen--main" style={{ justifyContent: "center", alignItems: "center" }}>
          <p className="error-text">{menuError}</p>
          <button
            type="button"
            className="kiosk-header__btn"
            style={{ minHeight: "80px", minWidth: "200px" }}
            onClick={() => void loadMenu()}
          >
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
          largeText={largeText}
          onToggleFontSize={toggleFontSize}
          onVoiceOrder={() => {
            setVoiceRetry(false);
            setScreen("voice-order");
          }}
          onMenuSelect={() => setScreen("menu-list")}
        />
      ) : null}

      {screen === "voice-order" ? (
        <VoiceOrderScreen
          largeText={largeText}
          onToggleFontSize={toggleFontSize}
          skipGreeting={voiceRetry}
          onBack={goMain}
          onUtterance={onVoiceUtterance}
          speakWithSubtitle={speakWithSubtitle}
          setSubtitleText={setSubtitleText}
          subtitleText={subtitleText}
        />
      ) : null}

      {screen === "voice-result" && voiceView ? (
        <VoiceResultScreen
          largeText={largeText}
          onToggleFontSize={toggleFontSize}
          utterance={utterance}
          view={voiceView}
          menu={menu}
          onRetry={onVoiceRetry}
          onConfirm={onVoiceConfirm}
          onMenuSelect={() => setScreen("menu-list")}
          onBack={goMain}
          speakWithSubtitle={speakWithSubtitle}
          subtitleText={subtitleText}
        />
      ) : null}

      {screen === "menu-list" ? (
        <MenuListScreen
          largeText={largeText}
          onToggleFontSize={toggleFontSize}
          items={menu}
          cart={cart}
          onSelect={(id) => openMenuDetail(id)}
          onOrder={goComplete}
          onBack={goMain}
          speakWithSubtitle={speakWithSubtitle}
          subtitleText={subtitleText}
        />
      ) : null}

      {screen === "menu-detail" && selectedMenuId ? (
        <MenuDetailScreen
          largeText={largeText}
          onToggleFontSize={toggleFontSize}
          menuId={selectedMenuId}
          menu={menu}
          qty={detailQty}
          onQtyChange={setDetailQty}
          onOrder={() => {
            addToCart(selectedMenuId, detailQty);
            setScreen("menu-list");
          }}
          onBack={() => setScreen("menu-list")}
          speakWithSubtitle={speakWithSubtitle}
          subtitleText={subtitleText}
        />
      ) : null}

      {screen === "order-complete" ? (
        <OrderCompleteScreen
          largeText={largeText}
          onToggleFontSize={toggleFontSize}
          cart={cart}
          menu={menu}
          onHome={goMain}
          speakWithSubtitle={speakWithSubtitle}
          subtitleText={subtitleText}
        />
      ) : null}

      {apiDown && screen !== "main" && screen !== "order-complete" ? (
        <p className="api-banner" role="status">
          백엔드 연결 끊김 — 일부 음성 해석이 제한될 수 있어요.
        </p>
      ) : null}
    </div>
  );
}
