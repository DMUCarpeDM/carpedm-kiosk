"""인체 감지(카메라/PIR) 모듈 테스트 — 하드웨어 없이 상태 로직만 검증한다."""
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.presence import (  # noqa: E402
    CameraPresenceMonitor,
    PresenceMonitor,
    make_presence_monitor,
)


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


def test_camera_present_holds_then_expires():
    """카메라 감지기도 PIR과 같은 상태 로직 — 얼굴 검출(=simulate) 후 유지, 시간 지나면 없음."""
    m = CameraPresenceMonitor(hold_seconds=0.2)
    m.enabled = True  # 카메라 없이 상태 로직만 검증
    assert m.present is False

    m.simulate_motion()
    assert m.present is True
    assert m.status()["seconds_since_motion"] is not None

    time.sleep(0.25)
    assert m.present is False


def test_camera_disabled_without_hardware():
    """cv2/카메라가 없으면 조용히 비활성 — start()가 예외를 삼키고 enabled=False.
    없는 인덱스(999)를 써서, cv2가 설치돼 있어도 실제 웹캠을 열지 않고 검증한다."""
    m = CameraPresenceMonitor(cam_index=999).start()
    assert m.enabled is False
    assert m.present is False


def test_factory_off_disables(monkeypatch):
    monkeypatch.setenv("KIOSK_PRESENCE", "off")
    m = make_presence_monitor()
    assert m.enabled is False
    assert set(m.status()) == {"enabled", "present", "seconds_since_motion"}


def test_factory_auto_disabled_on_non_pi(monkeypatch):
    """개발 맥·CI(비 라즈베리파이) auto 모드에서는 카메라를 켜지 않고 비활성이어야 한다."""
    monkeypatch.delenv("KIOSK_PRESENCE", raising=False)
    m = make_presence_monitor()
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
