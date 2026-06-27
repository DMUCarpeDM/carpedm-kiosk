# CarpeDM — 고령층 AI 음성 키오스크

> 어르신이 메뉴 이름을 정확히 몰라도, **"검은 탄산 물 줘"** 처럼 자기 말로 주문하면 알아듣는 키오스크.
> 동양미래대학교 RISE사업 리빙랩 프로젝트 (구로구·금천구 고령층 디지털 소외 해소)

---

## 🧭 팀원이라면 여기부터
**개발을 몰라도 5분이면 전체가 보이는 문서** → [`docs/planning/00_팀원용_프로젝트현황.md`](docs/planning/00_팀원용_프로젝트현황.md)

## 📁 저장소 구조
```
backend/        실제 작동하는 서버 (주문 해석 엔진 + API)
  interpreter.py  핵심: 말 → 주문 해석, 환각 차단, 추천
  app.py          API 서버 + 발화 로깅
data/           메뉴(24종), 표현 사전, 테스트셋(106건)
scripts/        정확도 측정 · 공공데이터 도구
tests/          품질 검사 19개
docs/planning/  기획·설계·실증 문서 (기획서, 요구사항, 디자인, 실증키트 등)
```

## 🔄 어떻게 작동하나 (3단계)
```
🎤 말함 → ① STT(말→글자) → ② 해석(글자→주문) → ③ TTS(글자→음성안내)
                              ✅ 완성·검증        (①③은 통합 예정)
```
**두뇌인 ② 해석을 먼저 완성**했습니다. 메뉴를 지어내지 못하게 막는 안전장치(LLM은 메뉴 ID만 반환), 여러 번 대화(수정·추가·추천)까지 포함합니다.

## ✅ 현재 상태
- 메뉴 24종 · 테스트셋 106건 · 품질검사 19개 전부 통과
- 매핑 정확도: 규칙 기반 기준선 **약 86%** (LLM 적용 시 향상 목표)
- 멀티턴 수정 · 추천 기능 · 오프라인 폴백 구현

## 🚀 실행 방법 (개발자용)

> **현재 실행 가능한 것**: 백엔드 API 서버 (해석 엔진). **키오스크 UI·STT·TTS는 아직 미구현** — 기획 문서(`docs/planning/`)만 있습니다.

```powershell
# 1) (권장) 프로젝트 전용 가상환경 — 전역 패키지 충돌 방지
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2) 환경 변수 (.env.example 복사 후 API 키 입력, 키 없어도 rule 폴백으로 동작)
Copy-Item .env.example .env

# 3) 서버 실행 (Windows: uvicorn 단독 명령은 PATH 미등록 시 실패 → python -m 사용)
python -m uvicorn backend.app:app --port 8000 --reload

# 또는 한 줄 실행
.\scripts\run.ps1
```

브라우저/API 확인:
- 상태: http://127.0.0.1:8000/healthz
- 메뉴: http://127.0.0.1:8000/api/menu
- API 문서: http://127.0.0.1:8000/docs

```powershell
# 정확도 측정
python scripts/measure.py --provider rule              # 오프라인 기준선
python scripts/measure.py --provider claude --strict   # AI 적용 측정 (키 필요)

# 품질 검사
python -m pytest tests/ -q
```

## 📅 일정
| 시기 | 할 일 |
|---|---|
| ~지금 | 기획·설계·해석엔진 완성, 전문가 자문 |
| 6/22~7/3 | 디자인 + 음성(STT/TTS) 통합 + 파이 통합 |
| 7/6~7/10 | 현장 실증 (경로당·복지관) |
| 7/13~7/17 | 분석 · 보고서 · 발표 |

## ⚠️ 보안 주의
- **API 키(.env)는 절대 커밋하지 마세요.** `.gitignore`에 막아뒀습니다.
- 발화 로그(`data/logs/`)도 개인정보 보호를 위해 올리지 않습니다.

---
🤖 일부 산출물은 Claude와의 협업으로 작성되었으며, 정확도 측정·검증은 직접 수행했습니다.
