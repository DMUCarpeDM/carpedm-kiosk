"""STT/TTS 프로바이더·/order 오케스트레이션 테스트 (외부 API는 전부 모의 객체).

실제 CLOVA/Google 연동 확인은 `python scripts/smoke_voice.py` (키 필요)로 한다.
"""
import base64
import io
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

os.environ["KIOSK_PROVIDER"] = "rule"
os.environ.setdefault("KIOSK_STT", "auto")

import pytest  # noqa: E402

from backend.interpreter import load_menu  # noqa: E402
from backend.providers import stt as stt_mod  # noqa: E402
from backend.providers import tts as tts_mod  # noqa: E402

MENU = load_menu()


# ── 부스팅 키워드 ────────────────────────────────────
def test_build_boost_words_covers_menu_names():
    words = stt_mod.build_boost_words(MENU)
    assert "불고기 버거" in words and "불고기버거" in words
    assert "티렉스 버거" in words
    assert len(words) == len(set(words))  # 중복 없음
    assert len(words) <= 1000  # CLOVA 제한


# ── CLOVA STT 요청 형식 ──────────────────────────────
class FakeResponse:
    def __init__(self, status_code=200, body=None, text=""):
        self.status_code = status_code
        self._body = body or {}
        self.text = text

    def json(self):
        return self._body


def test_clova_request_format(monkeypatch):
    monkeypatch.setenv("CLOVA_SPEECH_INVOKE_URL", "https://clovaspeech-gw.ncloud.com/external/v1/1234/abcd")
    monkeypatch.setenv("CLOVA_SPEECH_SECRET_KEY", "test-secret")
    monkeypatch.delenv("CLOVA_CLIENT_ID", raising=False)  # 로컬 .env 격리
    captured = {}

    def fake_post(url, headers=None, files=None, timeout=None):
        captured.update(url=url, headers=headers, files=files)
        return FakeResponse(200, {"text": "불고기 버거 하나 주세요"})

    monkeypatch.setattr(stt_mod.requests, "post", fake_post)
    provider = stt_mod.ClovaSttProvider(MENU)
    r = provider.transcribe(b"fake-audio")

    assert r.text == "불고기 버거 하나 주세요"
    assert captured["url"].endswith("/recognizer/upload")
    assert captured["headers"]["X-CLOVASPEECH-API-KEY"] == "test-secret"
    params = json.loads(captured["files"]["params"][1])
    assert params["language"] == "ko-KR"
    assert params["completion"] == "sync"
    assert "불고기 버거" in params["boostings"][0]["words"]  # 메뉴명 부스팅 (콤마 구분 문자열)


def test_clova_short_mode_request_format(monkeypatch):
    """단문 인식(/recog/v1): octet-stream + 탭 구분 boostings + lang=Kor."""
    monkeypatch.setenv("CLOVA_SPEECH_INVOKE_URL", "https://clovaspeech-gw.ncloud.com/recog/v1")
    monkeypatch.setenv("CLOVA_SPEECH_SECRET_KEY", "test-secret")
    monkeypatch.delenv("CLOVA_CLIENT_ID", raising=False)
    captured = {}

    def fake_post(url, headers=None, params=None, data=None, timeout=None):
        captured.update(url=url, headers=headers, params=params, data=data)
        return FakeResponse(200, {"text": "콜라 두 개 주세요"})

    monkeypatch.setattr(stt_mod.requests, "post", fake_post)
    provider = stt_mod.ClovaSttProvider(MENU)
    assert provider.long_mode is False
    r = provider.transcribe(b"pcm-audio")

    assert r.text == "콜라 두 개 주세요"
    assert captured["url"].endswith("/recog/v1/stt")
    assert captured["headers"]["X-CLOVASPEECH-API-KEY"] == "test-secret"
    assert captured["headers"]["Content-Type"] == "application/octet-stream"
    assert captured["params"]["lang"] == "Kor"
    boost = captured["params"]["boostings"]
    assert "\t" in boost and len(boost) <= 512  # 탭 구분, 512자 제한
    assert all(len(w) >= 3 for w in boost.split("\t"))  # 3자 미만 키워드 제외
    assert captured["data"] == b"pcm-audio"


