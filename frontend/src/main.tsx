import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { unlockAudioPlayback } from "./speech";
import { unlockRecorder } from "./recorder";
import "./styles/fonts.css";
import "./styles/lotteria.css";

// iOS Safari·Android Chrome: 오디오 재생/녹음은 사용자 제스처 후에만 허용
// → 첫 터치(대기 화면 터치 포함)에서 한 번만 잠금 해제
window.addEventListener(
  "pointerdown",
  () => {
    unlockAudioPlayback();
    unlockRecorder();
  },
  { once: true },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
