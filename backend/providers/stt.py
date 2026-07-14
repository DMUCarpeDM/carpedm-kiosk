"""STT 프로바이더 — 인터페이스 + CLOVA Speech(기본) + Gemini(폴백).

설계 원칙 (CLAUDE.md):
- STT는 인터페이스로 추상화한다. 벤더 교체는 이 파일 수정만으로 끝나야 한다.
- CLOVA Speech(NEST) 로컬 파일 인식: POST {InvokeURL}/recognizer/upload
  인증 헤더는 X-CLOVASPEECH-API-KEY (CSR의 X-NCP 헤더와 다름).
  boostings.words는 콤마 구분 문자열 — 롯데리아 메뉴명을 전부 등록해
  고유명사 인식률을 높인다 (최대 1,000개).
  (스펙 확인: api.ncloud-docs.com ai-application-service-clovaspeech-longsentence-local)
- 키는 .env에만 둔다. 로그에 출력하지 않는다.
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass

import requests


@dataclass
class SttResult:
    text: str
    provider: str


class SttError(Exception):
    """STT 호출 실패 — 상위에서 폴백 판단."""


class SttProvider(ABC):
    name: str = "base"

    @abstractmethod
    def transcribe(self, audio: bytes, content_type: str = "audio/wav") -> SttResult:
        """녹음 오디오 → 한국어 텍스트. 실패 시 SttError."""


def build_boost_words(menu: dict[str, dict]) -> list[str]:
    """메뉴의 쉬운 이름·원래 이름을 부스팅 키워드로 만든다 (중복 제거, 1,000개 제한)."""
    words: list[str] = []
    seen: set[str] = set()
    for m in menu.values():
        for w in (m.get("easy_name"), m.get("original_name")):
            w = (w or "").strip()
            if w and w not in seen:
                seen.add(w)
                words.append(w)
    return words[:1000]


class ClovaSttProvider(SttProvider):
    """CLOVA Speech — 단문/장문 자동 판별.

    - 장문(로컬 파일): InvokeURL이 .../external/v1/{...} 형태 → POST {url}/recognizer/upload (multipart)
    - 단문: 그 외 (기본 https://clovaspeech-gw.ncloud.com/recog/v1)
      → POST {url}/stt?lang=Kor (application/octet-stream), boostings는 탭 구분·512자 이내
    - (구형 CSR 겸용) CLOVA_CLIENT_ID가 있으면 X-NCP-APIGW 헤더 쌍을 사용
    """

    name = "clova"
    SHORT_DEFAULT_URL = "https://clovaspeech-gw.ncloud.com/recog/v1"

    def __init__(self, menu: dict[str, dict] | None = None):
        self.invoke_url = (os.getenv("CLOVA_SPEECH_INVOKE_URL") or self.SHORT_DEFAULT_URL).rstrip("/")
        self.secret = os.getenv("CLOVA_SPEECH_SECRET_KEY") or ""
        self.client_id = os.getenv("CLOVA_CLIENT_ID") or ""  # 구형 CSR일 때만
        if not self.secret:
            raise SttError("CLOVA_SPEECH_SECRET_KEY 미설정")
        self.long_mode = "/external/" in self.invoke_url
        self.boost_words = build_boost_words(menu or {})
        self.timeout = float(os.getenv("KIOSK_STT_TIMEOUT", "15"))

    def _headers(self, content_type: str | None = None) -> dict[str, str]:
        h: dict[str, str] = {}
        if self.client_id:  # 구형 CSR: Client ID + Secret 쌍
            h["X-NCP-APIGW-API-KEY-ID"] = self.client_id
            h["X-NCP-APIGW-API-KEY"] = self.secret
        else:  # 신형 CLOVA Speech: 도메인 Secret Key 하나
            h["X-CLOVASPEECH-API-KEY"] = self.secret
        if content_type:
            h["Content-Type"] = content_type
        return h

    def _short_boostings(self) -> str:
        """단문 인식 boostings: 탭 구분, 키워드 3자 이상, 전체 512자 이하."""
        out: list[str] = []
        total = 0
        for w in self.boost_words:
            if len(w) < 3:
                continue
            if total + len(w) + 1 > 512:
                break
            out.append(w)
            total += len(w) + 1
        return "\t".join(out)

    def transcribe(self, audio: bytes, content_type: str = "audio/wav") -> SttResult:
        import json

        try:
            if self.long_mode:
                params: dict = {
                    "language": "ko-KR",
                    "completion": "sync",
                    "fullText": True,
                    "wordAlignment": False,
                    "diarization": {"enable": False},  # 1인 발화 — 화자 분리 생략으로 지연 단축
                }
                if self.boost_words:
                    params["boostings"] = [{"words": ",".join(self.boost_words), "weight": 1}]
                res = requests.post(
                    f"{self.invoke_url}/recognizer/upload",
                    headers=self._headers(),
                    files={
                        "media": ("record.wav", audio, content_type),
                        "params": (None, json.dumps(params, ensure_ascii=False), "application/json"),
                    },
                    timeout=self.timeout,
                )
            else:
                query: dict[str, str] = {"lang": "Kor"}
                boost = self._short_boostings()
                if boost:
                    query["boostings"] = boost
                res = requests.post(
                    f"{self.invoke_url}/stt",
                    headers=self._headers("application/octet-stream"),
                    params=query,
                    data=audio,
                    timeout=self.timeout,
                )
        except requests.RequestException as e:
            raise SttError(f"CLOVA 요청 실패: {type(e).__name__}") from e
        if res.status_code != 200:
            raise SttError(f"CLOVA 응답 오류: HTTP {res.status_code} {res.text[:200]}")
        body = res.json()
        text = (body.get("text") or "").strip()
        if not text:
            raise SttError(f"CLOVA 빈 결과: result={body.get('result')!r}")
        return SttResult(text=text, provider=self.name)


class GeminiSttProvider(SttProvider):
    """Gemini 오디오 받아쓰기 — CLOVA 불가 시 폴백. 메뉴명을 힌트로 제공한다."""

    name = "gemini"

    def __init__(self, menu: dict[str, dict] | None = None):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise SttError("GEMINI_API_KEY 미설정")
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name=os.getenv("KIOSK_GEMINI_MODEL", "gemini-2.5-flash"))
        # 힌트는 id가 아니라 '한국어 메뉴 이름'이어야 한다
        self._menu_hints = ", ".join(build_boost_words(menu or {}))

    def transcribe(self, audio: bytes, content_type: str = "audio/wav") -> SttResult:
        prompt = (
            "오디오를 듣고 사용자가 말한 한국어 주문 내용을 그대로 텍스트로만 받아써줘.\n"
            f"참고 힌트 (우리 매장의 실제 메뉴 이름): [{self._menu_hints}]\n"
            "발음이 뭉개진 단어가 위 메뉴 이름과 비슷하면 그 이름으로 보정해도 된다. "
            "단, 사용자가 말하지 않은 내용을 추가하지 말고, 설명·인사말 없이 받아쓴 문장만 출력해."
        )
        try:
            res = self._model.generate_content(
                [prompt, {"mime_type": content_type, "data": audio}],
                # 무한 대기 방지 — 폴백 단계에서 어르신을 오래 기다리게 하지 않는다
                request_options={"timeout": float(os.getenv("KIOSK_STT_TIMEOUT", "15"))},
            )
            text = (res.text or "").strip()
        except Exception as e:
            raise SttError(f"Gemini STT 실패: {type(e).__name__}") from e
        if not text:
            raise SttError("Gemini 빈 결과")
        return SttResult(text=text, provider=self.name)


class ChainedSttProvider(SttProvider):
    """여러 STT 엔진을 순서대로 시도 — 앞 엔진이 실패(빈 결과 포함)하면 다음 엔진으로.

    소음 환경 대응: CLOVA가 못 알아들은 오디오도 Gemini(메뉴명 힌트 프롬프트)가
    건질 수 있어 현장 STT 성공률을 올린다. 전부 실패해야 SttError.
    """

    def __init__(self, providers: list[SttProvider]):
        self.providers = providers
        self.name = "+".join(p.name for p in providers)

    def transcribe(self, audio: bytes, content_type: str = "audio/wav") -> SttResult:
        last: SttError | None = None
        for p in self.providers:
            try:
                return p.transcribe(audio, content_type)
            except SttError as e:
                last = e
        raise last or SttError("사용 가능한 STT 엔진 없음")


def make_stt_provider(menu: dict[str, dict], kind: str | None = None) -> SttProvider | None:
    """auto: 키가 있는 엔진을 CLOVA→Gemini 순으로 체인. 둘 다 없으면 None(프론트 브라우저 STT 폴백)."""
    kind = (kind or os.getenv("KIOSK_STT", "auto")).lower()
    if kind == "none":
        return None
    if kind == "clova":
        return ClovaSttProvider(menu)
    if kind == "gemini":
        return GeminiSttProvider(menu)
    providers: list[SttProvider] = []
    for cls in (ClovaSttProvider, GeminiSttProvider):
        try:
            providers.append(cls(menu))
        except SttError:
            pass
    if not providers:
        return None
    if len(providers) == 1:
        return providers[0]
    return ChainedSttProvider(providers)
