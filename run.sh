#!/bin/bash
set -e

# Resolve script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=== CarpeDM Kiosk Backend Setup & Run ==="

# 1. Setup Python Virtual Environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

# 2. Upgrade pip and install dependencies
echo "Installing requirements..."
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# 3. Setup .env file if missing
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
fi

# 4. Start uvicorn development server
echo "Starting backend server on http://127.0.0.1:8000..."
.venv/bin/uvicorn backend.app:app --reload --port 8000
