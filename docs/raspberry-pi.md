# 라즈베리파이 5 키오스크 배포 가이드

> 대상: Raspberry Pi 5 (4GB+) + Raspberry Pi OS (64-bit, Bookworm) + 10.1" 터치스크린 + Anker 마이크(AEC)
> 원칙: Pi는 thin client — STT/LLM/TTS는 전부 클라우드. Pi에서는 서버 2개(백엔드·프론트)와 Chromium만 돈다.

## 0. 준비물 체크리스트

- [ ] Raspberry Pi 5 + 전원(공식 27W 권장 — 저전력 어댑터는 USB 마이크와 함께 쓰면 불안정)
- [ ] 10.1" 터치스크린 (HDMI + USB 터치)
- [ ] Anker PowerConf 등 AEC 지원 USB 마이크(스피커 내장이면 TTS도 그쪽으로)
- [ ] microSD 32GB+ (Raspberry Pi OS 64-bit)
- [ ] 매장/실증 장소의 Wi-Fi 정보 (클라우드 API 호출용 — **인터넷 필수**)
- [ ] `.env` 값 (CLOVA·Google·Anthropic 키) — USB나 직접 입력으로 옮긴다. 절대 카톡·메일로 보내지 않기

## 1. OS 기본 설정

```bash
sudo raspi-config
# System Options → Boot / Auto Login → Desktop Autologin
# Display Options → Screen Blanking → No (화면 꺼짐 방지)
sudo apt update && sudo apt install -y git python3-venv nodejs npm chromium-browser
```

한국어 폰트(화면 표시용):
```bash
sudo apt install -y fonts-noto-cjk
```

## 2. 프로젝트 설치

```bash
cd ~
git clone https://github.com/DMUCarpeDM/carpedm-kiosk.git
cd carpedm-kiosk

# 백엔드
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env    # 키 입력

# 프론트 (Pi에서는 빌드 결과물을 서빙 — dev 서버보다 가볍다)
cd frontend && npm install && npm run build && cd ..
```

동작 확인:
```bash
source .venv/bin/activate
python scripts/smoke_voice.py        # TTS·STT 실연동 확인
python -m uvicorn backend.app:app --port 8000 &
npx --prefix frontend vite preview --port 5173 --strictPort &
chromium-browser http://localhost:5173   # 수동 확인
```

## 3. 마이크·스피커 설정

```bash
arecord -l          # 마이크 카드 번호 확인 (예: card 2)
aplay -l            # 스피커 확인
alsamixer           # F6로 장치 선택, 입력 볼륨 80% 내외
arecord -D plughw:2,0 -f S16_LE -r 16000 -d 3 test.wav && aplay test.wav   # 3초 녹음 테스트
```

- 브라우저 마이크 권한: Chromium은 `http://localhost`에서 마이크를 허용한다(HTTPS 불필요).
  키오스크 모드 실행 인자에 `--use-fake-ui-for-media-stream`을 넣으면 권한 팝업 없이 자동 허용된다.
- Anker 마이크의 AEC(반향 제거)가 켜져 있으면 TTS가 스피커로 나가는 동안 녹음해도 잡음이 적다.

## 4. 자동 시작 (systemd)

`/etc/systemd/system/kiosk-backend.service`:
```ini
[Unit]
Description=CarpeDM Kiosk Backend
After=network-online.target
Wants=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/carpedm-kiosk
ExecStart=/home/pi/carpedm-kiosk/.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/kiosk-frontend.service`:
```ini
[Unit]
Description=CarpeDM Kiosk Frontend (vite preview)
After=kiosk-backend.service

[Service]
User=pi
WorkingDirectory=/home/pi/carpedm-kiosk/frontend
ExecStart=/usr/bin/npx vite preview --port 5173 --strictPort
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> 주의: `vite preview`는 프록시를 지원하지 않으므로, 프론트 빌드 시 백엔드 주소를 환경변수로 박는다:
> `VITE_API_BASE=http://127.0.0.1:8000 npm run build`
> (api.ts가 `VITE_API_BASE`를 읽는다 — 이미 구현돼 있음)

Chromium 키오스크 자동 실행 — `~/.config/autostart/kiosk.desktop`:
```ini
[Desktop Entry]
Type=Application
Name=CarpeDM Kiosk
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required http://localhost:5173
```

활성화:
```bash
sudo systemctl enable --now kiosk-backend kiosk-frontend
sudo reboot   # 재부팅하면 키오스크 화면까지 자동으로 뜬다
```

## 5. 현장 리허설 체크리스트 (실증 전날)

- [ ] 부팅 → 키오스크 화면까지 자동 진입 (전원만 꽂으면 됨)
- [ ] 음성 주문 1사이클: "불고기버거 세트 하나 주세요" → 장바구니 반영 + 음성 안내
- [ ] Wi-Fi 끊고: 규칙 폴백 + 터치 주문이 계속 되는지 (안내 배너 표시 확인)
- [ ] 알레르기 게이트, 낮은 화면·큰 글씨 모드, 직원 호출 동작
- [ ] 발화 로그 쌓이는지: `tail -f data/logs/utterances.jsonl` (실증 데이터 수집 확인)
- [ ] 화면 밝기·스피커 볼륨을 현장(경로당) 소음 수준에 맞춰 조정

## 6. 문제 해결

| 증상 | 확인 |
|---|---|
| 마이크가 안 잡힘 | `arecord -l`에 장치가 보이는지, Chromium 실행 인자에 `--use-fake-ui-for-media-stream` 있는지 |
| STT 401/404 | `.env`의 CLOVA 값 — `python scripts/smoke_voice.py`로 단독 확인 |
| 음성은 되는데 느림 | `data/logs/utterances.jsonl`의 stt_ms/interpret_ms/tts_ms로 병목 확인 |
| 화면이 꺼짐 | raspi-config Screen Blanking 끄기 |
| 서버 죽음 | `systemctl status kiosk-backend`, `journalctl -u kiosk-backend -n 50` |
