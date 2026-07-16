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
    opts.onError("이 기기에서는 음성 인식을 사용할 수 없습니다.");
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
        else opts.onError("음성이 잘 들리지 않았습니다. 다시 한 번 말씀해 주세요.");
      } else {
        opts.onInterimResult?.(text);
      }
    } else {
      if (text) opts.onResult(text);
      else opts.onError("음성이 잘 들리지 않았습니다. 다시 한 번 말씀해 주세요.");
    }
  };
  rec.onerror = () => opts.onError("음성을 인식하지 못했습니다. 다시 시도하시거나 화면에서 선택해 주세요.");
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
      return "안내 음성이 나오고 있습니다";
    case "cue":
      return "잠시 후 말씀하실 수 있습니다";
    case "listening":
      return "말씀을 듣고 있습니다";
    case "processing":
      return "주문 내용을 확인하고 있습니다";
    case "error":
      return "음성을 인식하지 못했습니다";
    default:
      return "";
  }
}
// ── 서버 TTS 오디오 재생 (Google) + 브라우저 폴백 ──────────────────────────
// iOS Safari는 사용자 제스처 없이 audio.play()를 차단한다. 첫 터치 제스처에서
// unlockAudioPlayback()으로 "재생 이력이 있는" 엘리먼트를 만들어 두고 재사용한다.
let sharedAudio: HTMLAudioElement | null = null;
let playing = false;
let resolveCurrent: (() => void) | null = null;

// 무음 0.01초 16kHz mono WAV — 잠금 해제용
const SILENT_WAV =
  "data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YUABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

/** 첫 사용자 터치 제스처에서 호출 — iOS/Android 오디오 자동재생 잠금 해제 */
export function unlockAudioPlayback(): void {
  if (!sharedAudio) sharedAudio = new Audio();
  sharedAudio.src = SILENT_WAV;
  void sharedAudio.play().catch(() => {
    /* 이미 잠금 해제됐거나 미지원 — 실재생 시 재시도 */
  });
  // speechSynthesis도 제스처 안에서 한 번 호출해 두면 이후 폴백 발화가 허용된다
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
  primeBeep(); // '지금 말하세요' 삐 소리용 오디오 컨텍스트도 제스처 안에서 깨워 둔다(iOS)
}

// ── '지금 말씀하세요' 안내음(삐) ────────────────────────────────
// 어르신이 언제 말해야 할지 알 수 있도록, 마이크가 열리는 순간 부드러운 두 음을 낸다.
let beepCtx: AudioContext | null = null;

function getBeepCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!beepCtx || beepCtx.state === "closed") beepCtx = new Ctor();
    return beepCtx;
  } catch {
    return null;
  }
}

/** 첫 터치에서 미리 컨텍스트를 깨워 둔다(iOS는 제스처 밖 resume을 막음) */
function primeBeep(): void {
  const ctx = getBeepCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

/** 마이크가 열릴 때 부드러운 두 음("딩-동")을 내고, 끝나면 resolve */
export async function playBeep(): Promise<void> {
  const ctx = getBeepCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const now = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.22, now + start + 0.02); // 부드러운 페이드로 '딱' 소리 방지
      gain.gain.linearRampToValueAtTime(0, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    // 올라가는 두 음 — '이제 말하세요' 신호로 자연스럽다
    tone(660, 0, 0.16);
    tone(880, 0.14, 0.24);
    await new Promise((r) => setTimeout(r, 420));
  } catch {
    /* 삐 소리 실패해도 화면의 '지금 말씀하세요' 신호로 진행 */
  }
}

function settleCurrent(): void {
  if (resolveCurrent) {
    const r = resolveCurrent;
    resolveCurrent = null;
    r();
  }
  playing = false;
}

export function stopAllAudio(): void {
  if (sharedAudio && playing) sharedAudio.pause();
  settleCurrent(); // 중단된 재생의 await가 영원히 걸리지 않도록 즉시 resolve
  window.speechSynthesis.cancel();
}

/** base64 오디오 재생. 끝나면(또는 중단되면) resolve. */
export function playBase64Audio(b64: string, mime = "audio/mpeg"): Promise<void> {
  stopAllAudio();
  return new Promise((resolve) => {
    if (!sharedAudio) sharedAudio = new Audio();
    const audio = sharedAudio;
    resolveCurrent = resolve;
    playing = true;
    audio.onended = settleCurrent;
    audio.onerror = settleCurrent;
    audio.src = `data:${mime};base64,${b64}`;
    void audio.play().catch(() => settleCurrent());
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
