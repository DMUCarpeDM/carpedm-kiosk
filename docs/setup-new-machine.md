# 새 컴퓨터에서 키오스크 서버 세팅 (맥·윈도우)

> 소요 약 15분. 순서대로만 하면 된다. 막히면 각 단계의 "확인"부터 다시.

## 0. 사전 설치 (이미 있으면 건너뜀)

| 프로그램 | 확인 명령 | 설치 |
|---|---|---|
| Git | `git --version` | 맥: 명령 실행 시 자동 안내 / 윈도우: git-scm.com |
| Python 3.12+ | `python3 --version` (윈도우: `python --version`) | python.org — 윈도우는 설치 시 **"Add python.exe to PATH" 체크 필수** |
| Node 20+ | `node --version` | nodejs.org LTS |

## 1. 저장소 받기

```bash
git clone https://github.com/DMUCarpeDM/carpedm-kiosk.git
cd carpedm-kiosk
```

## 2. 백엔드 (Python)

맥:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

윈도우 (PowerShell):
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1     # "스크립트 실행 불가" 오류 시: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt
```

## 3. 프론트 빌드 (한 번만 — 백엔드가 빌드 결과를 직접 서빙한다)

```bash
cd frontend
npm install
npm run build
cd ..
```

## 4. API 키 파일(.env) 받기 — ⚠️ 제일 중요

`.env`는 보안상 저장소에 **없다**. 키를 가진 팀원(지연)의 맥에서 프로젝트 루트의 `.env` 파일을
**에어드랍 또는 USB로** 받아서 이 컴퓨터의 `carpedm-kiosk/` 폴더 바로 안에 넣는다.

- ❌ 카카오톡·메일·단톡방으로 보내지 말 것 (API 키 유출 = 과금 사고)
- 키 없이도 서버는 뜬다 (규칙 해석 + 브라우저 음성 폴백) — 단, CLOVA 인식·AI 해석·TTS는 동작 안 함

## 5. 서버 실행

```bash
# 맥
.venv/bin/python -m uvicorn backend.app:app --port 8000
# 윈도우
.venv\Scripts\python -m uvicorn backend.app:app --port 8000
```

**확인**: 브라우저에서 `http://localhost:8000/healthz` →
`{"ok":true, "provider":"claude", "stt":"clova+gemini", ...}` 비슷하게 나오면 성공.
`http://localhost:8000` 에서 키오스크 화면이 떠야 한다.

## 6. 태블릿에서 접속할 공개 주소 만들기 (실증용)

맥:
```bash
brew install cloudflared     # 최초 1회
bash scripts/serve-tunnel.sh
```

윈도우 (PowerShell):
```powershell
winget install Cloudflare.cloudflared   # 최초 1회, 터미널 재시작
cloudflared tunnel --url http://127.0.0.1:8000
```

→ 출력되는 `https://….trycloudflare.com` 주소를 태블릿에서 `주소/?site=이름` 으로 접속.

## 7. 마지막 점검

- [ ] 태블릿(또는 폰)에서 접속 → 마이크 허용 → "불고기버거 세트 하나 주세요" 리허설 1건
- [ ] `data/logs/utterances.jsonl` 마지막 줄에 방금 발화와 `"site":` 값이 찍혔는지
- [ ] 컴퓨터 잠자기 방지: 맥 `caffeinate -dims` / 윈도우 전원 옵션에서 "절전 안 함"

## 주의: 서버가 2대가 되면

로그(`data/logs/utterances.jsonl`)가 컴퓨터마다 따로 쌓인다. 괜찮다 —
실증 끝나고 한 파일로 이어붙인 뒤 집계하면 된다:

```bash
cat 다른컴퓨터-utterances.jsonl >> data/logs/utterances.jsonl
python scripts/report.py --from 2026-07-15 --to 2026-07-15
```
