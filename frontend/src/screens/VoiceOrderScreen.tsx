import { useEffect, useRef, useState } from "react";
import { MicButton, VoiceWaveform } from "../components";
// s1==========================================
// [STT] 구현 백엔드 전송 함수 임포트
// 작성자: 김나우
import {
  speechSupported,
  stopSpeaking,
  voiceStateLabel,
  uploadAudioToSTT,
} from "../speech";
// s1==========================================
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

  // const startListening = () => {
  //   setVoiceState("listening");
  //   stopListen.current?.();
  //   stopListen.current = listenOnce({
  //     onStart: () => setVoiceState("listening"),
  //     onResult: (text) => {
  //       setVoiceState("processing");
  //       onUtterance(text);
  //     },
  //     onError: (msg) => {
  //       setVoiceState("error");
  //       speakError(msg);
  //     },
  //   });
  // };

  // s2==============================================================================
  // [STT] STT 연동 처리
  // 작성자: 김나우
  // ==============================================================================
  const startListening = async () => {
    setVoiceState("listening");
    stopListen.current?.();

    try {
      // 1. 사용자 마이크 권한 요청 및 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      // 2. 녹음 시작 시 중단(Stop) 명령 정의
      stopListen.current = () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        stream.getTracks().forEach(track => track.stop());
      };

      // 3. 소리가 들어올 때마다 오디오 조각 수집
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      // 4. 말 소리가 끝나서 녹음이 완전히 종료되었을 때의 처리
      mediaRecorder.onstop = async () => {
        setVoiceState("processing");
        
        // 수집된 오디오 조각들을 하나의 블롭 파일 객체로 조립
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        
        try {
          // 김나우 구현 파트: 백엔드 API로 전달하여 힌트가 보정된 한글 메뉴명 텍스트 추출
          const recognizedText = await uploadAudioToSTT(audioBlob);
          
          if (recognizedText) {
            onUtterance(recognizedText); // 추출된 정밀 텍스트를 팀원들의 해석 엔진으로 전달
          } else {
            throw new Error("음성 텍스트 변환 결과가 빈 값입니다.");
          }
        } catch (err) {
          setVoiceState("error");
          speakError("말씀이 잘 들리지 않았어요. 다시 시도해 주세요.");
        }
      };

      // 5. 녹음 개시 (실제 키오스크 사용 환경을 고려해 4초간 듣고 자동 완료 처리)
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          stopListen.current?.();
        }
      }, 4000);

    } catch (err) {
      setVoiceState("error");
      speakError("마이크 권한을 승인해 주셔야 음성 주문이 가능해요.");
    }
  };
  // s2==============================================================================


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