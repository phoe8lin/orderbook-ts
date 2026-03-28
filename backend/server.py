"""
订单流分析工具 - FastAPI 后端
提供 REST API 供 TypeScript 前端调用
运行: /opt/anaconda3/envs/trade/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8888 --reload
"""
import ccxt
from collections import defaultdict
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
import pandas_ta as ta
import logging
import multiprocessing
import queue
import subprocess
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Order Flow API")

# ===== macOS Menubar Notification =====
_menubar_queue = None
_menubar_process = None


def copy_to_clipboard(text):
    """使用 macOS pbcopy 将文本拷贝到剪贴板"""
    try:
        process = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
        process.communicate(str(text).encode('utf-8'))
    except Exception as e:
        logger.error(f"Error copying to clipboard: {e}")


def run_menubar(msg_queue):
    """在独立进程中运行 macOS 菜单栏"""
    try:
        import rumps

        class OrderFlowMenuBar(rumps.App):
            def __init__(self):
                super(OrderFlowMenuBar, self).__init__("OrderFlow", "📊")
                self.menu = ["退出"]
                self._quit_flag = multiprocessing.Event()
                self._current_symbol = ""
                self._current_order_info = None

            def _copy_display(self, _):
                if self.title:
                    copy_to_clipboard(self.title)
                    rumps.notification("OrderFlow", "已拷贝展示词", self.title, sound=False)

            def _copy_price(self, _):
                if self._current_order_info:
                    price = self._current_order_info['price']
                    copy_to_clipboard(price)
                    rumps.notification("OrderFlow", "已拷贝价格", str(price), sound=False)

            def _copy_tv_format(self, _):
                if self._current_order_info and self._current_symbol:
                    info = self._current_order_info
                    side = info['side']
                    price = info['price']
                    color = "green" if side == "bid" else "red"
                    tv_text = f"{self._current_symbol},{color},solid,1,{price}"
                    copy_to_clipboard(tv_text)
                    rumps.notification("OrderFlow", "已拷贝 TradingView 格式", tv_text, sound=False)

            def _copy_pine_script(self, _):
                if self._current_order_info and self._current_symbol:
                    info = self._current_order_info
                    side = info['side']
                    price = info['price']
                    side_text = "买入" if side == "bid" else "卖出"
                    color_name = "color.green" if side == "bid" else "color.red"
                    pine_code = f'hline({price}, "{self._current_symbol} {side_text} {price}", {color_name}, hline.style_dashed, 2)'
                    copy_to_clipboard(pine_code)
                    rumps.notification("OrderFlow", "已拷贝 Pine Script", pine_code, sound=False)

            def update_order_info(self, symbol, order_info):
                try:
                    if not order_info:
                        return
                    self._current_symbol = symbol
                    self._current_order_info = order_info
                    icon = "📈" if order_info['side'] == "bid" else "📉"
                    side_text = "买入" if order_info['side'] == "bid" else "卖出"
                    special_mark = "⚠️" if order_info['ratio'] >= 5 else ""
                    diff_direction = "低于" if order_info['side'] == "bid" else "高于"
                    price_diff_text = f"{diff_direction}当前价 {abs(order_info['price_diff']):.2f}%"
                    self.title = f"{icon} {special_mark}{symbol}: {round(order_info['ratio'], 1)}倍@{order_info['price']:.3f}"
                    quit_menu = self.menu["退出"]
                    self.menu.clear()
                    self.menu.add(rumps.MenuItem(f"{symbol} - {side_text}订单"))
                    self.menu.add(rumps.MenuItem(f"价格: {order_info['price']}"))
                    self.menu.add(rumps.MenuItem(f"数量: {order_info['amount']:.3f}"))
                    self.menu.add(rumps.MenuItem(f"位置: {price_diff_text}"))
                    self.menu.add(rumps.MenuItem(f"大单倍数: {order_info['ratio']:.1f}x"))
                    self.menu.add(rumps.MenuItem(None))
                    copy_menu = rumps.MenuItem("📋 拷贝")
                    copy_menu.add(rumps.MenuItem("拷贝展示词", callback=self._copy_display))
                    copy_menu.add(rumps.MenuItem(f"拷贝价格 ({order_info['price']})", callback=self._copy_price))
                    copy_menu.add(rumps.MenuItem(None))
                    copy_menu.add(rumps.MenuItem("拷贝 TV Levels 格式", callback=self._copy_tv_format))
                    copy_menu.add(rumps.MenuItem("拷贝 Pine Script", callback=self._copy_pine_script))
                    self.menu.add(copy_menu)
                    self.menu.add(rumps.MenuItem(None))
                    self.menu.add(quit_menu)
                except Exception as e:
                    logger.error(f"Error updating menu bar: {e}")

            @rumps.clicked("退出")
            def quit_app(self, _):
                self._quit_flag.set()
                rumps.quit_application()

        app_bar = OrderFlowMenuBar()

        def update_timer(_):
            try:
                if app_bar._quit_flag.is_set():
                    timer.stop()
                    return
                latest_data = None
                try:
                    while True:
                        latest_data = msg_queue.get_nowait()
                except queue.Empty:
                    pass
                if latest_data:
                    app_bar.update_order_info(latest_data['symbol'], latest_data['order_info'])
            except Exception as e:
                logger.error(f"Error in menubar update timer: {e}")

        timer = rumps.Timer(update_timer, 1)
        timer.start()
        app_bar.run()
    except ImportError:
        logger.warning("rumps not available, menubar disabled")
    except Exception as e:
        logger.error(f"Error in menubar process: {e}")


