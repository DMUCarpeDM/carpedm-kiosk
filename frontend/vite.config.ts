import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 백엔드 주소 — 다른 포트에서 띄울 때: KIOSK_BACKEND=http://127.0.0.1:8001 npm run dev
const backend = process.env.KIOSK_BACKEND ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": backend,
      "/order": backend,
      "/healthz": backend,
    },
  },
});
