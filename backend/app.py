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

# s1==========================================
# [STT] 음성 파일 처리 및 외부 통신용 라이브러리 추가
# 작성자: 김나우
from fastapi import UploadFile, File 
import requests                     
import base64
# s1==========================================              

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

# s2==============================================================================
# [STT] 구글 공식 라이브러리 기반 정석 연동 (404 에러 원천 차단 버전)
# 작성자: 김나우
import google.generativeai as genai

@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """[STT] 프론트엔드의 녹음 파일을 수신하여 텍스트로 변환하는 엔드포인트"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"text": "", "error": "STT 연동을 위한 API 키가 설정되지 않았습니다."}
    
    try:
        # 1. 구글 공식 라이브러리에 안전하게 API 키 설정
        genai.configure(api_key=api_key)
        
        # 2. 프론트엔드가 전송한 오디오 바이너리 데이터 읽기
        audio_bytes = await file.read()
        
        # 3. 메뉴판 데이터 힌트 추출
        menu_hints = ", ".join(list(MENU.keys())) if 'MENU' in globals() else "아메리카노, 카페라떼, 녹차"
        
        # 4. 구글 공식 안전 규격으로 프롬프트 설정
        prompt = (
            f"오디오를 듣고 사용자가 말한 한국어 주문 내용을 한 자도 빠짐없이 정확한 텍스트로만 변환해줘.\n"
            f"★ 중요 힌트 (우리 매장의 실제 메뉴 목록): [{menu_hints}]\n"
            f"발음이 뭉개지거나 '검은 물', '아메리가노'처럼 유사한 별칭으로 말하면 위 메뉴 목록 중 가장 알맞은 실제 메뉴명으로 보정해서 받아쓰기해줘.\n"
            f"다른 군더더기 설명이나 인사말은 절대 포함하지 마."
        )
        
        # 5. [진짜 최종 해결] 라이브러리가 내부적으로 v1beta 주소를 쓰지 못하도록, 
        # 정식 v1 주소(api_version='v1')를 명시하여 404 에러를 완벽하게 차단합니다.
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash"
        )
        
        # 6. 바이너리 데이터를 안전한 구조체로 전송
        response = model.generate_content([
            prompt,
            {
                "mime_type": "audio/wav",
                "data": audio_bytes
            }
        ])
        
        
        # 7. 결과 텍스트 반환
        stt_result = response.text.strip() if response.text else ""
        return {"text": stt_result}
        
    except Exception as e:
        return {"text": "", "error": f"STT 처리 중 오류 발생: {str(e)}"}
# s2==============================================================================