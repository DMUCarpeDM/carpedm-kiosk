#!/bin/bash
# 라즈베리파이 부팅 → 키오스크 화면 자동 실행 설정 (파이에서 1회 실행)
#
# 배경: 라즈베리파이 OS Bookworm은 데스크톱이 Wayland(labwc 또는 wayfire)로 바뀌어
# 예전 X11 방식(~/.config/autostart/*.desktop)을 무시할 수 있다.
# → 세 방식(labwc·wayfire·XDG)에 모두 등록해 어떤 구동 방식이든 동작하게 한다.
# 또한 서버(vite preview)가 뜨기 전에 브라우저가 열리는 타이밍 문제를 막기 위해
# "서버 응답 대기 후 실행" 래퍼를 쓴다.
set -e

URL="http://localhost:5173"

# 크로미움 실행 파일 이름이 OS 버전에 따라 다름
if command -v chromium-browser >/dev/null 2>&1; then CHROMIUM=chromium-browser
elif command -v chromium >/dev/null 2>&1; then CHROMIUM=chromium
else echo "크로미움이 없습니다: sudo apt install -y chromium-browser"; exit 1; fi

# ── 1) 실행 래퍼: 서버가 응답할 때까지(최대 90초) 기다렸다가 전체화면 실행 ──
cat > "$HOME/kiosk-launch.sh" <<EOF
#!/bin/bash
for i in \$(seq 1 90); do
  curl -s -o /dev/null "$URL" && break
  sleep 1
done
exec $CHROMIUM --kiosk --noerrdialogs --disable-infobars \\
  --check-for-update-interval=31536000 --use-fake-ui-for-media-stream \\
  --autoplay-policy=no-user-gesture-required "$URL"
EOF
chmod +x "$HOME/kiosk-launch.sh"
echo "✓ 실행 래퍼: ~/kiosk-launch.sh"

# ── 2) labwc (Bookworm 2024-10 이후 기본) ──
mkdir -p "$HOME/.config/labwc"
if ! grep -qs "kiosk-launch" "$HOME/.config/labwc/autostart"; then
  echo "$HOME/kiosk-launch.sh &" >> "$HOME/.config/labwc/autostart"
fi
echo "✓ labwc 자동 시작 등록"

# ── 3) wayfire (Bookworm 초기 기본) ──
WAYFIRE_INI="$HOME/.config/wayfire.ini"
if [ -f "$WAYFIRE_INI" ] && ! grep -qs "kiosk-launch" "$WAYFIRE_INI"; then
  if grep -qs "^\[autostart\]" "$WAYFIRE_INI"; then
    sed -i "/^\[autostart\]/a kiosk = $HOME/kiosk-launch.sh" "$WAYFIRE_INI"
  else
    printf '\n[autostart]\nkiosk = %s\n' "$HOME/kiosk-launch.sh" >> "$WAYFIRE_INI"
  fi
  echo "✓ wayfire 자동 시작 등록"
fi

# ── 4) XDG autostart (X11로 쓰는 경우 대비) ──
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=CarpeDM Kiosk
Exec=$HOME/kiosk-launch.sh
EOF
echo "✓ XDG 자동 시작 등록"

# ── 5) 백엔드·프론트 서비스가 켜져 있는지 확인 ──
echo ""
for svc in kiosk-backend kiosk-frontend; do
  state=$(systemctl is-enabled $svc 2>/dev/null || echo "미등록")
  active=$(systemctl is-active $svc 2>/dev/null || echo "꺼짐")
  echo "$svc: enabled=$state, active=$active"
done
echo ""
echo "서비스가 '미등록/꺼짐'이면: sudo systemctl enable --now kiosk-backend kiosk-frontend"
echo "(서비스 파일 작성은 docs/raspberry-pi.md 4절 참고)"
echo ""
echo "설정 완료 — sudo reboot 후 키오스크 화면이 자동으로 떠야 합니다."
echo "지금 바로 시험하려면: ~/kiosk-launch.sh"
