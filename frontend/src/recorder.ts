/**
 * WAV 녹음기 — MediaRecorder의 브라우저별 코덱 편차(webm/ogg/mp4)를 피하기 위해
 * AudioContext로 PCM을 받아 16kHz 모노 WAV로 직접 인코딩한다.
 * (CLOVA Speech·Gemini 모두 wav를 확실히 지원 — 벤더 편차 제거)
 *
 * 태블릿(iPad Safari·갤럭시탭 Chrome) 지원:
 * - AudioContext는 사용자 제스처 안에서만 생성/resume 가능 → 모듈 공유 + unlockRecorder()
 * - iOS는 마이크 세션 시작 시 하드웨어 샘플레이트가 바뀔 수 있음 → 불일치 시 재생성
 */

export type RecordingResult = {
  blob: Blob;
  /** 트림 전 최대 진폭(0~1) — 거의 0이면 무음/마이크 문제로 판단 */
  peak: number;
  /** 무음 트림 후 남은 구간 길이(ms) — 실제 발화가 있었는지 판단 */
  voicedMs: number;
};

export type Recorder = {
  /** 녹음을 멈추고 무음 트림 + 볼륨 정규화된 WAV를 돌려준다 */
  stop: () => Promise<RecordingResult>;
  /** 자원만 해제 (결과 불필요 시) */
  cancel: () => void;
};

const TARGET_RATE = 16000;

type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext!;
}

// iOS Safari는 AudioContext 동시 생성 수를 제한하므로 닫지 않고 재사용한다
let sharedCtx: AudioContext | null = null;

function getSharedCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    const Ctor = audioContextCtor();
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** 첫 사용자 터치 제스처에서 호출 — iOS/Android의 오디오 잠금을 미리 해제한다 */
export function unlockRecorder(): void {
  try {
    const ctx = getSharedCtx();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* AudioContext 미지원 기기 — startRecording에서 다시 시도 */
  }
}

export async function startRecording(): Promise<Recorder> {
  // 제스처 체인이 살아 있는 동안(= getUserMedia await 이전) 컨텍스트를 깨운다
  let ctx = getSharedCtx();
  if (ctx.state === "suspended") void ctx.resume();

  const stream = await navigator.mediaDevices.getUserMedia({
    // autoGainControl: 작게 말하는 어르신·시끄러운 매장에서 입력 레벨을 기기가 자동 보정
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });

  // iOS: 마이크 세션이 열리면 출력 샘플레이트가 44.1k↔48k로 바뀌는 경우가 있어
  // 컨텍스트 레이트와 트랙 레이트가 다르면 재생성한다 (왜곡·속도 이상 방지)
  const trackRate = stream.getAudioTracks()[0]?.getSettings?.().sampleRate;
  if (typeof trackRate === "number" && trackRate > 0 && Math.abs(ctx.sampleRate - trackRate) > 1) {
    void ctx.close();
    const Ctor = audioContextCtor();
    sharedCtx = new Ctor();
    ctx = sharedCtx;
  }
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor는 구식이지만 Pi Chromium·iPad Safari 포함 전 브라우저에서 안정 동작
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  processor.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(ctx.destination);

  const cleanup = () => {
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    // 컨텍스트는 닫지 않는다 — iOS에서 재사용 (생성 제한 회피)
  };

  return {
    stop: async () => {
      const sampleRate = ctx.sampleRate;
      cleanup();
      const samples = mergeChunks(chunks);
      const peak = peakOf(samples);
      const trimmed = trimSilence(samples, sampleRate, peak);
      const voicedMs = Math.round((trimmed.length / sampleRate) * 1000);
      normalizeInPlace(trimmed, peak);
      return { blob: encodeWav(trimmed, sampleRate, TARGET_RATE), peak, voicedMs };
    },
    cancel: cleanup,
  };
}

function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  return peak;
}

/** 앞뒤 무음 제거 — 매장 소음 구간을 STT에 보내지 않아 인식률과 속도를 함께 올린다 */
function trimSilence(samples: Float32Array, sampleRate: number, peak: number): Float32Array {
  if (peak <= 0) return samples;
  // 문턱: 최대 진폭의 10% (최소 0.008) — 배경 소음은 버리고 말소리만 남긴다
  const threshold = Math.max(0.008, peak * 0.1);
  let start = 0;
  let end = samples.length - 1;
  while (start < samples.length && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  if (start >= end) return samples;
  const pad = Math.round(sampleRate * 0.2); // 말머리·말꼬리 0.2초 여유
  start = Math.max(0, start - pad);
  end = Math.min(samples.length - 1, end + pad);
  return samples.subarray(start, end + 1);
}

/** 볼륨 정규화 — 작은 목소리를 STT가 듣기 좋은 크기로 증폭 (과증폭은 8배까지만) */
function normalizeInPlace(samples: Float32Array, peak: number): void {
  if (peak <= 0 || peak >= 0.9) return;
  const gain = Math.min(0.9 / peak, 8);
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** 단순 선형 보간 다운샘플 → 16bit PCM WAV */
function encodeWav(samples: Float32Array, fromRate: number, toRate: number): Blob {
  let data = samples;
  if (fromRate > toRate) {
    const ratio = fromRate / toRate;
    const len = Math.floor(samples.length / ratio);
    const down = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, samples.length - 1);
      down[i] = samples[i0] + (samples[i1] - samples[i0]) * (pos - i0);
    }
    data = down;
  }

  const buffer = new ArrayBuffer(44 + data.length * 2);
  const v = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  const rate = fromRate > toRate ? toRate : fromRate;

  writeStr(0, "RIFF");
  v.setUint32(4, 36 + data.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, data.length * 2, true);
  let off = 44;
  for (let i = 0; i < data.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
