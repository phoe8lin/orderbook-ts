'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import OrderBookChart from '@/components/OrderBookChart';
import LargeOrderBadge from '@/components/LargeOrderBadge';
import { fetchOrderBook } from '@/lib/api';
import { OrderBookData, Settings, THEMES } from '@/types/orderbook';
import { Loader2, X } from 'lucide-react';

interface Props {
  symbol: string;
  settings: Settings;
  onRemove: (symbol: string) => void;
  screenshotRequested?: boolean;
  onScreenshotDone?: () => void;
}

export default function SymbolPanel({ symbol, settings, onRemove, screenshotRequested, onScreenshotDone }: Props) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const theme = THEMES[settings.theme];
  const isDark = settings.theme === 'dark';

  const loadData = useCallback(async () => {
    try {
      const result = await fetchOrderBook(symbol, 1000, {
        mockAbsorption: settings.mockAbsorption && settings.showAbsorption,
        absorptionWindow: settings.absorptionWindow,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [symbol, settings.mockAbsorption, settings.showAbsorption, settings.absorptionWindow]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    loadData();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadData, settings.interval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData, settings.interval]);

  const mmActive = settings.filterMM || settings.hideMM;
  const effectiveLargeOrder = mmActive
    ? (data?.large_order_filtered ?? data?.large_order ?? null)
    : (data?.large_order ?? null);

  const getHeaderStyle = () => {
    if (effectiveLargeOrder) {
      return effectiveLargeOrder.side === 'bid'
        ? { backgroundColor: isDark ? 'rgba(6,78,59,0.3)' : 'rgba(220,252,231,0.8)', borderColor: isDark ? '#065f46' : '#86efac' }
        : { backgroundColor: isDark ? 'rgba(127,29,29,0.3)' : 'rgba(254,226,226,0.8)', borderColor: isDark ? '#991b1b' : '#fca5a5' };
    }
    return { backgroundColor: theme.surfaceBg, borderColor: theme.border };
  };

  // Screenshot: capture panel when requested
  useEffect(() => {
    if (!screenshotRequested || !panelRef.current) return;
    const doScreenshot = async () => {
      try {
        const canvas = await html2canvas(panelRef.current!, {
          backgroundColor: isDark ? '#0f1729' : '#ffffff',
          scale: 2,
          useCORS: true,
        });
        // Copy to clipboard
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
            } catch (e) {
              console.warn('Clipboard write failed, downloading instead', e);
            }
            // Also download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeName = symbol.replace(/[/:]/g, '_');
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = `${safeName}_orderbook_${ts}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      } catch (e) {
        console.error('Screenshot failed:', e);
      } finally {
        onScreenshotDone?.();
      }
    };
    doScreenshot();
  }, [screenshotRequested]);

  const getSummaryBadges = () => {
    if (!data?.summary) return null;
    const segments = data.summary.split(' | ');
    return segments.map((seg, idx) => {
      let bgColor = isDark ? 'rgba(100,100,100,0.3)' : 'rgba(200,200,200,0.4)';
      let textColor = theme.textSecondary;
      if (/Bullish/i.test(seg)) {
        if (/[5-6]\/6/.test(seg)) { bgColor = isDark ? 'rgba(34,197,94,0.25)' : 'rgba(220,252,231,0.9)'; textColor = isDark ? '#4ade80' : '#166534'; }
        else if (/[3-4]\/6/.test(seg)) { bgColor = isDark ? 'rgba(74,222,128,0.2)' : 'rgba(220,252,231,0.7)'; textColor = isDark ? '#86efac' : '#15803d'; }
        else { bgColor = isDark ? 'rgba(134,239,172,0.15)' : 'rgba(220,252,231,0.5)'; textColor = isDark ? '#bbf7d0' : '#166534'; }
      } else if (/Bearish/i.test(seg)) {
        if (/[0-1]\/6/.test(seg)) { bgColor = isDark ? 'rgba(239,68,68,0.25)' : 'rgba(254,226,226,0.9)'; textColor = isDark ? '#f87171' : '#991b1b'; }
        else if (/[2-3]\/6/.test(seg)) { bgColor = isDark ? 'rgba(248,113,113,0.2)' : 'rgba(254,226,226,0.7)'; textColor = isDark ? '#fca5a5' : '#b91c1c'; }
        else { bgColor = isDark ? 'rgba(252,165,165,0.15)' : 'rgba(254,226,226,0.5)'; textColor = isDark ? '#fecaca' : '#991b1b'; }
      } else if (/Overbought/i.test(seg)) {
        bgColor = isDark ? 'rgba(251,146,60,0.2)' : 'rgba(255,237,213,0.9)'; textColor = isDark ? '#fb923c' : '#c2410c';
      } else if (/Oversold/i.test(seg)) {
        bgColor = isDark ? 'rgba(96,165,250,0.2)' : 'rgba(219,234,254,0.9)'; textColor = isDark ? '#60a5fa' : '#1d4ed8';
      } else if (/Neutral/i.test(seg)) {
        bgColor = isDark ? 'rgba(167,139,250,0.15)' : 'rgba(237,233,254,0.9)'; textColor = isDark ? '#a78bfa' : '#6d28d9';
      }
      return (
        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap" style={{ backgroundColor: bgColor, color: textColor }}>
          {seg.trim()}
        </span>
      );
    });
  };

  return (
    <div
      ref={panelRef}
      className="flex flex-col rounded-lg overflow-hidden flex-1 min-h-[250px] transition-colors duration-300"
      style={{ border: `1px solid ${getHeaderStyle().borderColor}`, backgroundColor: getHeaderStyle().backgroundColor }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-bold text-sm" style={{ color: theme.text }}>{symbol}</span>
          {data?.current_price && (
            <span className="text-xs font-mono" style={{ color: theme.currentPrice }}>
              {data.current_price < 1 ? data.current_price.toFixed(4) : data.current_price.toFixed(2)}
            </span>
          )}
          {effectiveLargeOrder && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{
              backgroundColor: effectiveLargeOrder.side === 'bid'
                ? (isDark ? '#065f46' : '#dcfce7')
                : (isDark ? '#991b1b' : '#fee2e2'),
              color: effectiveLargeOrder.side === 'bid'
                ? (isDark ? '#a7f3d0' : '#166534')
                : (isDark ? '#fecaca' : '#991b1b'),
            }}
              title={mmActive ? '已过滤做市商对称挂单后的大单' : undefined}
            >
              {effectiveLargeOrder.side === 'bid' ? '📈' : '📉'}{' '}
              {effectiveLargeOrder.ratio.toFixed(1)}x @{' '}
              {effectiveLargeOrder.price < 1 ? effectiveLargeOrder.price.toFixed(4) : effectiveLargeOrder.price.toFixed(2)}
              {mmActive && <span className="ml-1 opacity-70">·F</span>}
            </span>
          )}
          {settings.showAbsorption && data?.absorption_events && data.absorption_events.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{
              backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(243,232,255,0.9)',
              color: isDark ? '#c084fc' : '#7e22ce',
            }} title="最近被吸收的大额挂单事件数（30 秒窗口）">
              ⊙ {data.absorption_events.length} 吸收
            </span>
          )}
          {data?.summary && getSummaryBadges()}
          {loading && !data && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[10px]" style={{ color: theme.textMuted }}>{data.timestamp}</span>
          )}
          <span className="text-xs" style={{ color: theme.textMuted }}>{collapsed ? '▸' : '▾'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
            className="hover:text-red-400 transition-colors p-0.5"
            style={{ color: theme.textMuted }}
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Charts content */}
      {!collapsed && (
        <div className="flex flex-col gap-0.5 px-1 pb-1 flex-1 min-h-0">
          {error ? (
            <div className="flex items-center justify-center py-4">
              <div className="rounded px-3 py-2 text-xs" style={{
                backgroundColor: isDark ? 'rgba(127,29,29,0.3)' : 'rgba(254,226,226,0.8)',
                border: `1px solid ${isDark ? '#991b1b' : '#fca5a5'}`,
                color: isDark ? '#fca5a5' : '#991b1b',
              }}>
                {error}
              </div>
            </div>
          ) : data ? (
            <>
              <div className="flex-1 min-h-[120px]">
                <OrderBookChart
                  data={data}
                  depth={1000}
                  settings={settings}
                  emas={data.emas_1h}
                  showSummary={false}
                />
              </div>
              <div className="flex-1 min-h-[100px]">
                <OrderBookChart
                  data={data}
                  depth={100}
                  settings={settings}
                  emas={data.emas_5m}
                  showSummary={false}
                  showLegend={false}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="ml-2 text-sm" style={{ color: theme.textSecondary }}>Loading {symbol}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
