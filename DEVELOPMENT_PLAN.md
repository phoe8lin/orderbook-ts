# OrderFlow Monitor - 开发计划

## 项目现状

### 架构
| 层 | 技术栈 | 端口 |
|---|---|---|
| **Backend** | Python FastAPI + ccxt + pandas + pandas_ta | 8888 |
| **Frontend** | Next.js 14 + TypeScript + TailwindCSS + Canvas 2D | 3088 |
| **Menubar** | rumps (macOS 菜单栏通知) | - |

### 项目路径
`/Volumes/external/trade/订单薄数据监控-ts`

### 核心文件
| 文件 | 职责 |
|---|---|
| `backend/server.py` | FastAPI 后端，提供订单簿、EMA、RSI、大单分析等 API |
| `frontend/src/app/page.tsx` | 主页面，管理 Settings 状态、Tab 组、主题 |
| `frontend/src/components/OrderBookChart.tsx` | Canvas 2D 绘制深度图，支持 EMA 线、大单标注、彩色 summary |
| `frontend/src/components/SymbolPanel.tsx` | 单标的面板，独立轮询数据，包含 1000档+100档双图表 |
| `frontend/src/components/Sidebar.tsx` | 侧边栏：主题切换、Tab 管理、标的搜索、间隔/颜色设置 |
| `frontend/src/components/LargeOrderBadge.tsx` | 大单信息展示组件 |
| `frontend/src/types/orderbook.ts` | 数据接口定义 + 主题常量 (THEMES) |
| `frontend/src/lib/api.ts` | API 请求封装 |

### 已实现功能
- ✅ 双深度订单簿图表（1000档 + 100档），等比高度自适应
- ✅ 多标的同时监控（最多10个），独立轮询
- ✅ Tab 组管理（创建/切换/删除标的组合）
- ✅ 深色/浅色主题切换（米色护眼浅色主题）
- ✅ EMA 20/50/100/200 均线竖线（5m→100档，1h→1000档）
- ✅ RSI/Strength 彩色状态指示
- ✅ Top5 大单标注 + 特殊大单高亮
- ✅ macOS 菜单栏实时大单通知
- ✅ 可调刷新间隔（1s~60s）

### 后端 API 接口
| 端点 | 返回内容 |
|---|---|
| `GET /api/symbols` | 所有交易对列表 |
| `GET /api/orderbook?symbol=BTC/USDT&limit=1000` | 订单簿 + EMA + RSI + 大单 + summary |
| `GET /api/health` | 健康检查 |

### 后端返回数据结构 (`/api/orderbook`)
```json
{
  "symbol": "BTC/USDT",
  "timestamp": "2026-03-28 16:05:59",
  "current_price": 66550.01,
  "bids": [{"price": 66549.99, "amount": 1.2}, ...],
  "asks": [{"price": 66550.03, "amount": 0.8}, ...],
  "top_bids": [{"price": 66500.00, "amount": 5.5, "rank": 1}, ...],
  "top_asks": [{"price": 66600.00, "amount": 4.2, "rank": 1}, ...],
  "bid_top1_special": true,
  "ask_top1_special": false,
  "large_order": {"side": "bid", "price": 66500.00, "amount": 5.5, "price_diff": 0.08, "ratio": 1.2},
  "emas_5m": {"5m EMA20": 66540.0, "5m EMA50": 66520.0, ...},
  "emas_1h": {"1h EMA20": 66600.0, "1h EMA50": 66580.0, ...},
  "analysis": {"5m": {"close": 66550.0, "rsi": 45.2, "ema20": 66540.0, ...}, "1h": {...}},
  "trends": {"5m": {"price_above_ema20": true, ...}, "1h": {...}},
  "summary": "5m: Bullish (Strength: 4/6) | RSI: Neutral (45.2) | 1h: Bearish (Strength: 1/6) | RSI: Oversold (28.6)"
}
```

### 前端 Settings 接口
```typescript
interface Settings {
  symbol: string;
  interval: number;         // 轮询间隔(秒)
  bidColor: string;         // 买单颜色
  askColor: string;         // 卖单颜色
  specialColor: string;     // 特殊大单颜色
  showOrderLabels: boolean; // 显示标注
  depths: number[];         // [1000, 100]
  tabGroups: TabGroup[];    // Tab 组列表
  activeTabId: string;      // 当前 Tab
  theme: 'dark' | 'light';  // 主题
}
```

---

