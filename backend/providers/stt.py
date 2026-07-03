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
    """CLOVA Speech NEST — 로컬 파일 인식(단문), completion=sync."""

    name = "clova"

    def __init__(self, menu: dict[str, dict] | None = None):
        self.invoke_url = (os.getenv("CLOVA_SPEECH_INVOKE_URL") or "").rstrip("/")
        self.secret = os.getenv("CLOVA_SPEECH_SECRET_KEY") or ""
        if not self.invoke_url or not self.secret:
            raise SttError("CLOVA_SPEECH_INVOKE_URL/CLOVA_SPEECH_SECRET_KEY 미설정")
        self.boost_words = build_boost_words(menu or {})
        self.timeout = float(os.getenv("KIOSK_STT_TIMEOUT", "15"))

    def transcribe(self, audio: bytes, content_type: str = "audio/wav") -> SttResult:
        import json

        params: dict = {
            "language": "ko-KR",
            "completion": "sync",
            "fullText": True,
            "wordAlignment": False,
            "diarization": {"enable": False},  # 1인 발화 — 화자 분리 생략으로 지연 단축
        }
        if self.boost_words:
            params["boostings"] = [{"words": ",".join(self.boost_words), "weight": 1}]

        try:
            res = requests.post(
                f"{self.invoke_url}/recognizer/upload",
                headers={"X-CLOVASPEECH-API-KEY": self.secret},
                files={
                    "media": ("record.wav", audio, content_type),
                    "params": (None, json.dumps(params, ensure_ascii=False), "application/json"),
                },
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
            res = self._model.generate_content([prompt, {"mime_type": content_type, "data": audio}])
            text = (res.text or "").strip()
        except Exception as e:
            raise SttError(f"Gemini STT 실패: {type(e).__name__}") from e
        if not text:
            raise SttError("Gemini 빈 결과")
        return SttResult(text=text, provider=self.name)


def make_stt_provider(menu: dict[str, dict], kind: str | None = None) -> SttProvider | None:
    """auto: CLOVA 키 있으면 CLOVA, 아니면 Gemini, 둘 다 없으면 None(프론트 브라우저 STT 폴백)."""
    kind = (kind or os.getenv("KIOSK_STT", "auto")).lower()
    if kind == "none":
        return None
    if kind == "clova":
        return ClovaSttProvider(menu)
    if kind == "gemini":
        return GeminiSttProvider(menu)
    try:
        return ClovaSttProvider(menu)
    except SttError:
        pass
    try:
        return GeminiSttProvider(menu)
    except SttError:
        return None
