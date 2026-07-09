#!/bin/bash
# 태블릿(iPad·갤럭시탭) 실증용 서버 — 프론트 빌드 + 백엔드를 HTTPS 단일 포트로 서빙
# 사용법: bash scripts/serve-tablet.sh [포트]   (기본 8443)
# 사전 준비: scripts/make-tls-cert.sh 로 인증서 생성 (docs/tablet.md)
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

PORT="${1:-8443}"
CERT="secrets/tls/kiosk.pem"
KEY="secrets/tls/kiosk-key.pem"

if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "인증서가 없습니다. 먼저 실행: bash scripts/make-tls-cert.sh"
  exit 1
fi

echo "프론트 빌드 중..."
(cd frontend && npm run build)

IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -v '^127\.' | head -1)
echo ""
echo "================================================"
echo "  태블릿 브라우저에서 접속: https://${IP:-<서버IP>}:$PORT"
echo "  (서버와 태블릿이 같은 Wi-Fi에 있어야 함)"
echo "================================================"
echo ""

.venv/bin/uvicorn backend.app:app --host 0.0.0.0 --port "$PORT" \
  --ssl-certfile "$CERT" --ssl-keyfile "$KEY"
