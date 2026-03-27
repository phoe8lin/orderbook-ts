#!/bin/bash
# 订单流分析工具 - TS版本 启动脚本
# 同时启动 Python 后端 和 Next.js 前端

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/opt/anaconda3/envs/trade/bin/python"

echo "========================================="
echo "  订单流分析工具 - TypeScript 版本"
echo "========================================="

# 启动 Python 后端
echo "[1/2] Starting Python FastAPI backend on port 8888..."
cd "$SCRIPT_DIR/backend"
$PYTHON -m uvicorn server:app --host 0.0.0.0 --port 8888 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 启动 Next.js 前端
echo "[2/2] Starting Next.js frontend on port 3088..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo "  Backend:  http://127.0.0.1:8888"
echo "  Frontend: http://localhost:3088"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop both services"

# 捕获退出信号，同时停止两个进程
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "All services stopped."
}

trap cleanup EXIT INT TERM

# 等待任一进程退出
wait
