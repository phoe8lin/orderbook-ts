#!/bin/bash
# OrderFlow Monitor - 双击启动
# 同时启动 Python 后端和 Next.js 前端

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/opt/anaconda3/envs/trade/bin/python"

echo "========================================="
echo "  OrderFlow Monitor - 启动中..."
echo "========================================="

# 检查 Node 是否可用
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js first."
    read -p "Press any key to exit..."
    exit 1
fi

# 检查前端依赖
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd "$SCRIPT_DIR/frontend"
    npm install
fi

# 启动 Python 后端
echo "🚀 [1/2] Starting Backend (port 8888)..."
cd "$SCRIPT_DIR/backend"
$PYTHON -m uvicorn server:app --host 0.0.0.0 --port 8888 &
BACKEND_PID=$!

# 等待后端就绪
sleep 2

# 启动 Next.js 前端
echo "🚀 [2/2] Starting Frontend (port 3088)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# 等待前端就绪
sleep 4

# 自动打开浏览器
open "http://localhost:3088"

echo ""
echo "========================================="
echo "  ✅ OrderFlow Monitor 已启动"
echo "  Backend:  http://127.0.0.1:8888"
echo "  Frontend: http://localhost:3088"
echo "========================================="
echo ""
echo "关闭此窗口将停止所有服务"
echo "或按 Ctrl+C 停止"

# 捕获退出信号
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "All services stopped."
}

trap cleanup EXIT INT TERM
wait
