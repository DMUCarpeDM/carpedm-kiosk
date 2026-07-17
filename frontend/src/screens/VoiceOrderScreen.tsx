import { useEffect, useRef, useState } from "react";
import { fetchTtsAudio, orderVoice } from "../api";
import { MicButton, VoiceWaveform } from "../components";
import { startRecording, type Recorder } from "../recorder";
import {
  listenOnce,
  playBeep,
  playSpeech,
  speak,
  speechSupported,
  stopAllAudio,
  voiceStateLabel,
} from "../speech";
import type { CartItem, OrderResponse, VoiceState } from "../types";

const GREETING = "안녕하세요, 롯데리아입니다.";
const GREETING_SUB = "잠시 후 ‘삐’ 소리가 나면 주문하실 메뉴를 말씀해 주세요.";
const PROMPT_SHORT = "‘삐’ 소리가 나면 말씀해 주세요."; // 재진입 시 — 풀 인사는 세션당 1회
const MAX_RECORD_MS = 7000; // 최대 녹음 길이 — 누르는 걸 잊어도 자동 완료

/** 풀 인사(full) / 짧은 안내(short) / 무음 재시도(none) */
export type GreetingMode = "full" | "short" | "none";

const EXAMPLES = [
  "불고기버거 세트 하나 주세요",
  "새우버거 두 개랑 콜라 하나",
  "매운 거 추천해 줘",
  "감자 튀김은 빼 주세요",
];

type Props = {
  cart: CartItem[];
  sessionId: string | null;
  onBack: () => void;
  /** 마이크 실패 시 터치 주문으로 안내 (음성·터치 병행 원칙) */
  onOpenMenu: () => void;
  /** 서버 /order 성공 (STT+해석+TTS 완료) */
  onOrderResult: (res: OrderResponse) => void;
  /** 브라우저 STT 폴백 등 텍스트만 얻었을 때 */
  onUtterance: (text: string) => void;
  greeting?: GreetingMode;
  /** 풀 인사가 나간 뒤 호출 — 같은 세션에서는 다시 풀 인사를 하지 않는다 */
  onGreeted?: () => void;
};

// 텍스트 입력은 개발·자동 검증 전용(?dev=1) — 실사용 화면에는 타자 입력을 두지 않는다
// 프로덕션 빌드에서는 ?dev=1을 붙여도 노출되지 않는다 (시연 중 오터치 방지)
const DEV_MODE = import.meta.env.DEV && new URLSearchParams(window.location.search).has("dev");

