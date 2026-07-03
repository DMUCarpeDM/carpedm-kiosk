"""TTS 프로바이더 — 인터페이스 + Google Cloud TTS 구현 + 파일 캐시.

설계 원칙 (CLAUDE.md):
- TTS는 인터페이스로 추상화한다. 벤더 교체는 이 파일 수정만으로 끝나야 한다.
- Google Cloud TTS v1 text:synthesize (REST). 인증은 둘 중 하나:
  * GOOGLE_TTS_API_KEY  — API 키 (?key= 쿼리)
  * GOOGLE_APPLICATION_CREDENTIALS — 서비스 계정 JSON 경로 (OAuth Bearer)
  (스펙 확인: docs.cloud.google.com/text-to-speech v1 text:synthesize)
- 같은 안내문은 다시 합성하지 않는다 — 파일 캐시로 지연·비용 절감.
- 고령 친화: 또박또박 느린 말속도(기본 0.9).
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = Path(os.getenv("KIOSK_TTS_CACHE_DIR", ROOT / "data" / "tts_cache"))


@dataclass
class TtsResult:
    audio: bytes          # mp3 바이트
    mime: str
    provider: str
    cached: bool = False


class TtsError(Exception):
    """TTS 호출 실패 — 프론트는 브라우저 음성으로 폴백."""


class TtsProvider(ABC):
    name: str = "base"

    @abstractmethod
    def synthesize(self, text: str) -> TtsResult:
        """텍스트 → 음성. 실패 시 TtsError."""


class GoogleTtsProvider(TtsProvider):
    name = "google"
    ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize"

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_TTS_API_KEY") or ""
        self.sa_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or ""
        if not self.api_key and not (self.sa_path and Path(self.sa_path).exists()):
            raise TtsError("GOOGLE_TTS_API_KEY 또는 GOOGLE_APPLICATION_CREDENTIALS 미설정")
        self.voice = os.getenv("KIOSK_TTS_VOICE", "ko-KR-Neural2-A")
        self.rate = float(os.getenv("KIOSK_TTS_RATE", "0.9"))  # 고령 친화: 천천히
        self.timeout = float(os.getenv("KIOSK_TTS_TIMEOUT", "10"))
        self._token: str | None = None
        self._token_expiry: float = 0.0
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # ── 인증 ─────────────────────────────────────────
    def _bearer_token(self) -> str:
        import time

        if self._token and time.time() < self._token_expiry - 60:
            return self._token
        from google.oauth2 import service_account  # google-generativeai 의존성에 포함
        import google.auth.transport.requests

        creds = service_account.Credentials.from_service_account_file(
            self.sa_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh(google.auth.transport.requests.Request())
        self._token = creds.token
        self._token_expiry = creds.expiry.timestamp() if creds.expiry else time.time() + 300
        return self._token

    # ── 캐시 ─────────────────────────────────────────
    def _cache_path(self, text: str) -> Path:
        key = hashlib.sha256(f"{self.voice}|{self.rate}|{text}".encode()).hexdigest()[:24]
        return CACHE_DIR / f"{key}.mp3"

    def synthesize(self, text: str) -> TtsResult:
        text = text.strip()
        if not text:
            raise TtsError("빈 텍스트")

        cache = self._cache_path(text)
        if cache.exists():
            return TtsResult(audio=cache.read_bytes(), mime="audio/mpeg", provider=self.name, cached=True)

        body = {
            "input": {"text": text},
            "voice": {"languageCode": "ko-KR", "name": self.voice},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": self.rate},
        }
        url = self.ENDPOINT
        headers = {"Content-Type": "application/json; charset=utf-8"}
        if self.api_key:
            url = f"{self.ENDPOINT}?key={self.api_key}"
        else:
            headers["Authorization"] = f"Bearer {self._bearer_token()}"

        try:
            res = requests.post(url, headers=headers, data=json.dumps(body), timeout=self.timeout)
        except requests.RequestException as e:
            raise TtsError(f"Google TTS 요청 실패: {type(e).__name__}") from e
        if res.status_code != 200:
            raise TtsError(f"Google TTS 응답 오류: HTTP {res.status_code} {res.text[:200]}")
        audio_b64 = res.json().get("audioContent") or ""
        if not audio_b64:
            raise TtsError("Google TTS 빈 오디오")
        audio = base64.b64decode(audio_b64)
        cache.write_bytes(audio)
        return TtsResult(audio=audio, mime="audio/mpeg", provider=self.name)


def make_tts_provider(kind: str | None = None) -> TtsProvider | None:
    """auto: Google 키 있으면 Google, 없으면 None(프론트 브라우저 TTS 폴백)."""
    kind = (kind or os.getenv("KIOSK_TTS", "auto")).lower()
    if kind == "none":
        return None
    if kind == "google":
        return GoogleTtsProvider()
    try:
        return GoogleTtsProvider()
    except TtsError:
        return None
