"""인체 감지 (PIR, HC-SR501) — 손님이 다가오면 키오스크가 먼저 인사한다.

하드웨어: HC-SR501 OUT → GPIO (기본 17번). 배선은 docs/raspberry-pi.md 참고.
라즈베리파이가 아니거나 gpiozero가 없으면 자동으로 비활성화된다 —
개발 맥에서는 enabled=false로 응답하고 프론트가 기능을 숨긴다.

환경변수:
  KIOSK_PIR      auto(기본) | off
  KIOSK_PIR_PIN  GPIO 번호 (기본 17)
  KIOSK_PIR_HOLD 마지막 감지 후 '있음'으로 유지할 초 (기본 8)
"""
from __future__ import annotations

import os
import time


class PresenceMonitor:
    """PIR 센서 상태를 유지한다. 센서가 없으면 enabled=False로 조용히 동작."""

    def __init__(self, pin: int = 17, hold_seconds: float = 8.0):
        self.pin = pin
        self.hold_seconds = hold_seconds
        self.enabled = False
        self._last_motion: float = 0.0
        self._sensor = None

    # ── 센서 연결 ────────────────────────────────────
    def start(self) -> "PresenceMonitor":
        if (os.getenv("KIOSK_PIR", "auto").lower()) == "off":
            return self
        try:
            from gpiozero import MotionSensor  # 라즈베리파이에서만 존재

            self._sensor = MotionSensor(self.pin)
            self._sensor.when_motion = self._on_motion
            self.enabled = True
        except Exception:
            # 파이가 아니거나 배선/드라이버 문제 — 키오스크는 센서 없이도 정상 동작해야 한다
            self.enabled = False
        return self

    def _on_motion(self) -> None:
        self._last_motion = time.time()

    # ── 상태 ─────────────────────────────────────────
    @property
    def present(self) -> bool:
        return self.enabled and (time.time() - self._last_motion) < self.hold_seconds

    def status(self) -> dict:
        since = round(time.time() - self._last_motion, 1) if self._last_motion else None
        return {"enabled": self.enabled, "present": self.present, "seconds_since_motion": since}

    # 테스트·수동 트리거용 (하드웨어 없이 검증)
    def simulate_motion(self) -> None:
        self._on_motion()

    @classmethod
    def from_env(cls) -> "PresenceMonitor":
        pin = int(os.getenv("KIOSK_PIR_PIN", "17"))
        hold = float(os.getenv("KIOSK_PIR_HOLD", "8"))
        return cls(pin=pin, hold_seconds=hold).start()
