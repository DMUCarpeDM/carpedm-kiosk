"""인체 감지(PIR) 모듈 테스트 — 하드웨어 없이 상태 로직만 검증한다."""
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.presence import PresenceMonitor  # noqa: E402


def test_disabled_without_hardware():
    """gpiozero가 없는 환경(맥·CI)에서는 조용히 비활성 — 키오스크는 계속 동작해야 한다."""
    m = PresenceMonitor().start()
    s = m.status()
    assert s["enabled"] is False
    assert s["present"] is False


def test_present_holds_then_expires():
    m = PresenceMonitor(hold_seconds=0.2)
    m.enabled = True  # 하드웨어 없이 상태 로직만 검증
    assert m.present is False

    m.simulate_motion()
    assert m.present is True
    assert m.status()["seconds_since_motion"] is not None

    time.sleep(0.25)
    assert m.present is False  # 유지 시간이 지나면 '없음'


def test_off_env_disables(monkeypatch):
    monkeypatch.setenv("KIOSK_PIR", "off")
    m = PresenceMonitor.from_env()
    assert m.enabled is False


def test_api_presence_endpoint():
    import os

    os.environ["KIOSK_PROVIDER"] = "rule"
    from fastapi.testclient import TestClient

    from backend.app import app

    res = TestClient(app).get("/api/presence")
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"enabled", "present", "seconds_since_motion"}
