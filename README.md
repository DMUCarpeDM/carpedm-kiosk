# CarpeDM — 고령층 AI 음성 주문 키오스크 (롯데리아)

> **"검은 탄산 물 줘"** 처럼 어르신이 메뉴 이름을 정확히 몰라도 자기 말로 주문하면 알아듣는 배리어프리 음성 키오스크.  
> **동양미래대학교 RISE사업 리빙랩 프로젝트** (구로구·금천구 고령층 디지털 소외 해소)

---

## 📌 프로젝트 소개

기존 키오스크의 외래어 중심 메뉴판과 복잡한 화면 구조는 고령층 사용자의 디지털 소외를 심화시킵니다.  
**CarpeDM**은 어르신들이 일상 언어로 자연스럽게 주문할 수 있도록 **음성 인식(STT) + 자연어 해석(LLM / 규칙 엔진) + 음성 합성(TTS) + 배리어프리 터치 UI**를 통합한 주문 보조 시스템입니다.

---

## 🔄 주요 아키텍처 및 파이프라인

```
🎤 사용자 음성 발화
        │
        ▼
 1️⃣ STT (CLOVA Speech / Gemini)  ─── 메뉴명 부스팅 적용
        │
        ▼
 2️⃣ 해석 엔진 (LLM + 규칙 엔진)  ─── 3중 폴백 계층 & 환각 차단 (메뉴 ID만 반환)
        │
        ▼
 3️⃣ TTS (Google Cloud TTS)      ─── 음성 안내 + 화면 자막 연동
        │
        ▼
 📱 배리어프리 UI / 터치 보조   ─── 네트워크 단절 시 터치/규칙 폴백
```

- **규칙 우선 게이트 (`KIOSK_RULE_FIRST=1`)**: 표현 사전으로 대치되는 명확한 주문은 LLM API를 호출하지 않고 1ms 내에 즉시 처리하여 API 과금 및 지연 시간을 최소화합니다.
- **환각(Hallucination) 차단**: 해석 엔진은 존재하지 않는 메뉴를 지어내지 않고, 시스템에 등록된 `data/menu.json` ID만 산출합니다.
- **멀티턴 대화 관리**: 대화 맥락과 장바구니 상태를 추적하여 "하나 더 줘", "콜라는 빼줘", "세트로 바꿔줘" 등 자연스러운 수정 처리가 가능합니다.
- **배리어프리 가이드 준수**: 4.5:1 이상의 명도 대비, 48dp 이상의 터치 표적, 화면 낮춤 모드, 큰 글씨 모드, 직원 호출 기능 제공.

---

## ✅ 개발 및 검증 현황

| 구성 요소 | 구현 상태 | 비고 |
|---|---|---|
| **해석 엔진 & 환각 차단** | ✅ 완료 | 규칙 폴백 정확도 98.8% (248건 테스트셋 기준), 멀티턴 처리 지원 |
| **메뉴 & 표현 사전** | ✅ 완료 | 롯데리아 라인업 49종 (`menu.json`) + 고령층 표현 사전 325개 (`expressions.yaml`) |
| **STT / TTS 파이프라인** | ✅ 완료 | CLOVA Speech 메뉴 부스팅 연동 + Google TTS + 캐시 처리 |
| **배리어프리 UI** | ✅ 완료 | React + TypeScript + Vite, 고대비, 자막, 음성-터치 병행 화면 |
| **태블릿 & 라즈베리파이 연동** | ✅ 완료 | HTTPS 서빙 / Cloudflare Tunnel 연동, 라즈베리파이 5 전체화면 구동 지원 |
| **현장 실증** | ✅ 완료 | 구로구·금천구 경로당 및 복지관 실증 데이터 수집 완료 (`reports/field_summary.md`) |
| **자동화 테스트** | ✅ 완료 | Pytest 45개 검증 케이스 통과 (44 passed, 1 skipped) |

---

## 🚀 실행 및 연동 가이드

### 1. 환경 준비 및 패키지 설치

```bash
# Python 3.12+ 및 Node.js 20+ 필요
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성합니다. (API 키가 없어도 규칙 폴백과 브라우저 음성 인식으로 기본 동작합니다.)

```bash
cp .env.example .env
```

### 3. 백엔드 및 프론트엔드 실행

```bash
# 백엔드 실행 (Terminal 1)
.venv/bin/python -m uvicorn backend.app:app --port 8000

# 프론트엔드 빌드 및 실행 (Terminal 2)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

> **헬스 체크 확인**: `http://localhost:8000/healthz` 접속 시 연동된 프로바이더 상태 확인 가능

---

## 🧪 테스트 및 측정 스크립트

```bash
# 1) 백엔드 자동화 테스트 실행 (pytest)
.venv/bin/pytest tests/ -q

# 2) 프론트엔드 타입 검사 및 프로덕션 빌드
npm --prefix frontend run build

# 3) 실질 음성 연동 스모크 테스트
python scripts/smoke_voice.py

# 4) 주문 해석 정확도 측정 스크립트
python scripts/measure.py --provider rule              # 오프라인 규칙 엔진 측정
python scripts/measure.py --provider claude --strict   # LLM 연동 측정

# 5) 현장 실증 발화 로그 집계 리포트 생성
python scripts/report.py --from 2026-07-06 --to 2026-07-10
```

---

## 📁 저장소 구조

```
carpedm-kiosk/
├── backend/                  # FastAPI 백엔드 API & 해석 엔진
│   ├── app.py                # API 엔드포인트 (/order, /healthz, /api/*)
│   ├── interpreter.py        # 5가지 액션(update, confirm, clarify, reject, recommend) 해석기
│   └── providers/            # STT (CLOVA/Gemini) & TTS (Google) 모듈
├── frontend/                 # React + TypeScript + Vite 프론트엔드 UI
│   ├── src/
│   │   ├── screens/          # 화면 컴포넌트 (음성주문, 결제, 알레르기, 메뉴판 등)
│   │   ├── components.tsx    # 배리어프리 UI 요소 (마이크 버튼, 접근성 바 등)
│   │   └── api.ts            # 백엔드 API통신 클라이언트
├── data/                     # 도메인 데이터
│   ├── menu.json             # 롯데리아 49종 메뉴 데이터 및 상세 정보
│   ├── expressions.yaml      # 어르신 고령층 표현 매핑 사전 (325개)
│   └── testset.jsonl         # 248건의 해석 검증용 테스트셋
├── docs/                     # 프로젝트 설계, 기획, 실증 및 배포 문서
│   └── planning/             # 기획서, SRS 요구사항, 차별화 전략, 제품화 브리프
├── reports/                  # 실증 로그 집계 및 정확도 측정 결과 리포트
├── scripts/                  # 정확도 측정, 로깅 집계, 테스트셋 생성 스크립트
└── tests/                    # Pytest 자동화 테스트 모듈 (45개 케이스)
```

---

## ⚠️ 보안 및 주의 사항

- API 키가 포함된 `.env` 및 `secrets/` 디렉터리는 Git 추적에서 제외되어 있으므로 커밋하지 않도록 주의합니다.
- 개인정보 보호를 위해 현장 실증 발화 로그(`data/logs/`) 및 음성 캐시 파일은 저장소에 커밋되지 않습니다.
