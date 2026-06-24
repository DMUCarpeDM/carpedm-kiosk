"""FastAPI 백엔드 — API 키는 서버 환경변수에만 존재 (FR-B1).

엔드포인트:
- POST /api/interpret  : 발화 → 해석 (멀티턴: 현재 장바구니 동봉)
- GET  /api/menu       : menu.json 그대로 (단일 소스, FR-B2)
- GET  /healthz
로깅 (FR-D1): data/logs/utterances.jsonl — 개인 식별정보 없음 (P-6).
폴백 (FR-V2): Claude 실패 시 RuleProvider로 자동 전환.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.interpreter import (
    CartItem,
    InterpretResult,
    RuleProvider,
    ValidationErr,
    load_expressions,
    load_menu,
    make_provider,
)

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = Path(os.getenv("KIOSK_LOG_DIR", ROOT / "data" / "logs"))

app = FastAPI(title="CarpeDM Kiosk Backend", version="0.1")
app.add_middleware(  # 키오스크 로컬 환경: 동일 기기 프론트 허용
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

MENU = load_menu()
EXPRESSIONS = load_expressions()
PROVIDER = make_provider()
FALLBACK = RuleProvider()


class InterpretReq(BaseModel):
    utterance: str
    cart: list[CartItem] = []
    session_id: str | None = None


def log_event(rec: dict) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOG_DIR / "utterances.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


@app.get("/healthz")
def healthz():
    return {"ok": True, "provider": PROVIDER.name}


@app.get("/api/menu")
def get_menu():
    return {"items": list(MENU.values())}


@app.post("/api/interpret")
def interpret(req: InterpretReq) -> dict:
    sid = req.session_id or uuid.uuid4().hex[:12]
    t0 = time.perf_counter()
    fallback_used = False
    error: str | None = None

    try:
        result: InterpretResult = PROVIDER.interpret(req.utterance, req.cart, MENU, EXPRESSIONS)
    except Exception as e:  # 네트워크/LLM/검증 실패 → 규칙 폴백 (FR-V2, P-4)
        error = f"{type(e).__name__}: {e}"
        fallback_used = PROVIDER.name != FALLBACK.name
        try:
            result = FALLBACK.interpret(req.utterance, req.cart, MENU, EXPRESSIONS)
        except Exception:
            result = InterpretResult(
                action="clarify",
                cart=req.cart,
                question="죄송해요, 잘 알아듣지 못했어요. 화면의 큰 버튼으로 골라 주셔도 돼요.",
                provider="error",
            )

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
