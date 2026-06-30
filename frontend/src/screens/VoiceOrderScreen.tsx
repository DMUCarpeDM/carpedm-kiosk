import { useEffect, useRef, useState } from "react";
import { MicButton, VoiceWaveform } from "../components";
import { listenOnce, speechSupported, stopSpeaking, voiceStateLabel } from "../speech";
import type { VoiceState } from "../types";

const GREETING = "안녕하세요, 롯데리아입니다.";
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
    <div className="screen screen--lotte-page screen--lotte-voice">
      <header className="lotte-sign lotte-sign--inline" aria-label="롯데리아">
        <div className="lotte-sign__bar">
          <span className="lotte-sign__line" aria-hidden="true" />
          <span className="lotte-sign__logo">LOTTERIA</span>
          <span className="lotte-sign__line" aria-hidden="true" />
        </div>
      </header>

      <main className="lotte-voice-main">
        <div className="lotte-voice-greeting">
          <p className="lotte-voice-greeting__line">{GREETING}</p>
          <p className="lotte-voice-greeting__line lotte-voice-greeting__line--sub">{GREETING_SUB}</p>
        </div>

        <VoiceWaveform active={listening} />
        <MicButton active={voiceState === "listening"} onClick={supported ? startListening : undefined} />

        <p className="lotte-voice-status" aria-live="polite">
          {voiceStateLabel(voiceState)}
        </p>

        {!supported || voiceState === "error" ? (
          <div className="lotte-voice-fallback">
            <p className="lotte-voice-fallback__hint">
              음성 인식을 쓸 수 없을 때는 아래에 말씀하신 내용을 적어 주세요.
            </p>
            <div className="lotte-voice-fallback__row">
              <input
                className="lotte-voice-fallback__input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="예: 불고기버거 한 개 주세요"
                onKeyDown={(e) => e.key === "Enter" && submitTest()}
              />
              <button type="button" className="lotte-voice-fallback__submit" onClick={submitTest}>
                확인
              </button>
            </div>
            {supported ? (
              <button type="button" className="lotte-voice-fallback__retry" onClick={startListening}>
                다시 듣기
              </button>
            ) : null}
          </div>
        ) : null}
      </main>

      <footer className="lotte-menu-footer">
        <div className="lotte-menu-footer__a11y">
          <button type="button" className="lotte-menu-footer__a11y-btn" onClick={onBack} aria-label="처음으로">
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
        </div>
      </footer>
    </div>
  );
}
