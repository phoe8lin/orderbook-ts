#!/bin/bash
# 单独启动后端
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/opt/anaconda3/envs/trade/bin/python"

echo "Starting Python FastAPI backend on port 8888..."
cd "$SCRIPT_DIR/backend"
$PYTHON -m uvicorn server:app --host 0.0.0.0 --port 8888 --reload
