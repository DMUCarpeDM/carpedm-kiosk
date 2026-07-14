"""FastAPI 백엔드 — API 키는 서버 환경변수에만 존재 (FR-B1).

엔드포인트:
- POST /order          : 음성 파일 → STT → 해석 → TTS 오케스트레이션 (한 번에)
- POST /api/interpret  : 텍스트 발화 → 해석 (멀티턴: 현재 장바구니 동봉)
- POST /api/stt        : 음성 파일 → 텍스트 (프론트 개별 호출용, 하위 호환)
- POST /api/tts        : 텍스트 → 음성 (인사말 등 개별 합성)
- GET  /api/menu       : menu.json 그대로 (단일 소스, FR-B2)
- GET  /healthz
로깅 (FR-D1): data/logs/utterances.jsonl — 개인 식별정보 없음 (P-6).
폴백 (FR-V2): Claude 실패 시 RuleProvider, STT/TTS 실패 시 단계적 폴백.
"""
from __future__ import annotations

import base64
import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.interpreter import (
    CartItem,
    InterpretResult,
    RuleProvider,
    load_expressions,
    load_menu,
    make_provider,
)
from backend.presence import make_presence_monitor
from backend.providers.stt import SttError, make_stt_provider
from backend.providers.tts import TtsError, make_tts_provider

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = Path(os.getenv("KIOSK_LOG_DIR", ROOT / "data" / "logs"))

app = FastAPI(title="CarpeDM Kiosk Backend", version="0.2")
app.add_middleware(  # 키오스크 로컬 환경: 동일 기기 프론트 허용
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

MENU = load_menu()
EXPRESSIONS = load_expressions()
PROVIDER = make_provider()
FALLBACK = RuleProvider()

# 규칙 우선 게이트 — 표현 사전으로 확실히 풀리는 발화는 LLM API를 부르지 않는다 (비용·지연 절감).
# "0"=끔 / "1"(기본)=주문·확정만 규칙으로 / "all"=추천·거절까지 규칙으로 (절감 최대).
# 규칙이 clarify를 내면(못 알아들음) 기존대로 LLM이 의미 해석을 맡는다.
RULE_FIRST = os.getenv("KIOSK_RULE_FIRST", "1").strip().lower()


def rule_first_accepts(action: str) -> bool:
    if RULE_FIRST in ("0", "off", "false", ""):
        return False
    if RULE_FIRST == "all":
        return action in ("update", "confirm", "recommend", "reject")
    return action in ("update", "confirm")
STT = make_stt_provider(MENU)
TTS = make_tts_provider()
PRESENCE = make_presence_monitor()  # 카메라(기본)/PIR — 미장착 환경에서는 자동 비활성


class InterpretReq(BaseModel):
    utterance: str
    cart: list[CartItem] = []
    session_id: str | None = None


class TtsReq(BaseModel):
    text: str


def log_event(rec: dict) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOG_DIR / "utterances.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def run_interpret(utterance: str, cart: list[CartItem]) -> tuple[InterpretResult, bool, str | None]:
    """해석 실행 — 규칙 우선, 실패 시 규칙 폴백 (FR-V2, P-4). (결과, 폴백 여부, 오류) 반환."""
    if PROVIDER.name != FALLBACK.name:
        try:
            pre = FALLBACK.interpret(utterance, cart, MENU, EXPRESSIONS)
            if rule_first_accepts(pre.action):
                return pre, False, None
        except Exception:
            pass  # 규칙 우선은 최적화일 뿐 — 실패해도 LLM 경로로 계속
    try:
        return PROVIDER.interpret(utterance, cart, MENU, EXPRESSIONS), False, None
    except Exception as e:
        error = f"{type(e).__name__}: {e}"
        fallback_used = PROVIDER.name != FALLBACK.name
        try:
            return FALLBACK.interpret(utterance, cart, MENU, EXPRESSIONS), fallback_used, error
        except Exception:
            return (
                InterpretResult(
                    action="clarify",
                    cart=cart,
                    question="죄송합니다. 잘 알아듣지 못했습니다. 화면에서 직접 선택하실 수도 있습니다.",
                    provider="error",
                ),
                fallback_used,
                error,
            )


def spoken_text(result: InterpretResult) -> str:
    """TTS로 읽어줄 문장 — 되물음이 있으면 되물음을, 아니면 응답을."""
    return (result.question or result.reply or "").strip()


@app.get("/healthz")
def healthz():
    return {
        "ok": True,
        "provider": PROVIDER.name,
        "stt": STT.name if STT else None,
        "tts": TTS.name if TTS else None,
        "presence": type(PRESENCE).__name__ if PRESENCE.enabled else False,
    }


@app.get("/api/menu")
def get_menu():
    return {"items": list(MENU.values())}


@app.get("/api/presence")
def presence():
    """인체 감지 상태(카메라/PIR) — 프론트 대기 화면이 2초 간격으로 조회한다."""
    return PRESENCE.status()


@app.post("/api/interpret")
def interpret(req: InterpretReq) -> dict:
    sid = req.session_id or uuid.uuid4().hex[:12]
    t0 = time.perf_counter()
    result, fallback_used, error = run_interpret(req.utterance, req.cart)
    latency_ms = round((time.perf_counter() - t0) * 1000)
    log_event(
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "session": sid,
            "utterance": req.utterance,
            "cart_before": [c.model_dump() for c in req.cart],
            "action": result.action,
            "cart_after": [c.model_dump() for c in result.cart],
            "suggestions": result.suggestions,
            "provider": result.provider,
            "fallback": fallback_used,
            "latency_ms": latency_ms,
            "error": error,
        }
    )
    return {**result.model_dump(), "session_id": sid, "fallback": fallback_used, "latency_ms": latency_ms}


