# PROJECT_DOMAIN.md — CarpeDM Cafe Voice Kiosk MVP

## 1. 프로젝트 한 줄 정의
CarpeDM Cafe Voice Kiosk MVP는 사용자가 메뉴명을 정확히 몰라도 음성으로 말하면, 가게 메뉴 데이터와 주문 해석 엔진을 기준으로 적합한 메뉴를 찾고, 큰 글씨·큰 버튼의 키오스크 UI에서 확인 후 주문 완료까지 안내하는 카페 주문 MVP이다.

## 2. 현재 저장소 기준 상태
현재 저장소는 프론트엔드 앱보다 백엔드 주문 해석 엔진 중심이다.

- `backend/app.py`: FastAPI 서버. `/api/menu`, `/api/interpret`, `/healthz` 제공.
- `backend/interpreter.py`: 발화 텍스트를 주문 의도로 해석하는 핵심 엔진.
- `data/menu.json`: 메뉴 단일 소스.
- `data/expressions.yaml`: 어르신/사용자 표현 사전.
- `data/testset.jsonl`: 해석 테스트셋.
- `tests/`: 주문 해석 품질 검사.
- `docs/planning/`: 기획, 요구사항, 디자인, 실증 문서.

기존 구현의 핵심은 “말 → STT 텍스트 → 주문 해석 → TTS/화면 안내” 중 `주문 해석` 부분이다. STT/TTS와 화면 앱은 MVP 단계에서 얇게 추가한다.

## 3. MVP 목표
### 반드시 구현
1. 태블릿/키오스크 화면에서 보이는 시각적 MVP.
2. 메인 화면: `음성주문`, `메뉴선택` 두 개의 큰 버튼.
3. 메뉴 선택 화면: 카페 메뉴 카드 그리드.
4. 메뉴 상세 화면: 메뉴 이미지, 이름, 가격, 옵션, 수량, 주문 버튼.
5. 음성 주문 화면: 흰 배경, 파란 음성 파형, 안내 문구, 듣는 상태.
6. 음성 해석 결과 화면: 사용자의 말, 매칭된 메뉴 카드, 다시 말하기, 주문 확정 버튼.
7. 주문 완료 화면: 결제 기능 없이 “주문이 완료되었습니다” 표시.
8. `/api/menu`와 `/api/interpret` 연동 준비 또는 실제 연동.
9. 브라우저 STT/TTS가 가능하면 Web Speech API를 쓰고, 불가능하면 테스트 입력/안내 fallback 제공.

### MVP에서 하지 않음
- 실제 결제, 카드 단말기, PG 연동.
- 회원가입, 로그인, 사용자 계정.
- 매장 관리자 페이지.
- POS 연동.
- 영수증 출력.
- 복잡한 추천 모델 학습.
- 별도 DB 설계.
- 실시간 음성 스트리밍 서버.
- 대규모 디자인 시스템.

## 4. 사용자와 상황
### 주요 사용자
- 키오스크 사용이 익숙하지 않은 고령층 사용자.
- 메뉴명을 정확히 모르는 사용자.
- 터치보다 말로 주문하는 것이 편한 사용자.
- 일반 키오스크처럼 직접 메뉴를 고르고 싶은 사용자.

### 사용 환경
- 태블릿 또는 키오스크 화면.
- 카페 매장 내 고정 화면.
- 마이크와 스피커가 있는 환경을 가정하되, MVP에서는 브라우저 기능 기반으로 시작한다.

## 5. 핵심 도메인 객체
### MenuItem
가게에서 판매하는 실제 메뉴. UI와 LLM 모두 `data/menu.json`을 기준으로 한다.

필드 예시:
- `id`: 시스템 내부 메뉴 ID.
- `easy_name`: 사용자에게 보여줄 쉬운 이름.
- `original_name`: 원래 메뉴명.
- `price`: 가격.
- `category`: 음료/디저트 등.
- `temp`: hot/ice/none.
- `tags`: 달달한, 부드러운, 시원한 등.
- `popular`: 추천 우선순위에 활용 가능.

### CartItem
주문 후보 또는 장바구니 항목.

- `id`: MenuItem ID.
- `qty`: 수량.

