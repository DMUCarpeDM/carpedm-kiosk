"""인체 감지 — 손님이 다가오면 키오스크가 먼저 인사한다.

두 가지 방식을 같은 인터페이스(.enabled / .present / .status())로 제공한다:
- 카메라(기본): 웹캠/파이 카메라로 얼굴을 검출하고, 얼굴이 화면에서 일정 크기 이상
  = '가까이 다가옴'으로 판단한다. OpenCV Haar 캐스케이드(고전 CV, 경량) 사용 —
  클라우드 추론이 아니라 센서 대체이므로 'Pi=thin client' 원칙과 충돌하지 않는다.
- PIR(HC-SR501): 기존 방식. KIOSK_PRESENCE=pir로 선택.

개인정보(P-6): 카메라 프레임은 메모리에서만 처리하고 절대 저장·전송하지 않는다.
얼굴 '있음/없음' 상태값만 남긴다(이미지·특징점 저장 안 함).

라즈베리파이가 아니거나 카메라/드라이버가 없으면 자동으로 enabled=False —
개발 맥에서는 조용히 비활성, 프론트는 기능을 숨긴다. 키오스크는 센서 없이도 정상 동작한다.

환경변수:
  KIOSK_PRESENCE     auto(기본) | camera | pir | off
                     auto = 라즈베리파이면 카메라 시도(실패 시 PIR), 그 외엔 비활성
  # 카메라
  KIOSK_CAM_INDEX    카메라 장치 번호 (기본 0)
  KIOSK_CAM_MIN_FACE 얼굴 폭 / 화면 폭 비율이 이 값 이상이면 '가까이'로 판정 (기본 0.18)
  KIOSK_CAM_INTERVAL 프레임 확인 간격 초 (기본 0.4)
  KIOSK_PRESENCE_HOLD 마지막 감지 후 '있음'으로 유지할 초 (기본 6)
  # PIR
  KIOSK_PIR_PIN      GPIO 번호 (기본 17)
  KIOSK_PIR_HOLD     마지막 감지 후 '있음'으로 유지할 초 (기본 8)
"""
from __future__ import annotations

import os
import threading
import time


class _BasePresence:
    """감지 상태 유지 공통 로직. 하위 클래스가 하드웨어 연결(start)을 구현한다."""

    def __init__(self, hold_seconds: float):
        self.hold_seconds = hold_seconds
        self.enabled = False
        self._last_seen: float = 0.0

    def _mark(self) -> None:
        """감지 시각 갱신 — 센서 콜백/카메라 루프/테스트에서 호출."""
        self._last_seen = time.time()

    @property
    def present(self) -> bool:
        return self.enabled and (time.time() - self._last_seen) < self.hold_seconds

    def status(self) -> dict:
        since = round(time.time() - self._last_seen, 1) if self._last_seen else None
        return {"enabled": self.enabled, "present": self.present, "seconds_since_motion": since}

    # 테스트·수동 트리거용 (하드웨어 없이 검증)
    def simulate_motion(self) -> None:
        self._mark()

    def stop(self) -> None:  # 기본은 아무것도 안 함 (하위 클래스가 필요 시 override)
        pass


class PresenceMonitor(_BasePresence):
    """PIR 센서(HC-SR501) 상태를 유지한다. 센서가 없으면 enabled=False로 조용히 동작.

    하드웨어: HC-SR501 OUT → GPIO (기본 17번). 배선은 docs/raspberry-pi.md 참고.
    """

    def __init__(self, pin: int = 17, hold_seconds: float = 8.0):
        super().__init__(hold_seconds)
        self.pin = pin
        self._sensor = None

    def start(self) -> "PresenceMonitor":
        if (os.getenv("KIOSK_PIR", "auto").lower()) == "off":
            return self
        try:
            from gpiozero import MotionSensor  # 라즈베리파이에서만 존재

            self._sensor = MotionSensor(self.pin)
            self._sensor.when_motion = self._mark
            self.enabled = True
        except Exception:
            # 파이가 아니거나 배선/드라이버 문제 — 키오스크는 센서 없이도 정상 동작해야 한다
            self.enabled = False
        return self

    @classmethod
    def from_env(cls) -> "PresenceMonitor":
        pin = int(os.getenv("KIOSK_PIR_PIN", "17"))
        hold = float(os.getenv("KIOSK_PIR_HOLD", "8"))
        return cls(pin=pin, hold_seconds=hold).start()