@app.post("/order")
async def order(
    file: UploadFile = File(...),
    cart: str = Form("[]"),
    session_id: str | None = Form(None),
) -> dict:
    """음성 주문 한 사이클: 오디오 → STT → 해석 → TTS. 단계별 지연을 로깅한다."""
    sid = session_id or uuid.uuid4().hex[:12]
    t_start = time.perf_counter()

    try:
        cart_items = [CartItem(**c) for c in json.loads(cart or "[]")]
    except (json.JSONDecodeError, TypeError, ValueError):
        cart_items = []

    # 1) STT
    stt_ms = 0
    stt_error: str | None = None
    text = ""
    if STT is not None:
        audio = await file.read()
        t0 = time.perf_counter()
        try:
            text = STT.transcribe(audio, file.content_type or "audio/wav").text
        except SttError as e:
            stt_error = str(e)
        stt_ms = round((time.perf_counter() - t0) * 1000)
    else:
        stt_error = "STT 프로바이더 미설정"

    if not text:
        # STT 실패 — 프론트가 브라우저 STT 또는 터치로 폴백하도록 알린다
        log_event(
            {
                "ts": datetime.now(timezone.utc).isoformat(),
                "session": sid,
                "stage": "stt_failed",
                "stt_provider": STT.name if STT else None,
                "stt_ms": stt_ms,
                "error": stt_error,
            }
        )
        return {
            "ok": False,
            "stage": "stt",
            "session_id": sid,
            "message": "음성이 잘 들리지 않았습니다. 다시 한 번 말씀해 주세요.",
        }

    # 2) 해석
    t0 = time.perf_counter()
    result, fallback_used, interp_error = run_interpret(text, cart_items)
    interpret_ms = round((time.perf_counter() - t0) * 1000)

    # 3) TTS (실패해도 주문 흐름은 계속 — 프론트 브라우저 TTS 폴백)
    tts_ms = 0
    tts_b64: str | None = None
    tts_mime = "audio/mpeg"
    say = spoken_text(result)
    if TTS is not None and say:
        t0 = time.perf_counter()
        try:
            tts = TTS.synthesize(say)
            tts_b64 = base64.b64encode(tts.audio).decode("ascii")
            tts_mime = tts.mime
        except TtsError:
            tts_b64 = None
        tts_ms = round((time.perf_counter() - t0) * 1000)

    total_ms = round((time.perf_counter() - t_start) * 1000)
    log_event(
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "session": sid,
            "utterance": text,
            "cart_before": [c.model_dump() for c in cart_items],
            "action": result.action,
            "cart_after": [c.model_dump() for c in result.cart],
            "suggestions": result.suggestions,
            "provider": result.provider,
            "stt_provider": STT.name if STT else None,
            "tts_provider": TTS.name if TTS else None,
            "fallback": fallback_used,
            "stt_ms": stt_ms,
            "interpret_ms": interpret_ms,
            "tts_ms": tts_ms,
            "latency_ms": total_ms,
            "error": interp_error,
        }
    )
    return {
        "ok": True,
        **result.model_dump(),
        "utterance": text,
        "say": say,
        "audio_b64": tts_b64,
        "audio_mime": tts_mime,
        "session_id": sid,
        "fallback": fallback_used,
        "latency": {"stt_ms": stt_ms, "interpret_ms": interpret_ms, "tts_ms": tts_ms, "total_ms": total_ms},
    }


@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """음성 파일 → 텍스트 (하위 호환). 실패 시 text는 빈 값."""
    if STT is None:
        return {"text": "", "error": "STT 프로바이더 미설정 (.env의 CLOVA/GEMINI 키 확인)"}
    audio = await file.read()
    try:
        r = STT.transcribe(audio, file.content_type or "audio/wav")
        return {"text": r.text, "provider": r.provider}
    except SttError as e:
        return {"text": "", "error": str(e)}


@app.post("/api/tts")
def text_to_speech(req: TtsReq):
    """텍스트 → 음성 (base64). 인사말 등 고정 안내문 합성에 사용, 캐시됨."""
    if TTS is None:
        return {"audio_b64": None, "error": "TTS 프로바이더 미설정"}
    try:
        r = TTS.synthesize(req.text)
        return {"audio_b64": base64.b64encode(r.audio).decode("ascii"), "mime": r.mime, "cached": r.cached}
    except TtsError as e:
        return {"audio_b64": None, "error": str(e)}


# ── 운영/태블릿 모드: 빌드된 프론트(frontend/dist)를 백엔드가 직접 서빙 ──
# 태블릿은 https://<서버IP>:8443 단일 주소로 접속 (docs/tablet.md).
# API 라우트가 먼저 등록되므로 이 마운트가 API를 가리지 않는다.
_DIST = ROOT / "frontend" / "dist"
if _DIST.is_dir():
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=_DIST, html=True), name="frontend")
