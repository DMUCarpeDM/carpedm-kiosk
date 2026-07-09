import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

// 백엔드 주소 — 다른 포트에서 띄울 때: KIOSK_BACKEND=http://127.0.0.1:8001 npm run dev
const backend = process.env.KIOSK_BACKEND ?? "http://127.0.0.1:8000";

// 태블릿(iPad·갤럭시탭) 접속용 HTTPS — 마이크 권한은 localhost 밖에서 HTTPS 필수.
// scripts/make-tls-cert.sh 로 인증서 생성 후:
//   KIOSK_TLS_CERT=../secrets/tls/kiosk.pem KIOSK_TLS_KEY=../secrets/tls/kiosk-key.pem npm run dev
const certFile = process.env.KIOSK_TLS_CERT;
const keyFile = process.env.KIOSK_TLS_KEY;
const https =
  certFile && keyFile && fs.existsSync(certFile) && fs.existsSync(keyFile)
    ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // LAN의 태블릿에서 접속 허용
    port: 5173,
    https,
    proxy: {
      "/api": backend,
      "/order": backend,
      "/healthz": backend,
    },
  },
});