### InterpretResult
`/api/interpret`의 응답. UI는 이 결과만 보고 다음 화면을 결정한다.

- `action`: `update | confirm | clarify | reject | recommend`.
- `cart`: 최종 장바구니.
- `reply`: 사용자에게 보여줄/읽어줄 응답.
- `question`: 되물어야 할 질문.
- `suggestions`: 추천 메뉴 ID 목록.
- `provider`: `rule` 또는 `claude` 등.
- `fallback`: LLM 실패 후 규칙 기반 fallback 여부.

### VoiceSession
음성 주문 화면의 일시적 상태.

- `idle`: 시작 전.
- `speaking`: TTS 안내 중.
- `listening`: 사용자 발화 수신 중.
- `processing`: 해석 중.
- `result`: 해석 결과 표시.
- `error`: 마이크/브라우저 미지원 또는 인식 실패.

## 6. 핵심 화면 흐름
### 음성 주문 경로
`MainScreen` → `VoiceOrderScreen` → `/api/interpret` → `VoiceResultScreen` → `OrderCompleteScreen`

1. 사용자가 `음성주문`을 누른다.
2. TTS: “안녕하세요, 카페입니다. 무엇을 도와드릴까요?”
3. STT가 발화를 텍스트로 변환한다.
4. `/api/interpret`로 텍스트와 현재 cart를 보낸다.
5. 응답이 `update` 또는 `recommend`이면 후보 메뉴를 보여준다.
6. 사용자가 “맞아요”, “이걸로 줘”, “구매” 등으로 확정하면 주문 완료 화면으로 이동한다.
7. 모호하면 `clarify` 화면 또는 다시 말하기 안내를 보여준다.

### 메뉴 선택 경로
`MainScreen` → `MenuListScreen` → `MenuDetailScreen` → `OrderCompleteScreen`

1. 사용자가 `메뉴선택`을 누른다.
2. `/api/menu` 또는 로컬 메뉴 데이터를 통해 카드 그리드를 표시한다.
3. 메뉴 카드를 누르면 상세 화면을 표시한다.
4. 사용자가 `이걸로 주문`을 누르면 주문 완료 화면으로 이동한다.

## 7. UI/UX 원칙
1. 큰 글씨: 키오스크 화면 기준 본문 24px 이상, 주요 버튼 32px 이상 권장.
2. 큰 터치 영역: 주요 버튼은 최소 120px 높이 이상.
3. 선택지는 적게: 한 화면에 핵심 행동은 1~2개.
4. 색상: 흰 배경 + 파란 포인트. 위험/취소는 회색 또는 보조 색상.
5. 안내 문구는 쉬운 존댓말.
6. 사용자를 재촉하지 않는다.
7. 음성 실패 시 반드시 터치 선택으로 돌아갈 수 있어야 한다.
8. 메뉴명·가격은 절대 UI에 하드코딩하지 않는다. `menu.json` 또는 API 응답을 기준으로 한다.

## 8. 통합 경계
### Backend
기존 Python/FastAPI 백엔드는 주문 해석의 단일 진실 공급원이다. 가능하면 기존 파일을 크게 고치지 않는다.

### Frontend
프론트엔드가 없다면 `frontend/` 아래에 최소 구성으로 추가한다. UI는 `MenuItem`, `CartItem`, `InterpretResult` 타입에 맞춰 구현한다.

### STT/TTS
MVP에서는 브라우저 Web Speech API 기반을 우선 검토한다. 단, 브라우저 미지원 가능성이 있으므로 `SpeechAdapter` 같은 얇은 래퍼를 두고, 미지원 시 테스트 입력/안내 fallback을 제공한다.

## 9. 성공 기준
- 앱을 실행하면 메인 화면이 바로 보인다.
- `음성주문`과 `메뉴선택` 경로가 모두 주문 완료까지 이어진다.
- 메뉴 카드와 상세 화면은 `menu.json` 기반 데이터를 사용한다.
- 실제 결제 없이 주문 완료만 표시한다.
- 기존 백엔드 테스트가 깨지지 않는다.
- 새로 추가한 비즈니스 로직에는 최소한의 검증 또는 테스트가 있다.
