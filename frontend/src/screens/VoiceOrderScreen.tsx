import { useEffect, useRef, useState } from "react";
import { KioskHeader, MicButton, VoiceWaveform } from "../components";
import { listenOnce, speechSupported, stopSpeaking, voiceStateLabel } from "../speech";
import type { VoiceState } from "../types";

const GREETING = "안녕하세요, 카페입니다.";
const GREETING_SUB = "무엇을 도와드릴까요?";

type Props = {
  onBack: () => void;
  onUtterance: (text: string) => void;
  skipGreeting?: boolean;
};

export function VoiceOrderScreen({ onBack, onUtterance, skipGreeting = false }: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>("speaking");
  const [testInput, setTestInput] = useState("");
  const stopListen = useRef<(() => void) | null>(null);
  const supported = speechSupported();

  const startListening = () => {
    setVoiceState("listening");
    stopListen.current?.();
    stopListen.current = listenOnce({
      onStart: () => setVoiceState("listening"),
      onResult: (text) => {
        setVoiceState("processing");
        onUtterance(text);
      },
      onError: (msg) => {
        setVoiceState("error");
        speakError(msg);
      },
    });
  };

  const speakError = (msg: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = "ko-KR";
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    let cancelled = false;

    if (skipGreeting) {
      if (supported) startListening();
      else setVoiceState("error");
      return () => {
        cancelled = true;
        stopListen.current?.();
        stopSpeaking();
      };
    }

    const full = `${GREETING} ${GREETING_SUB}`;
    const u = new SpeechSynthesisUtterance(full);
    u.lang = "ko-KR";
    u.rate = 0.95;
    u.onend = () => {
      if (!cancelled) {
        if (supported) startListening();
        else setVoiceState("error");
      }
    };
    setVoiceState("speaking");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);

    return () => {
      cancelled = true;
      stopListen.current?.();
      stopSpeaking();
    };
  }, [supported, skipGreeting]);

  const submitTest = () => {
    const t = testInput.trim();
    if (!t) return;
    setVoiceState("processing");
    onUtterance(t);
  };

  const listening = voiceState === "listening" || voiceState === "speaking";

  return (
    <div className="screen screen--voice">
      <KioskHeader onBack={onBack} />
      <main className="voice-center">
        <div className="voice-center__greeting">
          <p className="voice-center__line">{GREETING}</p>
          <p className="voice-center__line voice-center__line--sub">{GREETING_SUB}</p>
        </div>
        <VoiceWaveform active={listening} />
        <MicButton
          active={voiceState === "listening"}
          onClick={supported ? startListening : undefined}
        />
        <p className="voice-center__status" aria-live="polite">
          {voiceStateLabel(voiceState)}
        </p>
        {!supported || voiceState === "error" ? (
          <div className="voice-fallback">
            <p className="voice-fallback__hint">
              음성 인식을 쓸 수 없을 때는 아래에 말씀하신 내용을 적어 주세요.
            </p>
            <div className="voice-fallback__row">
              <input
                className="voice-fallback__input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="예: 따뜻한 커피 한 잔 주세요"
                onKeyDown={(e) => e.key === "Enter" && submitTest()}
              />
              <button type="button" className="action-btn action-btn--primary" onClick={submitTest}>
                확인
              </button>
            </div>
            {supported ? (
              <button type="button" className="action-btn action-btn--secondary" onClick={startListening}>
                다시 듣기
              </button>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
