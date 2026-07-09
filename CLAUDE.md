# CarpeDM VUI 키오스크 — CLAUDE.md

> Claude Code가 매 세션 자동으로 읽는 프로젝트 지침서. 확정된 결정과 원칙만 기록한다.
> "[검증 필요]" 표시 항목은 구현 시 공식 문서를 재확인한 뒤 적용한다. 임의로 지어내지 않는다.

## 프로젝트 개요

동양미래대학교 CarpeDM 리빙랩 프로젝트. 고령층의 디지털 소외를 해소하기 위한
**LLM 기반 음성 키오스크**. 롯데리아 메뉴를 대상으로 음성으로 주문하고, 실패 시 터치로
복구하는 음성·터치 병행(멀티모달) 키오스크.

- 대상 사용자: 고령층 (접근성이 최우선 요구사항)
- 도메인: 롯데리아 (menu.json 교체로 도메인 전환 가능한 구조)
- 실행 환경: 라즈베리파이 5 + 10.1" 터치스크린 (Chromium 키오스크 모드)
  - 태블릿(iPad·갤럭시탭) 클라이언트도 지원 — 서버가 HTTPS로 서빙, docs/tablet.md 참조.
    마이크는 localhost 밖에서 HTTPS 필수. 오디오는 첫 터치 제스처에서 잠금 해제(main.tsx)

## 아키텍처 (확정)

```
[Pi5 + 터치스크린 + Anker 마이크(AEC)]
   Chromium --kiosk (전체화면)
        │
   React + Vite (프론트, localhost 서빙)
   - push-to-talk 녹음(MediaRecorder)
   - TTS 오디오 재생, 음성·터치 병행 UI
        │ HTTP (localhost)
   FastAPI (백엔드)
   - /order: STT → interpreter → TTS 오케스트레이션
   - interpreter.py (기존): 텍스트 → JSON 주문
   - providers/stt.py (CLOVA), providers/tts.py (Google)
        │
   menu.json · 표현사전 (데이터 계층)
```

**핵심 설계 원칙 (변경 금지):**
1. **Pi5 = thin client.** STT/LLM/TTS 추론은 전부 클라우드 API. 온디바이스 추론 아님.
2. **STT/TTS는 인터페이스로 추상화.** 벤더 교체가 provider 파일 한 곳 수정으로 되게.
3. **환각 차단:** LLM은 메뉴 id만 반환. 이름·가격은 시스템이 menu.json에서 조회.
   미등록 id는 검증 단계에서 거부한다. (interpreter.py 기존 원칙 유지)
4. **임의 확정 금지:** 모호하면 clarify(되물음)로 후보를 제시한다.
5. **접근성 우선:** 큰 글씨, 명도 대비 4.5:1 이상(WCAG 2.1 1.4.3), 터치 표적 48dp 이상.
6. **고령 친화 응답:** 쉬운 존댓말 1~2문장, 외래어 최소화, 재촉하지 않음.

## 해석 엔진 (기존 interpreter.py — 유지)

5개 action으로 발화를 분류하여 JSON 반환:
- `update` (주문 추가·수정·삭제), `confirm` (확정), `clarify` (되물음),
  `reject` (없는 메뉴 거절), `recommend` (추천)
- update 시 **변경분이 아니라 최종 전체 장바구니**를 반환 (멀티턴 상태 유지)
- 응답 필드: `action`, `cart[{id, qty}]`, `reply`, `question`, `suggestions`

## 외부 API 연동

### STT — CLOVA Speech (NEST) [로컬 파일 인식 방식]
- 발급 완료. 도메인: `CarpeDM-LivingLab`, 유형: 단문 인식.
- 엔드포인트: `POST {InvokeURL}/recognizer/upload` (multipart/form-data)
- 인증 헤더: `X-CLOVASPEECH-API-KEY: {Secret Key}`  ← CSR의 X-NCP 헤더와 다름. 혼동 금지.
- params 예: `{"language":"ko-KR","completion":"sync","fullText":true,
  "boostings":[{"words":"불고기버거,새우버거,데리버거","weight":1}]}`
- **키워드 부스팅(boostings.words)에 롯데리아 메뉴명을 전부 등록** → 고유명사 인식 향상 (최대 1,000개)
- InvokeURL·Secret Key는 콘솔: 도메인 > 빌더 실행 > 설정.
- [검증 필요] 요청 형식·파라미터는 구현 시 api.ncloud-docs.com 최신 문서로 재확인.

### TTS — Google Cloud Text-to-Speech
- 무료 한도(월): Standard 400만 자 / WaveNet·Neural2 100만 자 (2026 기준, [검증 필요]).
- 한국어 음성 사용. 응답 텍스트를 오디오로 합성해 프론트에서 재생.
- [검증 필요] 서비스 계정 키 발급·요청 형식은 cloud.google.com/text-to-speech 문서로 확인.

### LLM — 상용 API (해석 엔진)
- interpreter.py가 사용하는 기존 LLM API 유지. 모델 문자열은 코드 설정값으로 관리.

## 폴더 구조

```
carpedm-kiosk/
├─ CLAUDE.md
├─ backend/
│  ├─ main.py              # FastAPI 엔트리, /order 엔드포인트
│  ├─ interpreter.py       # (기존) 해석 엔진
│  ├─ providers/
│  │  ├─ stt.py            # STT 인터페이스 + CLOVA 구현
│  │  └─ tts.py            # TTS 인터페이스 + Google 구현
│  ├─ data/
│  │  ├─ menu.json         # 롯데리아 메뉴 (id, name, price, ...)
│  │  └─ expressions.json  # 표현 사전
│  ├─ tests/               # pytest
│  └─ .env                 # 키 (커밋 금지)
└─ frontend/
   ├─ src/
   │  ├─ App.tsx
   │  ├─ components/       # MicButton, Cart, Recommend, ClarifyChoices
   │  └─ lib/api.ts
   └─ vite.config.ts
```

## 보안 (엄수)
- API 키(CLOVA Secret, Google 서비스 계정)는 **`.env`에만**. 절대 커밋·로그 출력 금지.
- `.gitignore`에 `.env`, 서비스 계정 json 포함.
- 마이크 접근은 localhost/HTTPS에서만 허용됨 → Pi에서 localhost 서빙.

## 개발 컨벤션
- 백엔드 Python: 타입 힌트 사용, pytest로 테스트. 기존 테스트 통과 유지.
- 프론트 TypeScript strict. UI 라이브러리 최소화(고령층용은 단순하게).
- 큰 작업 전 별도 git 브랜치 + 체크포인트 커밋.
- 커밋 메시지는 명령형, 간결하게.

## 개발 순서 (제안)
1. providers/stt.py (CLOVA) — 녹음 파일 → 텍스트, 메뉴명 부스팅 포함
2. providers/tts.py (Google) — 텍스트 → 오디오
3. backend/main.py — /order 엔드포인트로 STT→interpreter→TTS 연결
4. data/menu.json — 롯데리아 메뉴로 구성
5. frontend — push-to-talk UI, 장바구니, 되물음/추천, 음성·터치 병행
6. Pi 통합 + 접근성 점검(글씨·대비·터치 타겟) + 현장 테스트

## 정직성 원칙 (프로젝트 전반)
- 구현된 것과 미구현을 명확히 구분한다. 보고서/문서에 미구현을 완성으로 쓰지 않는다.
- 자체 실증(사용성 테스트)은 아직 수행 전. 성능 수치를 지어내지 않는다.
