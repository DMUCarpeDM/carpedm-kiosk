import { useEffect, useRef, useState } from "react";
import { KioskHeader, MicButton, VoiceWaveform, SubtitleBar, ProgressBar } from "../components";
import { listenOnce, speechSupported, stopSpeaking, voiceStateLabel } from "../speech";
import type { VoiceState } from "../types";

const GREETING = "말씀하세요, 천천히 듣고 있어요.";

type Props = {
  onBack: () => void;
  onUtterance: (text: string) => void;
  skipGreeting?: boolean;
  largeText: boolean;
  onToggleFontSize: () => void;
  speakWithSubtitle: (text: string, onEnd?: () => void) => void;
  setSubtitleText: (text: string) => void;
  subtitleText: string;
};

export function VoiceOrderScreen({
  onBack,
  onUtterance,
  skipGreeting = false,
  largeText,
  onToggleFontSize,
  speakWithSubtitle,
  setSubtitleText,
  subtitleText,
}: Props) {
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
        setSubtitleText("");
        setVoiceState("processing");
        onUtterance(text);
      },
      onInterimResult: (text) => {
        // Show real-time interim STT results so user knows what is being heard
        setSubtitleText(`듣고 있는 중: "${text}"`);
      },
      onError: (msg) => {
        setVoiceState("error");
        speakWithSubtitle(msg);
      },
    });
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

    setVoiceState("speaking");
    speakWithSubtitle(GREETING, () => {
      if (!cancelled) {
        if (supported) startListening();
        else setVoiceState("error");
      }
    });

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
      <KioskHeader
        largeText={largeText}
        onToggleFontSize={onToggleFontSize}
        onBack={onBack}
        onReplay={supported ? startListening : undefined}
      />
      <main className="voice-center">
        <div className="voice-center__greeting">
          <p className="voice-center__line" style={{ fontSize: "var(--fz-heading)", fontWeight: "800" }}>
            {GREETING}
          </p>
        </div>
        <VoiceWaveform active={listening} />
        <MicButton
          active={voiceState === "listening"}
          onClick={supported ? startListening : undefined}
        />
        <p className="voice-center__status" aria-live="polite">
          {voiceStateLabel(voiceState)}
        </p>

        {/* Manual Keyboard/Submit Fallback for Hearing/Speech Impaired or Error state */}
        {!supported || voiceState === "error" || voiceState === "listening" ? (
          <div className="voice-fallback">
            <p className="voice-fallback__hint">
              글자로 입력하시려면 아래 적고 [확인]을 눌러 주세요.
            </p>
            <div className="voice-fallback__row">
              <input
                className="voice-fallback__input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="예: 따뜻한 커피 한 잔이랑 단팥빵 하나 주세요"
                onKeyDown={(e) => e.key === "Enter" && submitTest()}
                aria-label="직접 주문 글자 입력"
              />
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={submitTest}
                style={{ width: "120px", minHeight: "80px" }}
              >
                확인
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Real-time Subtitles Overlay */}
      <SubtitleBar text={subtitleText} />

      {/* Progress tracker */}
      <ProgressBar currentStep="order" />
    </div>
  );
}
