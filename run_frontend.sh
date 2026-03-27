#!/bin/bash
# 单独启动前端
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Next.js frontend on port 3088..."
cd "$SCRIPT_DIR/frontend"
npm run dev
