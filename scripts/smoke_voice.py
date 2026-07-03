"""실연동 스모크 테스트 — 실제 키로 STT·TTS·/order 한 사이클을 검증한다.

사용:
  python scripts/smoke_voice.py            # STT + TTS 직접 호출
  python scripts/smoke_voice.py --tts-only # TTS만 (STT 키 없을 때)

테스트 음성: test_audio/ 의 wav를 쓰고, 없으면 macOS `say`로 생성한다.
결과는 화면에만 출력한다 (키·오디오를 저장소에 남기지 않는다).
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from backend.interpreter import load_menu  # noqa: E402
from backend.providers.stt import SttError, make_stt_provider  # noqa: E402
from backend.providers.tts import TtsError, make_tts_provider  # noqa: E402

TEST_PHRASES = [
    "불고기 버거 세트 하나 주세요",
    "검은 탄산 물 두 개 줘",
    "매운 거 추천해줘",
]


def make_test_wav(text: str) -> Path | None:
    """macOS `say`로 한국어 테스트 wav 생성 (개발 편의용)."""
    tmp = Path(tempfile.mkstemp(suffix=".wav")[1])
    try:
        subprocess.run(
            ["say", "-v", "Yuna", "-o", str(tmp), "--data-format=LEI16@16000", text],
            check=True, capture_output=True, timeout=30,
        )
        return tmp
    except (subprocess.SubprocessError, FileNotFoundError):
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tts-only", action="store_true")
    args = ap.parse_args()

    menu = load_menu()
    ok = True

    # ── TTS ──────────────────────────────────────────
    tts = make_tts_provider()
    if tts is None:
        print("✗ TTS: 프로바이더 미설정 (.env의 GOOGLE_TTS_API_KEY 또는 GOOGLE_APPLICATION_CREDENTIALS)")
        ok = False
    else:
        try:
            t0 = time.perf_counter()
            r = tts.synthesize("안녕하세요, 롯데리아입니다. 무엇을 도와드릴까요?")
            ms = round((time.perf_counter() - t0) * 1000)
            print(f"✓ TTS({r.provider}): {len(r.audio):,} bytes, {ms}ms, cached={r.cached}")
        except TtsError as e:
            print(f"✗ TTS 실패: {e}")
            ok = False

    if args.tts_only:
        return 0 if ok else 1

    # ── STT ──────────────────────────────────────────
    stt = make_stt_provider(menu)
    if stt is None:
        print("✗ STT: 프로바이더 미설정 (.env의 CLOVA_SPEECH_* 또는 GEMINI_API_KEY)")
        return 1
    print(f"  STT 프로바이더: {stt.name}")

    for phrase in TEST_PHRASES:
        wav = make_test_wav(phrase)
        if wav is None:
            print("✗ 테스트 음성 생성 실패 (macOS `say` 필요) — 실제 녹음 파일로 확인하세요")
            return 1
        try:
            t0 = time.perf_counter()
            r = stt.transcribe(wav.read_bytes())
            ms = round((time.perf_counter() - t0) * 1000)
            mark = "✓" if any(w in r.text for w in phrase.split()[:1]) else "△"
            print(f'{mark} STT({r.provider}) {ms}ms: "{phrase}" → "{r.text}"')
        except SttError as e:
            print(f'✗ STT 실패: "{phrase}" → {e}')
            ok = False
        finally:
            wav.unlink(missing_ok=True)

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
