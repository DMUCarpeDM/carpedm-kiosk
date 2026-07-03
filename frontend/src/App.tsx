import { useCallback, useEffect, useState } from "react";
import { fetchMenu, fetchTtsAudio, interpretUtterance } from "./api";
import { A11yBar, TopBar } from "./components";
import { isLocalConfirmFallback, viewFromInterpret } from "./interpretFlow";
import { playSpeech } from "./speech";
import { MainScreen } from "./screens/MainScreen";
import { MenuDetailScreen } from "./screens/MenuDetailScreen";
import { MenuListScreen } from "./screens/MenuListScreen";
import { OrderCompleteScreen } from "./screens/OrderCompleteScreen";
import { OrderModeScreen } from "./screens/OrderModeScreen";
import { VoiceOrderScreen } from "./screens/VoiceOrderScreen";
import { VoiceResultScreen } from "./screens/VoiceResultScreen";
import type {
  CartItem,
  DiningOption,
  InterpretResult,
  MenuItem,
  OrderResponse,
  Screen,
  VoiceResultView,
} from "./types";

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
  const [voiceSay, setVoiceSay] = useState<string | undefined>(undefined);
  const [voiceAudio, setVoiceAudio] = useState<{ b64: string; mime: string } | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [voiceRetry, setVoiceRetry] = useState(false);

  // 실기기 요소: 식사 장소·주문 번호·접근성 모드
  const [dining, setDining] = useState<DiningOption | null>(null);
  const [orderNo, setOrderNo] = useState(1);
  const [lowScreen, setLowScreen] = useState(false);
  const [bigText, setBigText] = useState(false);

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

  const goMain = useCallback(() => {
    setScreen("main");
    setCart([]);
    setSessionId(null);
    setSelectedMenuId(null);
    setDetailQty(1);
    setUtterance("");
    setVoiceView(null);
    setVoiceSay(undefined);
    setVoiceAudio(null);
    setDining(null);
  }, []);

  const goComplete = () => {
    setOrderNo(Math.floor(Math.random() * 90) + 10); // 실증용 임의 주문번호
    setScreen("order-complete");
  };

  const showResultView = (view: VoiceResultView | "confirm") => {
    if (view === "confirm") {
      goComplete();
      return;
    }
    setVoiceView(view);
    setScreen("voice-result");
  };

  /** 서버 /order 응답 (STT+해석+TTS 완료) */
  const handleOrderResult = (res: OrderResponse) => {
    if (!res.ok) return; // VoiceOrderScreen에서 처리됨
    setSessionId(res.session_id);
    setCart(res.cart);
    setUtterance(res.utterance);
    setApiDown(false);

    if (res.action === "confirm") {
      void playSpeech(res.say, res.audio_b64, res.audio_mime); // 완료 안내를 끊지 않는다
      goComplete();
      return;
    }
    const result: InterpretResult = {
      action: res.action,
      cart: res.cart,
      reply: res.reply,
      question: res.question,
      suggestions: res.suggestions,
      provider: res.provider,
    };
    setVoiceSay(res.say);
    setVoiceAudio(res.audio_b64 ? { b64: res.audio_b64, mime: res.audio_mime } : null);
    showResultView(viewFromInterpret(result, res.say));
  };

  /** 텍스트 발화 경로 (브라우저 STT 폴백·직접 입력) — /api/interpret + TTS 별도 합성 */
  const handleInterpret = async (text: string, currentCart: CartItem[]) => {
    setUtterance(text);
    try {
      const result = await interpretUtterance(text, currentCart, sessionId);
      if (result.session_id) setSessionId(result.session_id);
      setCart(result.cart);
      setApiDown(false);

      const say = (result.question || result.reply || "").trim();
      if (result.action === "confirm") {
        if (say) {
          const audio = await fetchTtsAudio(say);
          void playSpeech(say, audio?.b64, audio?.mime);
        }
        goComplete();
        return;
      }
      setVoiceSay(say || undefined);
      setVoiceAudio(say ? await fetchTtsAudio(say) : null);
      showResultView(viewFromInterpret(result, say));
    } catch {
      setApiDown(true);
      // ponytail: API 미연동 시에만 로컬 확정 키워드 판단
      if (currentCart.length > 0 && isLocalConfirmFallback(text)) {
        goComplete();
        return;
      }
      setVoiceSay(undefined);
      setVoiceAudio(null);
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

  const addToCart = (id: string, qty: number) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === id);
      if (found) {
        return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + qty } : c));
      }
      return [...prev, { id, qty }];
    });
    setDetailQty(1);
    setScreen("menu-list");
  };

  const updateCartQty = (id: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((c) => c.id !== id);
      return prev.map((c) => (c.id === id ? { ...c, qty } : c));
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const appClass = `lk-app ${lowScreen ? "lk-app--low" : ""} ${bigText ? "lk-app--big" : ""}`;

  if (menuError && screen === "main") {
    return (
      <div className={appClass}>
        <div className="lk-viewport">
          <TopBar dining={null} onHome={goMain} showHome={false} />
          <div className="lk-error">
            <p className="lk-error__text">{menuError}</p>
            <button type="button" className="lk-error__retry" onClick={() => void loadMenu()}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={appClass}>
      <div className="lk-low-notice">아래쪽 화면으로 편하게 이용하세요</div>
      <div className="lk-viewport">
        <TopBar dining={dining} onHome={goMain} showHome={screen !== "main"} />

        {screen === "main" ? (
          <MainScreen
            onSelect={(d) => {
              setDining(d);
              setScreen("order-mode");
            }}
          />
        ) : null}

        {screen === "order-mode" ? (
          <OrderModeScreen
            onVoice={() => {
              setVoiceRetry(false);
              setScreen("voice-order");
            }}
            onTouch={() => setScreen("menu-list")}
            onBack={goMain}
          />
        ) : null}

        {screen === "voice-order" ? (
          <VoiceOrderScreen
            cart={cart}
            sessionId={sessionId}
            skipGreeting={voiceRetry}
            onBack={() => setScreen("order-mode")}
            onOrderResult={handleOrderResult}
            onUtterance={onVoiceUtterance}
          />
        ) : null}

        {screen === "voice-result" && voiceView ? (
          <VoiceResultScreen
            utterance={utterance}
            view={voiceView}
            menu={menu}
            cart={cart}
            say={voiceSay}
            audioB64={voiceAudio?.b64 ?? null}
            audioMime={voiceAudio?.mime}
            onRetry={onVoiceRetry}
            onConfirm={goComplete}
            onOpenMenu={() => setScreen("menu-list")}
            onPickSuggestion={(id) => addToCart(id, 1)}
          />
        ) : null}

        {screen === "menu-list" ? (
          <MenuListScreen
            items={menu}
            cart={cart}
            onSelect={(id) => openMenuDetail(id)}
            onUpdateQty={updateCartQty}
            onRemoveItem={removeFromCart}
            onClearCart={() => setCart([])}
            onVoice={() => {
              setVoiceRetry(false);
              setScreen("voice-order");
            }}
            onPay={() => {
              if (cart.length > 0) goComplete();
            }}
          />
        ) : null}

        {screen === "menu-detail" && selectedMenuId ? (
          <MenuDetailScreen
            key={selectedMenuId}
            menuId={selectedMenuId}
            menu={menu}
            qty={detailQty}
            onQtyChange={setDetailQty}
            onOrder={(id) => addToCart(id, detailQty)}
            onBack={() => setScreen("menu-list")}
          />
        ) : null}

        {screen === "order-complete" ? (
          <OrderCompleteScreen orderNo={orderNo} dining={dining} cart={cart} menu={menu} onHome={goMain} />
        ) : null}

        <A11yBar
          lowScreen={lowScreen}
          bigText={bigText}
          onToggleLow={() => setLowScreen((v) => !v)}
          onToggleBig={() => setBigText((v) => !v)}
        />
      </div>

      {apiDown && screen !== "main" ? (
        <p className="lk-api-banner" role="status">
          서버 연결 끊김 — 음성 해석이 제한될 수 있어요
        </p>
      ) : null}
    </div>
  );
}