def init_menubar():
    """初始化 macOS 菜单栏进程"""
    global _menubar_queue, _menubar_process
    try:
        # 如果已有进程且存活，不重复启动
        if _menubar_process is not None and _menubar_process.is_alive():
            logger.info("Menubar process already running")
            return
        _menubar_queue = multiprocessing.Queue()
        ctx = multiprocessing.get_context('spawn')
        _menubar_process = ctx.Process(target=run_menubar, args=(_menubar_queue,))
        _menubar_process.daemon = True
        _menubar_process.start()
        logger.info(f"Menubar process started (pid={_menubar_process.pid})")
    except Exception as e:
        logger.error(f"Failed to start menubar: {e}")
        _menubar_queue = None
        _menubar_process = None


def send_to_menubar(symbol: str, order_info: dict):
    """发送大单数据到菜单栏进程，如果进程已死则自动重启"""
    global _menubar_queue, _menubar_process
    if order_info is None:
        return
    # 检查进程是否存活，不存活则重启
    if _menubar_process is None or not _menubar_process.is_alive():
        logger.warning("Menubar process not alive, restarting...")
        init_menubar()
    if _menubar_queue is not None:
        try:
            _menubar_queue.put_nowait({
                'symbol': symbol,
                'order_info': order_info
            })
        except Exception as e:
            logger.error(f"Error sending to menubar: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 设置交易所实例
exchange = ccxt.binance({
    'enableRateLimit': True,
    'timeout': 30000,
    'options': {
        'defaultType': 'spot',
        'adjustForTimeDifference': True,
        'recvWindow': 60000,
        'warnOnFetchOhlcvLimitArgument': False,
    },
    'urls': {
        'api': {
            'public': 'https://api.binance.com/api/v3',
            'private': 'https://api.binance.com/api/v3',
        }
    },
    'proxies': {
        'http': 'http://127.0.0.1:7890',
        'https': 'http://127.0.0.1:7890'
    }
})

# 缓存市场交易对列表
_market_symbols_cache = None
_market_symbols_cache_time = None


def get_market_symbols():
    """获取并缓存市场交易对列表"""
    global _market_symbols_cache, _market_symbols_cache_time
    now = datetime.now()
    if _market_symbols_cache is None or _market_symbols_cache_time is None or \
       (now - _market_symbols_cache_time).total_seconds() > 3600:
        _market_symbols_cache = list(exchange.load_markets().keys())
        _market_symbols_cache_time = now
    return _market_symbols_cache


def format_price(price):
    if price < 0.01:
        return f"{price:.6f}"
    elif price < 1:
        return f"{price:.4f}"
    else:
        return f"{price:.3f}"


def fetch_and_aggregate_order_book(symbol, limit=2000):
    try:
        order_book = exchange.fetch_order_book(symbol, limit=limit)
        aggregated_bids = defaultdict(float)
        aggregated_asks = defaultdict(float)

        for price, amount in order_book['bids']:
            aggregated_bids[price] += amount
        for price, amount in order_book['asks']:
            aggregated_asks[price] += amount

        aggregated_bids = sorted(aggregated_bids.items(), key=lambda x: x[0], reverse=True)
        aggregated_asks = sorted(aggregated_asks.items(), key=lambda x: x[0])

        return aggregated_bids, aggregated_asks
    except Exception as e:
        logger.error(f"Error fetching order book: {e}")
        return [], []


def analyze_large_orders(aggregated_bids, aggregated_asks):
    """分析订单簿中的大单信息"""
    try:
        if not (aggregated_bids and aggregated_asks):
            return None

        current_price = (aggregated_bids[0][0] + aggregated_asks[0][0]) / 2

        top_bids = sorted(aggregated_bids, key=lambda x: x[1], reverse=True)[:5]
        top_asks = sorted(aggregated_asks, key=lambda x: x[1], reverse=True)[:5]

        bid_top2to5_sum = sum(amount for _, amount in top_bids[1:5])
        ask_top2to5_sum = sum(amount for _, amount in top_asks[1:5])

        if top_bids[0][1] > top_asks[0][1]:
            return {
                'side': 'bid',
                'price': top_bids[0][0],
                'amount': top_bids[0][1],
                'price_diff': ((current_price - top_bids[0][0]) / current_price) * 100,
                'ratio': top_bids[0][1] / ask_top2to5_sum if ask_top2to5_sum > 0 else 0
            }
        else:
            return {
                'side': 'ask',
                'price': top_asks[0][0],
                'amount': top_asks[0][1],
                'price_diff': ((top_asks[0][0] - current_price) / current_price) * 100,
                'ratio': top_asks[0][1] / bid_top2to5_sum if bid_top2to5_sum > 0 else 0
            }
    except Exception as e:
        logger.error(f"Error analyzing large orders: {e}")
        return None


def analyze_market(symbol, timeframes=None):
    """分析市场趋势"""
    if timeframes is None:
        timeframes = ['5m', '1h']

    analysis_results = {}
    trend_results = {}
    ema_values = {}

    for timeframe in timeframes:
        try:
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=500)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)

            df['ema20'] = ta.ema(df['close'], length=20)
            df['ema50'] = ta.ema(df['close'], length=50)
            df['ema100'] = ta.ema(df['close'], length=100)
            df['ema200'] = ta.ema(df['close'], length=200)

            # Wave Filter: Stochastic RSI → Smooth K → Smooth D → Center
            rsi_period = 14
            smooth_k = 3
            smooth_d = 3
            ob_level = 40
            os_level = -40

            rsi_raw = ta.rsi(df['close'], length=rsi_period)
            min_rsi = rsi_raw.rolling(window=rsi_period).min()
            max_rsi = rsi_raw.rolling(window=rsi_period).max()
            stoch_rsi = (rsi_raw - min_rsi) / (max_rsi - min_rsi)
            stoch_rsi = stoch_rsi.fillna(0.5)
            k_line = stoch_rsi.rolling(window=smooth_k).mean()
            d_line = k_line.rolling(window=smooth_d).mean()
            wave = (d_line - 0.5) * 100

            df['wave'] = wave

            latest = df.iloc[-1]
            wave_val = float(latest['wave']) if not pd.isna(latest['wave']) else 0.0

            analysis_results[timeframe] = {
                'close': float(latest['close']),
                'rsi': wave_val,
                'ema20': float(latest['ema20']),
                'ema50': float(latest['ema50']),
                'ema100': float(latest['ema100']),
                'ema200': float(latest['ema200'])
            }

            trend_results[timeframe] = {
                'price_above_ema20': bool(latest['close'] > latest['ema20']),
                'price_above_ema50': bool(latest['close'] > latest['ema50']),
                'price_above_ema100': bool(latest['close'] > latest['ema100']),
                'price_above_ema200': bool(latest['close'] > latest['ema200']),
                'rsi_overbought': bool(wave_val > ob_level),
                'rsi_oversold': bool(wave_val < os_level)
            }

            ema_values[timeframe] = {
                'EMA20': float(latest['ema20']),
                'EMA50': float(latest['ema50']),
                'EMA100': float(latest['ema100']),
                'EMA200': float(latest['ema200'])
            }

        except Exception as e:
            logger.error(f"Error analyzing {timeframe} data: {str(e)}")
            continue

    return analysis_results, trend_results, ema_values


