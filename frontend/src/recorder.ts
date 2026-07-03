/**
 * WAV 녹음기 — MediaRecorder의 브라우저별 코덱 편차(webm/ogg)를 피하기 위해
 * AudioContext로 PCM을 받아 16kHz 모노 WAV로 직접 인코딩한다.
 * (CLOVA Speech·Gemini 모두 wav를 확실히 지원 — 벤더 편차 제거)
 */

export type Recorder = {
  /** 녹음을 멈추고 WAV Blob을 돌려준다 */
  stop: () => Promise<Blob>;
  /** 자원만 해제 (결과 불필요 시) */
  cancel: () => void;
};

const TARGET_RATE = 16000;

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor는 구식이지만 Pi Chromium 포함 전 브라우저에서 안정 동작
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
    void ctx.close();
  };

  return {
    stop: async () => {
      const sampleRate = ctx.sampleRate;
      cleanup();
      return encodeWav(mergeChunks(chunks), sampleRate, TARGET_RATE);
    },
    cancel: cleanup,
  };
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
