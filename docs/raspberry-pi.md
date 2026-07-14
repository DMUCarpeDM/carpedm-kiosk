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

## 3.5 인체 감지 — 카메라 (기본) 또는 PIR 센서

손님이 다가오면 대기 화면이 걷히며 "어서 오세요" 인사가 나가는 기능.
카메라·센서가 없어도 키오스크는 정상 동작한다(자동 비활성).

기본은 **카메라 방식**이다: 웹캠/파이 카메라로 얼굴을 검출하고, 얼굴이 화면에서 일정 크기
이상(=가까이 다가옴)이면 감지한다. 가벼운 고전 CV(OpenCV Haar)라 파이5에서 부담이 적고,
클라우드 추론이 아니라 센서 대체다. **개인정보: 카메라 영상은 메모리에서만 처리하고 저장·전송하지
않는다. '있음/없음' 상태값만 쓴다.**

### 방식 A — 카메라 (권장)

```bash
source .venv/bin/activate
# 파이는 apt 패키지가 가장 안정적(권장)
sudo apt install -y python3-opencv
# 또는 pip: pip install "opencv-python-headless>=4.9,<5"

# USB 웹캠 또는 파이 카메라 연결 후 인식 확인
ls /dev/video*            # video0 등이 보이면 OK
# .env: KIOSK_PRESENCE=auto(기본, 파이에서 카메라 자동 시도) 또는 camera(강제)
```

동작 확인: 서버 켠 뒤 `curl localhost:8000/api/presence` →
카메라 앞으로 **얼굴을 가까이** 가져가면 `"present": true`.
- 너무 멀리서도 잡히면 `.env`의 `KIOSK_CAM_MIN_FACE`를 올린다(예 0.25 = 더 가까워야 감지).
- 너무 가까워야만 잡히면 내린다(예 0.12).
- 카메라 장치 번호가 0이 아니면 `KIOSK_CAM_INDEX` 조정.

### 방식 B — PIR 센서 (HC-SR501)

카메라 대신 하드웨어 센서를 쓰려면 `.env`에 `KIOSK_PRESENCE=pir`.

**배선 (F/F 점퍼 케이블 3개, 브레드보드 없이 직결 가능):**

| HC-SR501 핀 | 라즈베리파이 핀 |
|---|---|
| VCC | 2번 핀 (5V) |
| OUT | 11번 핀 (GPIO17) |
| GND | 6번 핀 (GND) |

> 파이 핀 번호는 SD카드 슬롯을 위로 뒀을 때 왼쪽 위가 1번, 그 오른쪽이 2번(지그재그).
> `pinout` 명령을 치면 그림으로 확인할 수 있다.

**센서 조절 (기판의 주황색 노브 2개):**
- Sx(감도): 중간 — 시계 방향일수록 감지 거리가 길어짐 (최대 ~7m, 실증은 3m 내외 권장)
- Tx(유지 시간): **반시계 끝(최소)** — 코드가 자체적으로 유지 시간을 관리하므로 센서는 짧게
- 점퍼는 H(반복 트리거) 위치

```bash
pip install gpiozero lgpio      # 파이에서만 필요
# .env: KIOSK_PRESENCE=pir, 핀을 바꿨다면 KIOSK_PIR_PIN 수정
```

### 공통

프론트는 45초간 조작이 없으면 대기 화면으로 바뀌고, 사람을 감지하면 인사와 함께 깨어난다.
카메라·센서 없이 대기 화면을 시험하려면 브라우저에서 `http://localhost:5173/?attract=1`.

## 3.6 화면·터치 세로 회전 (중요)

10.1" 패널은 공장 기본이 **가로(1280×800 또는 1024×600)**다. 키오스크는 세로 전용이므로 둘 다 돌려야 한다:

**① 화면 회전 (Raspberry Pi OS Bookworm, 화면 메뉴):**
- 시작 메뉴 → 기본 설정 → **Screen Configuration** → 화면 우클릭 → Orientation → **Right**(시계 방향 90°) → 적용
- 재부팅 후에도 유지된다. UI가 위아래 뒤집혔으면 Left로.

**② 터치 좌표 회전 (화면만 돌리면 터치가 어긋난다!):**
Screen Configuration에서 회전하면 최신 OS는 터치도 함께 돌려 준다. 만약 터치가 90° 어긋나면:
```bash
# 터치 장치 이름 확인
libinput list-devices | grep -A2 -i touch
# /usr/share/X11/xorg.conf.d/40-libinput.conf 의 touchscreen 섹션에 추가 (X11인 경우):
#   Option "CalibrationMatrix" "0 1 0 -1 0 1 0 0 1"     ← Right 회전용
sudo reboot
```

**③ 확인:** 부팅 후 화면이 세로이고, 화면 모서리를 눌렀을 때 정확히 그 지점이 눌리면 완료.
키오스크 앱은 화면 폭에 비례해 자동으로 크기를 맞춘다(600·800 폭 모두 지원).
가로 상태로 켜면 앱이 "세로 화면 전용입니다" 안내를 띄우니, 그 화면이 보이면 이 절로 돌아올 것.

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

## 4.5 업데이트 — 파이에 새 버전 반영하기

전제: 맥에서 먼저 `git push` 되어 있어야 한다 (파이는 GitHub에서 받는다).

```bash
cd ~/carpedm-kiosk

# 1) 새 코드 받기 — 작업 브랜치가 바뀌었으면 checkout부터
git fetch origin
git checkout feature/tablet-support   # 최신 작업 브랜치 (이미 이 브랜치면 생략)
git pull

# 2) 백엔드 의존성 (카메라 인체감지용 opencv 추가됨 — 몇 분 걸릴 수 있음)
source .venv/bin/activate
pip install -r requirements.txt

# 3) 프론트 다시 빌드 (vite preview는 프록시가 없으므로 백엔드 주소를 박는다)
cd frontend
npm install
VITE_API_BASE=http://127.0.0.1:8000 npm run build
cd ..

# 4) 서비스 재시작
sudo systemctl restart kiosk-backend kiosk-frontend
```

확인: `curl localhost:8000/healthz` → ok:true, 브라우저 새로고침(Chromium에서 F5
또는 재부팅) 후 메뉴판에 **실사진**이 뜨면 성공. 이미지가 예전 것으로 보이면
Chromium 캐시 — `Ctrl+Shift+R` 강력 새로고침.

> 현장에 인터넷이 없어 GitHub를 못 받을 때(비상용): 맥에서 직접 전송
> ```bash
> rsync -av --exclude node_modules --exclude .venv --exclude dist --exclude .git \
>   ~/Desktop/LivingLab/carpedm-kiosk/ pi@<파이IP>:~/carpedm-kiosk/
> ```
> 그 후 파이에서 위 2)~4)만 실행.

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
