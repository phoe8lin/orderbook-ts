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
- **做市商对称挂单识别与过滤**（展开侧栏复选框=灰点标记，收起侧栏按钮=直接从图表中消除）
- **大额挂单吸收检测**（紫色幽灵环 + 方向色内点，时间窗口可选 15s/30s/1m/2m/5m/10m）
- macOS 菜单栏实时大单信息 + 拷贝功能
- 可调刷新间隔（1s ~ 60s）
- 标的搜索与快速添加/移除

## 做市商过滤 & 吸收检测

### 做市商（MM）对称挂单过滤
识别中间价 ±0.3% 内对称分布的 bid/ask 大单对，两种操作：

| 位置 | 控件 | 效果 |
|---|---|---|
| 展开侧栏 | 复选框「过滤做市商对称单」| 用浅灰小点标记 MM 档，Top5 标签与大单徽章使用过滤后版本 |
| 收起侧栏 | Filter 按钮 | 直接从图表中移除 MM 价档渲染；徽章尾部带 `·F` 标识 |

算法：距离对称容差 15%、数量对称容差 25%、在每侧 Top-30 大档中寻找配对。

### 大额挂单吸收
**"大单"定义**：每侧 **Top5**（按数量排名）的挂单。

**"吸收"阈值**：
- 上次快照的 Top 大单在本次**缩量 ≥ 60%**
- 在该价格 **±5 bps** 邻域内、该方向（bid→sell / ask→buy）的市价成交量 **≥ 缩量 × 50%**
- 满足 ⇒ 判定吸收；不满足 ⇒ 视为撤单（不记录）

**可视化**：紫色幽灵环（大小 ∝ 缩量）+ 方向色内点（绿=bid 被卖掉、红=ask 被买掉）+ 虚线引到 x 轴 + 秒数标签。按时间窗口线性淡出，**时间窗口可在侧栏下拉切换**（15s / 30s / 1m / 2m / 5m / 10m，默认 30s）。

**调参入口**：`backend/server.py` 顶部常量
- `_ABSORPTION_SHRINK_MIN = 0.6` — 缩量阈值
- `_ABSORPTION_TRADE_COVER = 0.5` — 成交覆盖比
- `tick_tol = mid * 0.0005` — 邻域范围

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