def summarize_emas(emas, timeframe):
    if not emas or timeframe not in emas:
        return {}
    return {f"{timeframe} {k}": v for k, v in emas[timeframe].items()}


def summarize_analysis(analysis_results, trend_results):
    """生成分析摘要"""
    if not analysis_results or not trend_results:
        return "Market analysis not available"

    summary = []
    for timeframe in analysis_results.keys():
        ar = analysis_results[timeframe]
        tr = trend_results[timeframe]

        trend_strength = sum([1 for v in tr.values() if v])
        trend_direction = "Bullish" if tr['price_above_ema20'] and tr['price_above_ema50'] else "Bearish"
        rsi_status = "Overbought" if tr['rsi_overbought'] else "Oversold" if tr['rsi_oversold'] else "Neutral"

        summary.append(f"{timeframe}: {trend_direction} (Strength: {trend_strength}/6) | Wave: {rsi_status} ({ar['rsi']:.1f})")

    return " | ".join(summary)


# ===== API Endpoints =====

@app.get("/api/symbols")
def api_symbols():
    """获取所有交易对"""
    try:
        symbols = get_market_symbols()
        return {"symbols": symbols}
    except Exception as e:
        logger.error(f"Error fetching symbols: {e}")
        return {"symbols": [], "error": str(e)}


