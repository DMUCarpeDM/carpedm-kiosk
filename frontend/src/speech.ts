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
/** s1========================================================================
 * [STT] 녹음된 오디오 데이터를 백엔드 API 서버로 전송하여 텍스트를 받아오는 함수
 * 작성자: 김나우
 */
export async function uploadAudioToSTT(audioBlob: Blob): Promise<string> {
  // 1. 백엔드에서 UploadFile로 받을 수 있도록 FormData 객체 생성
  const formData = new FormData();
  
  // 2. 오디오 파일 객체를 'file'이라는 이름으로 폼 데이터에 탑재 (확장자는 wav 기준)
  formData.append("file", audioBlob, "record.wav");

  try {
    // 3. 나우님이 뚫어놓은 백엔드 /api/stt 주소로 전송 요청
    const response = await fetch("http://127.0.0.1:8000/api/stt", {
      method: "POST",
      body: formData, // JSON이 아닌 멀티파트 폼 데이터 형식으로 전송
    });

    if (!response.ok) {
      throw new Error(`서버 응답 에러: ${response.status}`);
    }

    // 4. 백엔드가 반환한 {"text": stt_result} 형태의 데이터 파싱
    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // 5. 성공적으로 받아온 받아쓰기 문자열 반환
    return result.text || "";
  } catch (error) {
    console.error("STT 전송 실패:", error);
    throw error;
  }
}
/** s1======================================================================== 
 */
