# OrderFlow Monitor - TypeScript Edition

实时订单簿深度分析工具，基于 Next.js + FastAPI 架构。

## 架构

| 层 | 技术栈 | 端口 |
|---|---|---|
| **Backend** | Python FastAPI + ccxt + pandas + pandas_ta | 8888 |
| **Frontend** | Next.js 14 + TypeScript + TailwindCSS + Canvas | 3088 |
| **Menubar** | rumps (macOS 菜单栏通知) | - |

## 功能

- 双深度订单簿图表（1000档 + 100档），等比高度自适应
- 多标的同时监控（最多10个），独立轮询，并排面板
- Tab 组管理：保存/切换/删除不同标的组合
- 深色/浅色主题切换（米色护眼浅色主题）
- EMA 20/50/100/200 均线组竖线（5m → 100档，1h → 1000档）
- RSI/Strength 彩色状态指示（看涨绿/看跌红/中性紫/超买橙/超卖蓝）
- Top5 大单标注 + 特殊大单高亮
- macOS 菜单栏实时大单信息 + 拷贝功能
- 可调刷新间隔（1s ~ 60s）
- 标的搜索与快速添加/移除

## 快速启动

### 方式一：双击启动
双击 `OrderFlow Monitor.command` 文件即可自动启动前后端并打开浏览器。

### 方式二：命令行启动
```bash
./run.sh
```

### 方式三：分别启动
```bash
# 后端
./run_backend.sh

# 前端（另一终端）
./run_frontend.sh
```

## 依赖

- Python: ccxt, pandas, pandas_ta, fastapi, uvicorn, rumps
- Node.js: next, react, tailwindcss, lucide-react
- 代理: 需要 Clash 代理运行在 127.0.0.1:7890

## 配置

前端 API 地址在 `frontend/.env.local` 中配置：
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8888
```