def test_clova_http_error_raises(monkeypatch):
    monkeypatch.setenv("CLOVA_SPEECH_INVOKE_URL", "https://example.com/v1/x")
    monkeypatch.setenv("CLOVA_SPEECH_SECRET_KEY", "k")
    monkeypatch.setattr(stt_mod.requests, "post", lambda *a, **kw: FakeResponse(401, {}, "unauthorized"))
    provider = stt_mod.ClovaSttProvider(MENU)
    with pytest.raises(stt_mod.SttError):
        provider.transcribe(b"x")


def test_clova_missing_keys_raises(monkeypatch):
    monkeypatch.delenv("CLOVA_SPEECH_INVOKE_URL", raising=False)
    monkeypatch.delenv("CLOVA_SPEECH_SECRET_KEY", raising=False)
    with pytest.raises(stt_mod.SttError):
        stt_mod.ClovaSttProvider(MENU)


# ── Google TTS 캐시 ──────────────────────────────────
def test_google_tts_cache(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_TTS_API_KEY", "test-key")
    monkeypatch.setattr(tts_mod, "CACHE_DIR", tmp_path)
    calls = {"n": 0}

    def fake_post(url, headers=None, data=None, timeout=None):
        calls["n"] += 1
        body = json.loads(data)
        assert body["voice"]["languageCode"] == "ko-KR"
        assert body["audioConfig"]["audioEncoding"] == "MP3"
        return FakeResponse(200, {"audioContent": base64.b64encode(b"fake-mp3").decode()})

    monkeypatch.setattr(tts_mod.requests, "post", fake_post)
    provider = tts_mod.GoogleTtsProvider()

    r1 = provider.synthesize("주문을 확정할게요.")
    r2 = provider.synthesize("주문을 확정할게요.")
    assert r1.audio == b"fake-mp3" and not r1.cached
    assert r2.audio == b"fake-mp3" and r2.cached
    assert calls["n"] == 1  # 같은 문장은 재합성하지 않는다


# ── /order 오케스트레이션 ────────────────────────────
@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("KIOSK_LOG_DIR", str(tmp_path))
    for mod in ["backend.app"]:
        sys.modules.pop(mod, None)
    from backend.app import app

    from fastapi.testclient import TestClient

    return TestClient(app)


def _audio_file():
    return {"file": ("record.wav", io.BytesIO(b"fake-audio"), "audio/wav")}


def test_order_without_stt_falls_back_gracefully(client):
    """STT 미설정 환경 — 죽지 않고 폴백 안내를 반환해야 한다."""
    import backend.app as appmod

    if appmod.STT is not None:  # CI/로컬에 키가 있으면 이 케이스는 건너뛴다
        pytest.skip("STT 키가 설정된 환경")
    res = client.post("/order", files=_audio_file(), data={"cart": "[]"})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is False and body["stage"] == "stt"
    assert "말씀" in body["message"]


def test_order_full_cycle_with_fake_stt(client, monkeypatch):
    import backend.app as appmod

    class FakeStt:
        name = "fake"

        def transcribe(self, audio, content_type="audio/wav"):
            from backend.providers.stt import SttResult

            return SttResult(text="콜라 하나 줘", provider="fake")

    monkeypatch.setattr(appmod, "STT", FakeStt())
    monkeypatch.setattr(appmod, "TTS", None)

    res = client.post("/order", files=_audio_file(), data={"cart": "[]"})
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["utterance"] == "콜라 하나 줘"
    assert body["action"] == "update"
    assert body["cart"] == [{"id": "cola", "qty": 1}]
    assert body["say"]  # 읽어줄 문장은 항상 존재
    assert body["audio_b64"] is None  # TTS 미설정 → 프론트 브라우저 TTS 폴백
    assert set(body["latency"]) == {"stt_ms", "interpret_ms", "tts_ms", "total_ms"}


def test_order_multiturn_carries_cart(client, monkeypatch):
    import backend.app as appmod

    class FakeStt:
        name = "fake"

        def transcribe(self, audio, content_type="audio/wav"):
            from backend.providers.stt import SttResult

            return SttResult(text="감자 튀김도 하나 줘", provider="fake")

    monkeypatch.setattr(appmod, "STT", FakeStt())
    monkeypatch.setattr(appmod, "TTS", None)

    res = client.post(
        "/order",
        files=_audio_file(),
        data={"cart": json.dumps([{"id": "bulgogi-burger", "qty": 1}]), "session_id": "s1"},
    )
    body = res.json()
    assert body["session_id"] == "s1"
    assert sorted((c["id"], c["qty"]) for c in body["cart"]) == [("bulgogi-burger", 1), ("fries", 1)]