class CameraPresenceMonitor(_BasePresence):
    """카메라로 얼굴을 검출해 '가까이 다가옴'을 판단한다.

    얼굴 폭이 화면 폭의 min_face_frac 이상이면 근접으로 보고 감지 시각을 갱신한다.
    별도 데몬 스레드에서 일정 간격으로만 프레임을 확인해 CPU 부담을 낮춘다.
    프레임은 메모리에서만 쓰고 저장하지 않는다(P-6).
    """

    _PROC_WIDTH = 320  # 검출 전 축소 폭 — 파이에서 속도 확보 (비율 판정이라 정확도 영향 없음)

    def __init__(
        self,
        cam_index: int = 0,
        min_face_frac: float = 0.18,
        hold_seconds: float = 6.0,
        interval: float = 0.4,
    ):
        super().__init__(hold_seconds)
        self.cam_index = cam_index
        self.min_face_frac = min_face_frac
        self.interval = interval
        self._cap = None
        self._cascade = None
        self._thread: threading.Thread | None = None
        self._running = False

    def start(self) -> "CameraPresenceMonitor":
        try:
            import cv2  # opencv-python(-headless). 없으면 ImportError → 비활성

            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            cascade = cv2.CascadeClassifier(cascade_path)
            if cascade.empty():
                return self  # 캐스케이드 파일 없음 — 비활성 유지

            cap = cv2.VideoCapture(self.cam_index)
            if not cap.isOpened():
                cap.release()
                return self  # 카메라 없음 — 비활성 유지

            self._cascade = cascade
            self._cap = cap
            self._running = True
            self.enabled = True
            self._thread = threading.Thread(target=self._loop, name="camera-presence", daemon=True)
            self._thread.start()
        except Exception:
            # cv2 미설치·카메라 접근 실패 등 — 센서 없이도 키오스크는 정상 동작
            self.enabled = False
        return self

    def _loop(self) -> None:
        import cv2

        while self._running:
            ok, frame = self._cap.read()
            if not ok or frame is None:
                time.sleep(self.interval)
                continue

            h, w = frame.shape[:2]
            if w > self._PROC_WIDTH:
                scale = self._PROC_WIDTH / w
                frame = cv2.resize(frame, (self._PROC_WIDTH, int(h * scale)))
                w = self._PROC_WIDTH

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self._cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4)
            # 화면 폭 대비 충분히 큰(=가까운) 얼굴이 하나라도 있으면 근접으로 본다
            if any(fw >= self.min_face_frac * w for (_x, _y, fw, _fh) in faces):
                self._mark()

            time.sleep(self.interval)

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    @classmethod
    def from_env(cls) -> "CameraPresenceMonitor":
        return cls(
            cam_index=int(os.getenv("KIOSK_CAM_INDEX", "0")),
            min_face_frac=float(os.getenv("KIOSK_CAM_MIN_FACE", "0.18")),
            hold_seconds=float(os.getenv("KIOSK_PRESENCE_HOLD", "6")),
            interval=float(os.getenv("KIOSK_CAM_INTERVAL", "0.4")),
        ).start()


def _is_raspberry_pi() -> bool:
    """라즈베리파이 여부 — auto 모드에서 개발 맥의 웹캠을 함부로 켜지 않기 위해 확인."""
    try:
        with open("/sys/firmware/devicetree/base/model", "rb") as f:
            return b"Raspberry Pi" in f.read()
    except OSError:
        return False


def make_presence_monitor() -> _BasePresence:
    """환경변수 KIOSK_PRESENCE에 따라 카메라/PIR/비활성 감지기를 만든다.

    auto(기본): 라즈베리파이면 카메라를 시도하고 실패 시 PIR로, 그 외 환경(개발 맥·CI)에서는
    비활성으로 둔다. 맥에서 카메라를 테스트하려면 KIOSK_PRESENCE=camera로 명시한다.
    """
    mode = os.getenv("KIOSK_PRESENCE", "auto").lower()

    if mode == "off":
        return _BasePresence(hold_seconds=1.0)  # enabled=False 고정
    if mode == "camera":
        return CameraPresenceMonitor.from_env()
    if mode == "pir":
        return PresenceMonitor.from_env()

    # auto
    if _is_raspberry_pi():
        cam = CameraPresenceMonitor.from_env()
        if cam.enabled:
            return cam
        return PresenceMonitor.from_env()  # 카메라 없으면 PIR 시도
    return _BasePresence(hold_seconds=1.0)  # 개발 맥·CI: 비활성
