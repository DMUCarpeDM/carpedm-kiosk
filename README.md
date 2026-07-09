# CarpeDM — 고령층 AI 음성 키오스크 (롯데리아)

> 어르신이 메뉴 이름을 정확히 몰라도, **"검은 탄산 물 줘"** 처럼 자기 말로 주문하면 알아듣는 키오스크.
> 동양미래대학교 RISE사업 리빙랩 프로젝트 (구로구·금천구 고령층 디지털 소외 해소)

---

## 🧭 팀원이라면 여기부터
**개발을 몰라도 5분이면 전체가 보이는 문서** → [`docs/planning/00_팀원용_프로젝트현황.md`](docs/planning/00_팀원용_프로젝트현황.md)

## 🔄 어떻게 작동하나

```
🎤 누르고 말하기 → ① STT (CLOVA, 메뉴명 부스팅) → ② 해석 (LLM+규칙 폴백) → ③ TTS (Google) + 화면 자막
                     실패 시: 브라우저 STT → 글자 입력 → 터치 메뉴판 (단계 폴백)
```

- **② 해석 엔진**: 5개 행위(update/confirm/clarify/reject/recommend), 환각 차단(메뉴 id만 반환),
  멀티턴 장바구니, 모호하면 되묻기. 오프라인에서도 규칙 폴백으로 동작.
- **① ③ 음성**: `backend/providers/`의 인터페이스 뒤에 있어 벤더 교체가 파일 한 곳 수정으로 끝남.
  `POST /order` 한 번으로 STT→해석→TTS 사이클 처리, 단계별 지연 로깅.

## ✅ 현재 상태 (2026-07-03)

| 구성 요소 | 상태 |
|---|---|
| 해석 엔진 + 환각 차단 + 멀티턴 | ✅ **Claude 96.3% / 규칙 폴백 98.8%** (테스트셋 246건) |
| 롯데리아 메뉴 50종 + 표현 사전 324개(충돌 검사기 포함) | ✅ 완성 |
| STT(CLOVA)·TTS(Google) 실연동 | ✅ 확인 — 음성 1사이클 3.7초 (STT 1.6s + 해석 1.6s + TTS 0.5s) |
| 키오스크 UI (매장/포장→방식→메뉴→결제, 세트 업셀, 알레르기 게이트) | ✅ 완성 — docs/screenshots/ 참고 |
| 배리어프리 (낮은 화면·큰 글씨·직원 호출·단계 표시·자막) | ✅ 대비 4.5:1↑, 터치 표적 48dp↑ |
| 라즈베리파이 통합 | ⬜ [docs/raspberry-pi.md](docs/raspberry-pi.md) 순서대로 진행 |
| 태블릿(iPad·갤럭시탭) 클라이언트 | ✅ [docs/tablet.md](docs/tablet.md) — HTTPS 서빙 + 홈 화면 전체화면 실행 |
| 현장 실증 (경로당·복지관) | ⬜ 7/6~7/10 예정 — 현장 수치는 실증 후 기재 |

## 🚀 실행 방법

```bash
# 0) 준비: Python 3.12+, Node 20+
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 1) 키 설정 (.env.example 참고 — 키 없어도 규칙 폴백 + 브라우저 음성으로 동작)
cp .env.example .env   # CLOVA·Google·Anthropic 키 입력

# 2) 백엔드
python -m uvicorn backend.app:app --port 8000

# 3) 프론트 (새 터미널)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

확인: `GET /healthz` → `{"ok":true,"provider":...,"stt":...,"tts":...}` 로 어떤 프로바이더가 붙었는지 보임.

```bash
# 실키 연동 스모크 테스트 (STT·TTS 실제 호출)
python scripts/smoke_voice.py

# 매핑 정확도 측정
python scripts/measure.py --provider rule              # 오프라인 기준선
python scripts/measure.py --provider claude --strict   # AI 적용 측정 (키 필요)

# 품질 검사 / 테스트셋·이미지 재생성
python -m pytest tests/ -q
python scripts/gen_testset.py
python scripts/make_menu_images.py
```

## 📁 저장소 구조
```
backend/
  interpreter.py       해석 엔진: 말 → 주문, 환각 차단, 추천, 규칙 폴백
  app.py               API: /order(음성 사이클), /api/interpret·stt·tts·menu
  providers/           stt.py(CLOVA+Gemini 폴백) · tts.py(Google+캐시)
data/                  menu.json(롯데리아 50종) · expressions.yaml · testset.jsonl(222건)
frontend/              React 키오스크 UI (push-to-talk WAV 녹음, 자막, 음성·터치 병행)
scripts/               measure(정확도) · gen_testset · smoke_voice · make_menu_images
tests/                 pytest 30개 (구조·정책·프로바이더·오케스트레이션)
docs/planning/         기획·설계·실증 문서
```

## 📅 일정
| 시기 | 할 일 |
|---|---|
| ~7/3 | 기획·해석엔진·음성 파이프라인·롯데리아 UI ✅ |
| 7/4~7/5 | 실키 연동 확인 + 라즈베리파이 통합 + 리허설 |
| 7/6~7/10 | 현장 실증 (경로당·복지관) — 로그로 정확도·성공률·지연 실측 |
| 7/13~7/17 | 분석 · 보고서 · 발표 |

## ⚠️ 보안 주의
- **API 키(.env, secrets/)는 절대 커밋하지 마세요.** `.gitignore`에 막아뒀습니다.
- 발화 로그(`data/logs/`)·TTS 캐시도 커밋하지 않습니다.

---
🤖 일부 산출물은 Claude와의 협업으로 작성되었으며, 정확도 측정·검증은 직접 수행했습니다.
