import { useEffect, useRef, useState } from "react";
import { fetchTtsAudio, orderVoice } from "../api";
import { MicButton, VoiceWaveform } from "../components";
import { startRecording, type Recorder } from "../recorder";
import {
  listenOnce,
  playSpeech,
  speak,
  speechSupported,
  stopAllAudio,
  voiceStateLabel,
} from "../speech";
import type { CartItem, OrderResponse, VoiceState } from "../types";

const GREETING = "안녕하세요, 롯데리아입니다.";
const GREETING_SUB = "가운데 빨간 단추를 누르고 천천히 말씀해 주세요.";
const MAX_RECORD_MS = 7000; // 최대 녹음 길이 — 누르는 걸 잊어도 자동 완료

const EXAMPLES = [
  "불고기버거 세트 하나 주세요",
  "새우버거 두 개랑 콜라 하나",
  "매운 거 추천해 줘요",
  "감자 튀김은 빼 주세요",
];

type Props = {
  cart: CartItem[];
  sessionId: string | null;
  onBack: () => void;
  /** 서버 /order 성공 (STT+해석+TTS 완료) */
  onOrderResult: (res: OrderResponse) => void;
  /** 브라우저 STT 폴백 등 텍스트만 얻었을 때 */
  onUtterance: (text: string) => void;
  skipGreeting?: boolean;
};

export function VoiceOrderScreen({ cart, sessionId, onBack, onOrderResult, onUtterance, skipGreeting = false }: Props) {
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
    try {
      const rec = await startRecording();
      recorderRef.current = rec;
      setVoiceState("listening");
      clearTimer();
      timerRef.current = window.setTimeout(() => void finishListening(), MAX_RECORD_MS);
    } catch {
      setVoiceState("error");
      setStatusText("마이크를 사용할 수 없어요. 아래에 적어 주시거나 메뉴에서 골라 주세요.");
    }
  };

  const finishListening = async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    clearTimer();
    setVoiceState("processing");
    try {
      const wav = await rec.stop();
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
          onResult: (text) => mountedRef.current && onUtterance(text),
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
      setStatusText("서버에 연결할 수 없어요. 아래에 적어 주시거나 메뉴에서 골라 주세요.");
    }
  };

  const onMicClick = () => {
    if (voiceState === "listening") void finishListening();
    else if (voiceState !== "processing") void startListening();
  };

  // ── 인사말 (Google TTS 캐시 → 브라우저 폴백) 후 자동 듣기 ──
  useEffect(() => {
    mountedRef.current = true;

    const begin = async () => {
      if (!skipGreeting) {
        setVoiceState("speaking");
        const audio = await fetchTtsAudio(`${GREETING} ${GREETING_SUB}`);
        if (!mountedRef.current) return;
        if (audio) await playSpeech("", audio.b64, audio.mime);
        else await new Promise<void>((r) => speak(`${GREETING} ${GREETING_SUB}`, undefined, () => r()));
        if (!mountedRef.current) return;
      }
      await startListening();
    };
    void begin();

    return () => {
      mountedRef.current = false;
      clearTimer();
      recorderRef.current?.cancel();
      recorderRef.current = null;
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipGreeting]);

  const submitTest = () => {
    const t = testInput.trim();
    if (!t) return;
    setVoiceState("processing");
    onUtterance(t);
  };

  const showFallback = voiceState === "error";

  return (
    <div className="lk-voice">
      <h1 className="lk-voice__title">{GREETING}</h1>
      <p className="lk-voice__sub">{GREETING_SUB}</p>

      <VoiceWaveform active={voiceState === "listening" || voiceState === "speaking"} />
      <MicButton active={voiceState === "listening"} onClick={onMicClick} />

      <p className="lk-voice__status" aria-live="polite">
        {statusText ?? voiceStateLabel(voiceState)}
        {voiceState === "listening" ? " — 다 말씀하셨으면 단추를 한 번 더 누르세요" : ""}
      </p>

      <section className="lk-examples" aria-label="말하기 예시">
        <p className="lk-examples__title">이렇게 말씀해 보세요</p>
        <div className="lk-examples__list">
          {EXAMPLES.map((e) => (
            <span key={e} className="lk-examples__chip">“{e}”</span>
          ))}
        </div>
      </section>

      {showFallback ? (
        <div className="lk-voice-fallback">
          <div className="lk-voice-fallback__row">
            <input
              className="lk-voice-fallback__input"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="예: 불고기버거 한 개 주세요"
              onKeyDown={(e) => e.key === "Enter" && submitTest()}
            />
            <button type="button" className="lk-voice-fallback__submit" onClick={submitTest}>
              확인
            </button>
          </div>
          <button type="button" className="lk-mode__back" onClick={() => void startListening()}>
            🎤 다시 말하기
          </button>
        </div>
      ) : null}

      <button type="button" className="lk-mode__back" onClick={onBack}>
        ← 이전으로
      </button>
    </div>
  );
}
