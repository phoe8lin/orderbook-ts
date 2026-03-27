'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import OrderBookChart from '@/components/OrderBookChart';
import LargeOrderBadge from '@/components/LargeOrderBadge';
import { fetchOrderBook } from '@/lib/api';
import { OrderBookData, Settings } from '@/types/orderbook';
import { Loader2, X } from 'lucide-react';

interface Props {
  symbol: string;
  settings: Settings;
  onRemove: (symbol: string) => void;
}

export default function SymbolPanel({ symbol, settings, onRemove }: Props) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchOrderBook(symbol, 1000);
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
  }, [symbol]);

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

  const headerBg = data?.large_order
    ? data.large_order.side === 'bid'
      ? 'bg-emerald-900/30 border-emerald-800'
      : 'bg-red-900/30 border-red-800'
    : 'bg-gray-900/50 border-gray-800';

  return (
    <div className={`flex flex-col border rounded-lg overflow-hidden flex-1 min-h-[250px] ${headerBg}`}>
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-gray-100">{symbol}</span>
          {data?.current_price && (
            <span className="text-xs font-mono text-cyan-400">
              {data.current_price < 1 ? data.current_price.toFixed(4) : data.current_price.toFixed(2)}
            </span>
          )}
          {data?.large_order && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              data.large_order.side === 'bid' ? 'bg-emerald-800 text-emerald-200' : 'bg-red-800 text-red-200'
            }`}>
              {data.large_order.side === 'bid' ? '📈' : '📉'}{' '}
              {data.large_order.ratio.toFixed(1)}x @{' '}
              {data.large_order.price < 1 ? data.large_order.price.toFixed(4) : data.large_order.price.toFixed(2)}
            </span>
          )}
          {loading && !data && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[10px] text-gray-500">{data.timestamp}</span>
          )}
          <span className="text-gray-500 text-xs">{collapsed ? '▸' : '▾'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
            className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
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
              <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 text-red-300 text-xs">
                {error}
              </div>
            </div>
          ) : data ? (
            <>
              <div className="flex-[3] min-h-[120px]">
                <OrderBookChart
                  data={data}
                  depth={1000}
                  settings={settings}
                  emas={data.emas_1h}
                />
              </div>
              <div className="flex-[2] min-h-[100px]">
                <OrderBookChart
                  data={data}
                  depth={100}
                  settings={settings}
                  emas={data.emas_5m}
                  showSummary={false}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-400 text-sm">Loading {symbol}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