export function VoiceOrderScreen({
  cart,
  sessionId,
  onBack,
  onOpenMenu,
  onOrderResult,
  onUtterance,
  greeting = "full",
  onGreeted,
}: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("");
  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── 녹음 시작/종료 (push-to-talk: 누르면 시작, 다시 누르면 완료) ──
  const startListening = async () => {
    stopAllAudio();
    setStatusText(null);
    // 마이크를 열기 직전 '삐' 소리로 "지금 말하세요" 신호를 준다 (어르신 타이밍 안내)
    setVoiceState("cue");
    await playBeep();
    if (!mountedRef.current) return;
    try {
      const rec = await startRecording();
      recorderRef.current = rec;
      setVoiceState("listening");
      clearTimer();
      timerRef.current = window.setTimeout(() => void finishListening(), MAX_RECORD_MS);
    } catch {
      setVoiceState("error");
      setStatusText("마이크를 사용할 수 없습니다. 다시 시도하시거나 메뉴판에서 골라 주세요.");
    }
  };

  const finishListening = async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    clearTimer();
    setVoiceState("processing");
    try {
      const { blob: wav, peak, voicedMs } = await rec.stop();
      // 거의 무음이면 API를 부르지 않고 바로 다시 안내 (소음 환경에서 흔한 실패)
      if (peak < 0.015 || voicedMs < 250) {
        setVoiceState("error");
        setStatusText("목소리가 잘 들리지 않았어요. 마이크 가까이에서 또박또박 말씀해 주세요.");
        return;
      }
      const res = await orderVoice(wav, cart, sessionId);
      if (!mountedRef.current) return;
      if (res.ok) {
        onOrderResult(res);
        return;
      }
      // 서버 STT 실패 → 브라우저 STT로 한 번 더 시도, 그것도 안 되면 안내
      if (speechSupported()) {
        setVoiceState("listening");
        setStatusText("다시 한 번 말씀해 주세요.");
        listenOnce({
          onResult: (text) => {
            if (!mountedRef.current) return;
            setVoiceState("processing"); // 확인 중 화면을 즉시 보여 준다
            onUtterance(text);
          },
          onError: () => {
            if (!mountedRef.current) return;
            setVoiceState("error");
            setStatusText(res.message);
          },
        });
      } else {
        setVoiceState("error");
        setStatusText(res.message);
      }
    } catch {
      if (!mountedRef.current) return;
      setVoiceState("error");
      setStatusText("서버에 연결할 수 없습니다. 메뉴판에서 골라 주세요.");
    }
  };

  const onMicClick = () => {
    if (voiceState === "listening") void finishListening();
    // 신호음 재생 중(cue)·처리 중(processing)에는 다시 시작하지 않는다
    else if (voiceState !== "processing" && voiceState !== "cue") void startListening();
  };

  // ── 인사말 (Google TTS 캐시 → 브라우저 폴백) 후 자동 듣기 ──
  // 풀 인사는 세션당 1회만 — "말로 주문"을 다시 눌러도 반복하지 않는다 (짧은 안내로 대체)
  useEffect(() => {
    mountedRef.current = true;
    // 이 이펙트 실행 전용 취소 플래그 — mountedRef만 쓰면 StrictMode 이중 실행이나
    // 재진입 시 이전 begin()이 되살아나 인사를 서로 끊는다 (말 끊김의 원인)
    let cancelled = false;

    const begin = async () => {
      const line = greeting === "full" ? `${GREETING} ${GREETING_SUB}` : greeting === "short" ? PROMPT_SHORT : null;
      if (line) {
        setVoiceState("speaking");
        const audio = await fetchTtsAudio(line);
        if (cancelled || !mountedRef.current) return;
        if (audio) await playSpeech("", audio.b64, audio.mime);
        else await new Promise<void>((r) => speak(line, undefined, () => r()));
        if (cancelled || !mountedRef.current) return;
        if (greeting === "full") onGreeted?.();
      }
      if (cancelled) return;
      await startListening();
    };
    void begin();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimer();
      recorderRef.current?.cancel();
      recorderRef.current = null;
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting]);

  const submitTest = () => {
    const t = testInput.trim();
    if (!t) return;
    setVoiceState("processing");
    onUtterance(t);
  };

  const showFallback = voiceState === "error";
  const listening = voiceState === "listening";
  const processing = voiceState === "processing";

  return (
    <div className="lk-voice">
      {processing ? (
        // 처리 중 — "주문을 확인하고 있어요"를 상단에 크게 (어르신이 대기 상태를 분명히 알도록)
        <div className="lk-voice__now" role="status" aria-live="assertive">
          <span className="lk-voice__spinner" aria-hidden="true" />
          <h1 className="lk-voice__nowtitle lk-voice__nowtitle--wait">주문을 확인하고 있어요</h1>
          <p className="lk-voice__waitsub">잠시만 기다려 주세요</p>
        </div>
      ) : listening ? (
        // 듣는 중 — "지금 말씀하세요"를 크고 분명하게 보여 준다 (어르신 타이밍 안내)
        <div className="lk-voice__now" role="status" aria-live="assertive">
          <span className="lk-voice__nowdot" aria-hidden="true" />
          <h1 className="lk-voice__nowtitle">지금 말씀하세요</h1>
        </div>
      ) : (
        <>
          <h1 className="lk-voice__title">
            {voiceState === "cue" ? "잠시만요…" : greeting === "full" ? GREETING : "무엇을 드릴까요?"}
          </h1>
          <p className="lk-voice__sub">{GREETING_SUB}</p>
        </>
      )}

      {/* 처리 중에는 파형·마이크·예시를 숨겨 '확인 중' 안내에 집중시킨다 */}
      {!processing ? (
        <>
          <VoiceWaveform active={listening || voiceState === "speaking"} />
          <MicButton active={listening} onClick={onMicClick} />

          <p className="lk-voice__status" aria-live="polite">
            {listening ? (
              <>말이 끝나면 <b>이 버튼</b>을 눌러 주세요</>
            ) : (
              statusText ?? voiceStateLabel(voiceState)
            )}
          </p>

          <section className="lk-examples" aria-label="말하기 예시">
            <p className="lk-examples__title">이렇게 말씀하실 수 있습니다</p>
            <div className="lk-examples__list">
              {EXAMPLES.map((e) => (
                <span key={e} className="lk-examples__chip">“{e}”</span>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {showFallback ? (
        <div className="lk-voice-fallback">
          {/* 타자 입력 대신 큰 버튼 2개 — 음성이 안 되면 터치로 자연스럽게 회복 */}
          <div className="lk-voice-fallback__actions">
            <button type="button" className="lk-voice-fallback__retry" onClick={() => void startListening()}>
              다시 말하기
            </button>
            <button type="button" className="lk-voice-fallback__menu" onClick={onOpenMenu}>
              메뉴판에서 고르기
            </button>
          </div>
        </div>
      ) : null}

      {DEV_MODE ? (
        <div className="lk-voice-fallback__row">
          <input
            className="lk-voice-fallback__input"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="개발용 텍스트 입력"
            onKeyDown={(e) => e.key === "Enter" && submitTest()}
          />
          <button type="button" className="lk-voice-fallback__submit" onClick={submitTest}>
            확인
          </button>
        </div>
      ) : null}

      <button type="button" className="lk-mode__back" onClick={onBack}>
        ← 이전으로
      </button>
    </div>
  );
}
