#!/bin/bash
# 임시 공개 배포 — Cloudflare 임시 터널로 태블릿 테스트용 HTTPS 주소 발급
# 사용법: bash scripts/serve-tunnel.sh [포트]   (기본 8000)
#
# 인증서 설치 없이 아이패드·갤럭시탭에서 바로 접속할 수 있는
# https://<무작위>.trycloudflare.com 주소가 발급된다 (계정 불필요).
#
# ⚠️ 주의
# - 이 주소는 인터넷에 공개된다 (무작위 URL이라 추측은 어렵지만 비밀번호 없음).
#   백엔드는 호출당 과금되는 API(CLOVA·Claude·Google)를 쓰므로 테스트 끝나면 Ctrl+C로 꼭 닫을 것.
# - 주소는 실행할 때마다 바뀐다.
# - LAN 직결(serve-tablet.sh)보다 왕복 지연이 조금 늘어난다.
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

PORT="${1:-8000}"

command -v cloudflared >/dev/null 2>&1 || {
  echo "cloudflared가 필요합니다: brew install cloudflared"
  exit 1
}

if [ ! -d frontend/dist ]; then
  echo "프론트 빌드 중..."
  (cd frontend && npm run build)
fi

if ! curl -s -m 2 "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then
  echo "백엔드 시작 (:$PORT)..."
  .venv/bin/uvicorn backend.app:app --port "$PORT" &
  BACKEND_PID=$!
  trap 'kill $BACKEND_PID 2>/dev/null' EXIT
  for _ in $(seq 1 15); do
    curl -s -m 1 "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1 && break
    sleep 1
  done
else
  echo "이미 떠 있는 백엔드(:$PORT)를 사용합니다."
fi

echo ""
echo "터널을 엽니다 — 아래 박스에 표시되는 https://….trycloudflare.com 주소를"
echo "태블릿 브라우저에 입력하면 됩니다. 종료: Ctrl+C"
echo ""
cloudflared tunnel --url "http://127.0.0.1:$PORT"
