# CarpeDM 백엔드 실행 (Windows)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".venv")) {
    Write-Host "가상환경 없음 → .venv 생성 중..."
    python -m venv .venv
    & .\.venv\Scripts\pip.exe install -r requirements.txt
}

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host ".env 생성됨 — ANTHROPIC_API_KEY 입력 시 Claude 사용, 없으면 rule 폴백"
}

Write-Host "http://127.0.0.1:8000 (docs: /docs)"
& .\.venv\Scripts\python.exe -m uvicorn backend.app:app --port 8000 --reload
