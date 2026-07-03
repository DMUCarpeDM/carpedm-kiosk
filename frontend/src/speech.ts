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

export function speak(text: string, onStart?: () => void, onEnd?: () => void): void {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.88; // Slower, clear speed for seniors (brief §7)
  
  if (onStart) u.onstart = onStart;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd; // fallback on error to clear subtitle state
  }
  
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}

type ListenOpts = {
  onStart?: () => void;
  onResult: (text: string) => void;
  onInterimResult?: (text: string) => void;
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
  rec.interimResults = !!opts.onInterimResult;
  rec.maxAlternatives = 1;

  rec.onstart = () => opts.onStart?.();
  rec.onresult = (ev: SpeechRecognitionEvent) => {
    const results = ev.results;
    const lastIdx = results.length - 1;
    const result = results[lastIdx];
    const text = result?.[0]?.transcript?.trim() ?? "";
    
    // Check if webkitSpeechRecognition supports isFinal on result
    const isFinal = (result as any).isFinal;

    if (rec.interimResults) {
      if (isFinal) {
        if (text) opts.onResult(text);
        else opts.onError("말씀이 잘 들리지 않았어요. 다시 말씀해 주세요.");
      } else {
        opts.onInterimResult?.(text);
      }
    } else {
      if (text) opts.onResult(text);
      else opts.onError("말씀이 잘 들리지 않았어요. 다시 말씀해 주세요.");
    }
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
      return "말씀 키오스크가 대답하는 중이에요…";
    case "listening":
      return "듣는 중이에요, 천천히 말씀해 주세요…";
    case "processing":
      return "어르신의 말씀을 이해하는 중이에요…";
    case "error":
      return "음성 인식에 오류가 생겼어요";
    default:
      return "";
  }
}
// ── 서버 TTS 오디오 재생 (Google) + 브라우저 폴백 ──────────────────────────
let currentAudio: HTMLAudioElement | null = null;

export function stopAllAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis.cancel();
}

/** base64 오디오 재생. 끝나면 resolve. */
export function playBase64Audio(b64: string, mime = "audio/mpeg"): Promise<void> {
  stopAllAudio();
  return new Promise((resolve) => {
    const audio = new Audio(`data:${mime};base64,${b64}`);
    currentAudio = audio;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    void audio.play().catch(() => resolve());
  });
}

/** 안내 음성 재생: 서버 TTS 오디오(b64)가 있으면 그것을, 없으면 브라우저 TTS. */
export function playSpeech(say: string, audioB64: string | null | undefined, mime?: string): Promise<void> {
  if (audioB64) return playBase64Audio(audioB64, mime);
  if (!say) return Promise.resolve();
  return new Promise((resolve) => {
    speak(say, undefined, () => resolve());
  });
}
