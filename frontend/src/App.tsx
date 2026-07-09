import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMenu, fetchPresence, fetchTtsAudio, interpretUtterance, menuById } from "./api";
import { A11yBar, StepBar, TopBar } from "./components";
import { IconBell } from "./icons";
import { isLocalConfirmFallback, viewFromInterpret } from "./interpretFlow";
import { playSpeech } from "./speech";
import { AllergyGate } from "./screens/AllergyGate";
import { AttractOverlay } from "./screens/AttractOverlay";
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
  const [gateOpen, setGateOpen] = useState(false); // 결제 전 알레르기 확인
  const [helpOpen, setHelpOpen] = useState(false); // 직원 호출

  // 대기(어트랙트) 화면 + PIR 인체 감지 — ?attract=1 로 강제 표시(시연·검증용)
  const [attract, setAttract] = useState(() => new URLSearchParams(window.location.search).has("attract"));
  const prevPresentRef = useRef(false);
  const IDLE_TO_ATTRACT_MS = 45000;

  // 세로 화면 전용 — 가로로 켜져 있으면 회전 안내 (개발 편의를 위해 닫을 수 있음)
  const [landscape, setLandscape] = useState(window.innerWidth > window.innerHeight);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  useEffect(() => {
    const onResize = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadMenu = useCallback(async () => {
    try {
      const items = await fetchMenu();
      setMenu(items);
      setMenuError(null);
      setApiDown(false);
    } catch {
      setMenuError("메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setApiDown(true);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  // 첫 화면에서 45초간 조작이 없으면 대기 화면으로
  useEffect(() => {
    if (screen !== "main" || attract) return;
    let timer = window.setTimeout(() => setAttract(true), IDLE_TO_ATTRACT_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAttract(true), IDLE_TO_ATTRACT_MS);
    };
    window.addEventListener("pointerdown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
    };
  }, [screen, attract]);

  /** 대기 화면 해제 — PIR 감지로 깨어난 경우에는 인사 음성도 나간다 */
  const wake = useCallback((greet: boolean) => {
    setAttract(false);
    if (greet) {
      const say = "어서 오세요, 롯데리아입니다. 화면을 터치하시면 주문이 시작됩니다.";
      void (async () => {
        const audio = await fetchTtsAudio(say);
        void playSpeech(say, audio?.b64, audio?.mime);
      })();
    }
  }, []);

  // 대기 화면 동안 PIR 상태를 2초 간격으로 확인 — 손님이 다가오면 깨어난다
  useEffect(() => {
    if (!attract) return;
    const iv = window.setInterval(() => {
      void (async () => {
        const p = await fetchPresence();
        if (!p?.enabled) return;
        if (p.present && !prevPresentRef.current) {
          prevPresentRef.current = true;
          wake(true);
        } else if (!p.present) {
          prevPresentRef.current = false;
        }
      })();
    }, 2000);
    return () => window.clearInterval(iv);
  }, [attract, wake]);

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
    setGateOpen(false);
    setOrderNo(Math.floor(Math.random() * 90) + 10); // 실증용 임의 주문번호
    setScreen("order-complete");
  };

  /** 결제 요청 — 알레르기 성분이 있으면 확인 게이트를 먼저 연다 (보고서 4.4) */
  const requestComplete = () => {
    const hasAllergens = cart.some((c) => (menuById(menu, c.id)?.allergens?.length ?? 0) > 0);
    if (hasAllergens) setGateOpen(true);
    else goComplete();
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
      // 알레르기 성분이 있으면 게이트가 대신 안내한다
      const hasAllergens = res.cart.some((c) => (menuById(menu, c.id)?.allergens?.length ?? 0) > 0);
      if (hasAllergens) {
        setGateOpen(true);
      } else {
        void playSpeech(res.say, res.audio_b64, res.audio_mime);
        goComplete();
      }
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
        const hasAllergens = result.cart.some((c) => (menuById(menu, c.id)?.allergens?.length ?? 0) > 0);
        if (hasAllergens) {
          setGateOpen(true);
          return;
        }
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
        text: "서버에 연결할 수 없습니다. 메뉴판에서 직접 선택해 주세요.",
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
      <div className="lk-low-notice">화면을 아래쪽으로 낮췄습니다</div>
      <div className="lk-viewport">
        <TopBar dining={dining} onHome={goMain} showHome={screen !== "main"} />
        <StepBar
          current={
            screen === "main"
              ? 1
              : screen === "order-mode"
                ? 2
                : screen === "order-complete"
                  ? 4
                  : gateOpen
                    ? 4
                    : 3
          }
        />

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
            onConfirm={requestComplete}
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
              if (cart.length > 0) requestComplete();
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
          onHelp={() => setHelpOpen(true)}
        />
      </div>

      {gateOpen ? (
        <AllergyGate
          cart={cart}
          menu={menu}
          onProceed={goComplete}
          onRemoveItem={removeFromCart}
          onOpenMenu={() => {
            setGateOpen(false);
            setScreen("menu-list");
          }}
          onCancel={() => setGateOpen(false)}
        />
      ) : null}

      {helpOpen ? (
        <div className="lk-modal-wrap" role="dialog" aria-modal="true" aria-label="직원 호출">
          <div className="lk-modal">
            <span className="lk-modal__badge lk-modal__badge--help">
              <IconBell size={34} />
            </span>
            <h2 className="lk-modal__title">직원을 호출했습니다</h2>
            <p className="lk-modal__sub">
              잠시만 기다려 주세요. 직원이 곧 도와드리겠습니다.
              <br />
              화면은 그대로 두셔도 됩니다.
            </p>
            <div className="lk-modal__actions">
              <button type="button" className="lk-modal__btn lk-modal__btn--yes" onClick={() => setHelpOpen(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {attract ? <AttractOverlay onWake={() => wake(false)} /> : null}

      {landscape && !rotateDismissed ? (
        <div className="lk-rotate" role="alertdialog" aria-label="화면 회전 안내">
          <div className="lk-rotate__box">
            <p className="lk-rotate__title">이 키오스크는 세로 화면 전용입니다</p>
            <p className="lk-rotate__sub">
              화면(태블릿)을 세로로 회전해 주세요.
              <br />
              라즈베리파이는 docs/raspberry-pi.md 3.6절, 태블릿은 docs/tablet.md 참조.
            </p>
            <button type="button" className="lk-rotate__skip" onClick={() => setRotateDismissed(true)}>
              그대로 진행 (개발용)
            </button>
          </div>
        </div>
      ) : null}

      {apiDown && screen !== "main" ? (
        <p className="lk-api-banner" role="status">
          서버 연결이 원활하지 않습니다 — 음성 주문이 제한될 수 있습니다
        </p>
      ) : null}
    </div>
  );
}
