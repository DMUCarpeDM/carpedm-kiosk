# CODE_CONVENTION.md — CarpeDM Kiosk MVP Code Convention

## 1. 기본 원칙
1. 기존 백엔드의 주문 해석 엔진을 재작성하지 않는다.
2. 메뉴와 가격은 `data/menu.json` 또는 `/api/menu`에서만 가져온다.
3. 사용자의 주문 의도 판단은 `/api/interpret` 또는 기존 `interpreter.py` 로직을 기준으로 한다.
4. UI 상태는 단순한 화면 상태 머신으로 관리한다.
5. MVP에 필요 없는 구조, 파일, 의존성은 만들지 않는다.
6. 한 기능을 구현할 때 수정 파일 수를 최소화한다.

## 2. 저장소 구조 권장안
현재 저장소가 Python 백엔드 중심이므로, 프론트엔드는 새 폴더로 얇게 추가한다.

```txt
backend/
  app.py
  interpreter.py

data/
  menu.json
  expressions.yaml
  testset.jsonl

tests/
  ...

frontend/                # 새로 추가 가능
  package.json
  index.html
  src/
    main.tsx
    App.tsx
    api.ts
    types.ts
    speech.ts
    screens/
      MainScreen.tsx
      MenuListScreen.tsx
      MenuDetailScreen.tsx
      VoiceOrderScreen.tsx
      VoiceResultScreen.tsx
      OrderCompleteScreen.tsx
    styles/
      kiosk.css
```

단, 더 적은 파일로 충분하면 더 적게 만든다. 작은 MVP라면 `App.tsx`, `api.ts`, `types.ts`, `kiosk.css` 정도로 시작해도 된다.

## 3. Python 백엔드 규칙
- Python 3.11+ 기준으로 작성한다.
- FastAPI, Pydantic, pathlib 사용 패턴을 유지한다.
- 함수는 작게 유지하되, 불필요한 클래스를 만들지 않는다.
- 기존 `backend/interpreter.py`의 검증 원칙을 지킨다.
  - LLM은 메뉴 ID만 반환.
  - 메뉴명과 가격은 `menu.json`에서 조회.
  - 모호하면 `clarify`.
  - 실패하면 `RuleProvider` fallback.
- API 응답 형식을 바꿀 경우 프론트와 테스트를 함께 수정한다.
- 기존 파일 전체를 포맷팅해서 대규모 diff를 만들지 않는다.

## 4. TypeScript/React 프론트엔드 규칙
- 가능하면 TypeScript를 사용한다.
- 함수형 컴포넌트와 명시적 타입을 사용한다.
- 전역 상태 라이브러리는 쓰지 않는다. MVP에서는 `useState`, `useReducer`로 충분하다.
- 라우터 라이브러리는 MVP 단계에서 쓰지 않는다. 화면 상태 `screen`으로 전환한다.
- UI 라이브러리는 추가하지 않는다. 기본 CSS로 구현한다.
- CSS는 키오스크 전용 클래스명으로 단순하게 작성한다.
- 메뉴 데이터는 하드코딩하지 않는다. 단, 백엔드가 꺼져 있을 때 개발 확인용 fallback은 `ponytail:` 주석으로 명확히 표시한다.

## 5. 네이밍 규칙
### 파일명
- React 컴포넌트: `PascalCase.tsx`
- 유틸/API/타입: `camelCase.ts` 또는 명확한 단수 명사 `api.ts`, `types.ts`
- CSS: `kiosk.css`

### 변수/함수
- 함수: 동사로 시작한다. 예: `fetchMenu`, `interpretUtterance`, `startListening`
- 상태: 명확한 명사. 예: `selectedItem`, `voiceState`, `cart`
- 타입: `PascalCase`. 예: `MenuItem`, `CartItem`, `InterpretResult`

## 6. 화면 상태 규칙
권장 상태값:

```ts
type Screen =
  | 'main'
  | 'voice-order'
  | 'voice-result'
  | 'menu-list'
  | 'menu-detail'
  | 'order-complete';
```

음성 상태값:

```ts
type VoiceState =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'processing'
  | 'result'
  | 'error';
```

## 7. API 규칙
### GET `/api/menu`
프론트는 메뉴 카드 표시를 위해 이 API를 우선 사용한다.

### POST `/api/interpret`
요청:

```json
{
  "utterance": "아이스 아메리카노 한 잔 주세요",
  "cart": [],
  "session_id": "optional"
}
```

응답은 `InterpretResult` 타입으로 받는다. 프론트는 action별로 아래처럼 처리한다.

- `update`: cart 기준으로 추천/확인 화면 표시.
- `recommend`: suggestions 기준으로 추천 메뉴 표시.
- `confirm`: 주문 완료 화면 이동.
- `clarify`: 질문 문구와 다시 말하기 버튼 표시.
- `reject`: 안내 문구와 메뉴 선택/다시 말하기 제공.

## 8. 접근성/키오스크 UI 규칙
- 버튼 텍스트는 짧고 직접적으로 쓴다.
- 주요 버튼은 화면 중앙에 크게 배치한다.
- 색상만으로 상태를 구분하지 않는다. 텍스트/아이콘을 같이 쓴다.
- 클릭 가능한 요소는 `button` 태그를 우선 사용한다.
- 키보드 포커스가 보이도록 한다.
- 음성 인식 중에는 화면에도 “듣고 있어요” 같은 상태를 표시한다.

## 9. 테스트/검증 규칙
- 백엔드 수정 후: `python -m pytest tests/ -q`
- 프론트엔드 추가 후: 최소 `npm run build`가 통과해야 한다.
- 비즈니스 로직이 생기면 최소 테스트 또는 self-check를 남긴다.
- 단순한 UI CSS 변경만 있을 경우 스크린 플로우 수동 확인을 기록한다.

## 10. 금지 사항
- 결제 기능을 실제로 구현하지 않는다.
- 메뉴/가격을 UI에 중복 하드코딩하지 않는다.
- 기존 `interpreter.py`를 새 LLM 체인으로 갈아엎지 않는다.
- 불필요한 DB, ORM, 인증, 관리자 시스템을 추가하지 않는다.
- 음성 실패를 조용히 무시하지 않는다.
- 대규모 리팩토링과 기능 추가를 한 번에 묶지 않는다.
