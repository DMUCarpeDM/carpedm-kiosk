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

# 사용법: bash scripts/setup-pi-kiosk.sh [회전각]
#   회전각(선택): 90 | 180 | 270 — 세로 설치 모니터용 화면 회전을 부팅마다 자동 적용.
#   (wlr-randr를 손으로 치면 재부팅 시 풀린다 — 여기 등록해야 고정됨)
ROTATE="${1:-}"
case "$ROTATE" in ""|90|180|270) ;; *) echo "회전각은 90|180|270 중 하나"; exit 1;; esac

# 크로미움 실행 파일 이름이 OS 버전에 따라 다름
if command -v chromium-browser >/dev/null 2>&1; then CHROMIUM=chromium-browser
elif command -v chromium >/dev/null 2>&1; then CHROMIUM=chromium
else echo "크로미움이 없습니다: sudo apt install -y chromium-browser"; exit 1; fi

# ── 1) 실행 래퍼: (회전 적용 →) 서버 대기(최대 90초) → 전체화면 실행 ──
ROTATE_CMD=""
if [ -n "$ROTATE" ]; then
  # 출력 이름(HDMI-A-1 등)은 부팅 시점에 자동 감지. 실패해도 키오스크는 계속 뜬다.
  ROTATE_CMD="OUT=\$(wlr-randr 2>/dev/null | awk 'NR==1{print \$1}'); [ -n \"\$OUT\" ] && wlr-randr --output \"\$OUT\" --transform $ROTATE || true"
fi

cat > "$HOME/kiosk-launch.sh" <<EOF
#!/bin/bash
$ROTATE_CMD

# 화면 절전·블랭킹 방지 — 무인 키오스크는 손님이 없어도 화면이 꺼지면 안 된다.
# (X11 세션이면 xset가 먹고, Wayland/labwc는 기본적으로 블랭킹이 없다. 둘 다 무해)
xset s off -dpms s noblank 2>/dev/null || true

# 정전·강제종료 후 뜨는 "이전 페이지를 복원하시겠습니까?" 풍선을 막는다 —
# 지난 세션을 '정상 종료'로 표시해 복원 배너·크래시 버블이 안 뜨게 한다.
PREF="\$HOME/.config/chromium/Default/Preferences"
[ -f "\$PREF" ] && sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "\$PREF" 2>/dev/null || true

# 서버(vite preview)가 응답할 때까지 최대 90초 대기 후 전체화면 실행
for i in \$(seq 1 90); do
  curl -s -o /dev/null "$URL" && break
  sleep 1
done

# 키오스크 플래그:
#  --password-store=basic       gnome-keyring 잠금해제 대기로 부팅 시 멈추는 것 방지(파이 필수)
#  --disable-session-crashed-bubble / --disable-features=InfiniteSessionRestore  정전 후 복원 배너 차단
#  --use-fake-ui-for-media-stream  마이크 권한 팝업 자동 허용(음성 주문)
#  --autoplay-policy=...        인사말 TTS가 사용자 제스처 없이도 재생되게
#  --disable-pinch / --overscroll-history-navigation=0  터치 확대·스와이프 뒤로가기 오작동 방지
exec $CHROMIUM --kiosk --noerrdialogs --disable-infobars \\
  --check-for-update-interval=31536000 \\
  --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required \\
  --password-store=basic \\
  --disable-session-crashed-bubble --disable-features=InfiniteSessionRestore,Translate \\
  --disable-pinch --overscroll-history-navigation=0 --hide-scrollbars \\
  --disable-component-update "$URL"
EOF
chmod +x "$HOME/kiosk-launch.sh"
echo "✓ 실행 래퍼: ~/kiosk-launch.sh$([ -n "$ROTATE" ] && echo " (화면 회전 ${ROTATE}° 포함)")"

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