## 待实现：辅助开单决策 UI 元素

以下功能旨在结合 **均线 + RSI + 订单簿** 三个维度，提供更直观的交易决策辅助。

### 功能 1：买卖压力比（Bid/Ask Pressure Ratio）
**优先级：⭐⭐⭐ | 工作量：小**

在每个标的面板头部区域显示实时买卖压力比条形图。

**数据来源：** 已有数据 — 从 `data.bids` 和 `data.asks` 中计算可视范围内的总量比值。

**UI 设计：**
- 水平条形图，左侧绿色(Bid)右侧红色(Ask)，中间显示比值
- 比值 > 1.5 → 绿色高亮（买压强）
- 比值 0.7~1.5 → 中性
- 比值 < 0.7 → 红色高亮（卖压强）

**实现位置：** 新组件 `PressureBar.tsx`，嵌入 `SymbolPanel` 头部下方

**计算逻辑：**
```
pressure_ratio = sum(bid_amounts) / sum(ask_amounts)  // 基于当前深度
```

### 功能 2：综合信号灯（Signal Dashboard）
**优先级：⭐⭐⭐ | 工作量：中**

在每个标的面板头部显示简洁的三维度信号指示。

**数据来源：** 已有数据 — 从 `data.trends`、`data.analysis`、`data.large_order` 提取。

**UI 设计：**
- 方向指示：🟢 做多 / 🔴 做空 / 🟡 观望
- 三维度小图标行：`EMA ✅ | RSI ✅ | 订单簿 ❌`
- 信号强度百分比条（0~100%）

**判定规则：**
| 维度 | 做多条件 | 做空条件 |
|---|---|---|
| EMA | price > EMA20 且 price > EMA50 | price < EMA20 且 price < EMA50 |
| RSI | RSI < 30（超卖反弹）或 30-50 上行 | RSI > 70（超买回落）或 50-70 下行 |
| 订单簿 | 买压比 > 1.3 或 大买单 | 卖压比 > 1.3 或 大卖单 |

**实现位置：** 新组件 `SignalDashboard.tsx`，嵌入 `SymbolPanel` 头部

### 功能 3：关键价位标注（Support/Resistance on Chart）
**优先级：⭐⭐ | 工作量：中**

在图表上标注关键支撑/阻力价位。

**数据来源：** 已有数据 — EMA 价格 + 订单簿大单聚集区。

**UI 设计：**
- 在 Canvas 上用水平色带标注密集挂单区域
- EMA 价位已有竖线，增加与大单聚集区重合时的特殊高亮
- 支撑区域用绿色半透明带，阻力区域用红色半透明带

**实现位置：** 修改 `OrderBookChart.tsx` 的绘制逻辑

### 功能 4：RSI 迷你折线图（RSI Sparkline）
**优先级：⭐⭐ | 工作量：中**

在每个标的面板头部显示小型 RSI 走势图。

**数据来源：** 需要后端新增 — 返回最近 N 根 K 线的 RSI 历史值。

**后端改动：**
- 在 `/api/orderbook` 响应中新增 `rsi_history` 字段
- 返回最近 20 根 K 线的 RSI 值数组

**UI 设计：**
- 小型折线图（约 120×30px），无坐标轴
- 用颜色区域标出超买(>70)和超卖(<30)区间
- 鼠标 hover 显示具体数值

**实现位置：** 新组件 `RSISparkline.tsx`，嵌入 `SymbolPanel` 头部

### 功能 5：开单建议卡片（Trade Signal Card）
**优先级：⭐ | 工作量：大**

当三个维度信号对齐时，自动弹出建议卡片。

**依赖：** 功能 1 + 功能 2 完成后实现

**UI 设计：**
```
📗 做多信号 (强度: 85%)
EMA: 多头排列 (5/6) ✅
RSI: 超卖反弹 (28→35) ✅
订单簿: 大买单 2.1x @ 67500 ✅
建议入场: ~67550 | 止损: 67200 | 目标: 68200
```

**实现位置：** 新组件 `TradeSignalCard.tsx`，条件渲染在 `SymbolPanel` 中

---

## 建议实现顺序

```
阶段 1（短期）: 功能1 买卖压力比 → 功能2 综合信号灯
阶段 2（中期）: 功能3 关键价位标注 → 功能4 RSI迷你图
阶段 3（后期）: 功能5 开单建议卡片
```

每个功能完成后进行独立测试，确保不影响已有功能。
