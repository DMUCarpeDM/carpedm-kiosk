#!/bin/bash
# 태블릿(iPad·갤럭시탭) 접속용 로컬 HTTPS 인증서 생성 — docs/tablet.md 참조
#
# 마이크(getUserMedia)는 localhost 밖에서는 HTTPS에서만 동작하므로,
# 태블릿이 서버(맥/파이)에 LAN으로 접속하려면 인증서가 필요하다.
#
# 우선 mkcert 사용(루트 CA를 태블릿에 설치하면 경고 없이 신뢰됨).
# mkcert가 없으면 openssl 자가서명으로 폴백(접속 시 경고를 한 번 통과해야 함).
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
OUT="$DIR/secrets/tls"
mkdir -p "$OUT"

# 이 기기의 LAN IP 전부 수집 (Wi-Fi·유선)
IPS=$(ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -v '^127\.' || hostname -I 2>/dev/null)
HOST=$(hostname)
echo "서버 주소 후보: $HOST $IPS"

if command -v mkcert >/dev/null 2>&1; then
  echo "mkcert 사용 (권장)"
  mkcert -install
  # shellcheck disable=SC2086
  mkcert -cert-file "$OUT/kiosk.pem" -key-file "$OUT/kiosk-key.pem" \
    localhost 127.0.0.1 "$HOST" "$HOST.local" $IPS
  CAROOT=$(mkcert -CAROOT)
  cp "$CAROOT/rootCA.pem" "$OUT/rootCA.pem"
  echo ""
  echo "완료: $OUT/kiosk.pem / kiosk-key.pem"
  echo "태블릿에 설치할 루트 CA: $OUT/rootCA.pem"
  echo "  - iPad: AirDrop·이메일로 보내 설치 → 설정 > 일반 > VPN 및 기기 관리에서 설치"
  echo "          → 설정 > 일반 > 정보 > 인증서 신뢰 설정에서 '전체 신뢰' 켜기"
  echo "  - 갤럭시탭: 설정 > 보안 > 기타 보안 설정 > 인증서 설치 > CA 인증서"
else
  echo "mkcert 없음 → openssl 자가서명으로 생성 (설치 권장: brew install mkcert)"
  SAN="DNS:localhost,DNS:$HOST,DNS:$HOST.local,IP:127.0.0.1"
  for ip in $IPS; do SAN="$SAN,IP:$ip"; done
  openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
    -keyout "$OUT/kiosk-key.pem" -out "$OUT/kiosk.pem" \
    -subj "/CN=CarpeDM Kiosk" -addext "subjectAltName=$SAN"
  echo ""
  echo "완료: $OUT/kiosk.pem / kiosk-key.pem"
  echo "자가서명이므로 태블릿 첫 접속 시 보안 경고가 뜬다 → '이 웹사이트 방문(고급)'으로 진행"
fi