@app.get("/api/orderbook")
def api_orderbook(symbol: str = Query(default="BTC/USDT"), limit: int = Query(default=1000)):
    """获取订单簿数据，包含聚合后的买卖盘、大单分析、EMA和趋势摘要"""
    try:
        aggregated_bids, aggregated_asks = fetch_and_aggregate_order_book(symbol, limit=limit)

        if not aggregated_bids or not aggregated_asks:
            return {"error": "No order book data available"}

        current_price = (aggregated_bids[0][0] + aggregated_asks[0][0]) / 2

        # 大单分析
        large_order = analyze_large_orders(aggregated_bids, aggregated_asks)

        # 市场分析
        analysis_results, trend_results, ema_values = analyze_market(symbol, ['5m', '1h'])
        emas_5m = summarize_emas(ema_values, '5m')
        emas_1h = summarize_emas(ema_values, '1h')
        combined_summary = summarize_analysis(analysis_results, trend_results)

        # Top 5 大单
        top_bids = sorted(aggregated_bids, key=lambda x: x[1], reverse=True)[:5]
        top_asks = sorted(aggregated_asks, key=lambda x: x[1], reverse=True)[:5]

        bid_top2to5_sum = sum(amount for _, amount in top_bids[1:5])
        ask_top2to5_sum = sum(amount for _, amount in top_asks[1:5])

        utc_8_time = datetime.now(timezone.utc).astimezone(
            timezone(timedelta(hours=8))
        ).strftime("%Y-%m-%d %H:%M:%S")

        # 发送大单信息到 macOS 菜单栏
        if large_order:
            send_to_menubar(symbol, large_order)

        return {
            "symbol": symbol,
            "timestamp": utc_8_time,
            "current_price": current_price,
            "bids": [{"price": p, "amount": a} for p, a in aggregated_bids],
            "asks": [{"price": p, "amount": a} for p, a in aggregated_asks],
            "top_bids": [{"price": p, "amount": a, "rank": i + 1} for i, (p, a) in enumerate(top_bids)],
            "top_asks": [{"price": p, "amount": a, "rank": i + 1} for i, (p, a) in enumerate(top_asks)],
            "bid_top1_special": top_bids[0][1] > ask_top2to5_sum if top_bids and ask_top2to5_sum > 0 else False,
            "ask_top1_special": top_asks[0][1] > bid_top2to5_sum if top_asks and bid_top2to5_sum > 0 else False,
            "large_order": large_order,
            "emas_5m": emas_5m,
            "emas_1h": emas_1h,
            "analysis": analysis_results,
            "trends": trend_results,
            "summary": combined_summary,
        }
    except Exception as e:
        logger.error(f"Error in orderbook API: {e}")
        return {"error": str(e)}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    """服务启动时初始化菜单栏"""
    init_menubar()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
