import type { VoiceState } from "./types";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null && "speechSynthesis" in window;
}

export function speak(text: string, onEnd?: () => void): void {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.95;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}

type ListenOpts = {
  onStart?: () => void;
  onResult: (text: string) => void;
  onError: (message: string) => void;
};

export function listenOnce(opts: ListenOpts): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    opts.onError("이 기기에서는 음성 인식을 쓸 수 없어요.");
    return () => {};
  }

  const rec = new Ctor();
  rec.lang = "ko-KR";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => opts.onStart?.();
  rec.onresult = (ev: SpeechRecognitionEvent) => {
    const text = ev.results[0]?.[0]?.transcript?.trim() ?? "";
    if (text) opts.onResult(text);
    else opts.onError("말씀이 잘 들리지 않았어요. 다시 말씀해 주세요.");
  };
  rec.onerror = () => opts.onError("음성 인식에 실패했어요. 다시 시도하거나 버튼으로 골라 주세요.");
  rec.onend = () => {};

  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}

export function voiceStateLabel(state: VoiceState): string {
  switch (state) {
    case "speaking":
      return "안내 중이에요…";
    case "listening":
      return "듣고 있어요… 말씀해 주세요";
    case "processing":
      return "주문을 확인하고 있어요…";
    case "error":
      return "음성 인식에 문제가 있어요";
    default:
      return "";
  }
}

// ponytail: MVP에서는 Web Speech API만 지원한다. 실제 키오스크 하드웨어 확정 후 native STT adapter로 교체한다.
