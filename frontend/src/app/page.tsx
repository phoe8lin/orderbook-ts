'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import OrderBookChart from '@/components/OrderBookChart';
import LargeOrderBadge from '@/components/LargeOrderBadge';
import { fetchOrderBook } from '@/lib/api';
import { OrderBookData, Settings } from '@/types/orderbook';
import { Loader2 } from 'lucide-react';

const DEFAULT_SETTINGS: Settings = {
  symbol: 'BTC/USDT',
  interval: 5,
  bidColor: '#1E90FF',
  askColor: '#FFA500',
  specialColor: '#00FF2D',
  showOrderLabels: true,
  depths: [1000, 100],
};

export default function Home() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchOrderBook(settings.symbol, 1000);
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError(null);
        setLastUpdate(result.timestamp || new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [settings.symbol]);

  // Initial load and polling
  useEffect(() => {
    setLoading(true);
    loadData();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadData, settings.interval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData, settings.interval]);

  // Update page title
  useEffect(() => {
    document.title = `${settings.symbol} - OrderFlow`;
  }, [settings.symbol]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar settings={settings} onChange={setSettings} />

      <main className="flex-1 flex flex-col overflow-hidden p-2 gap-1">
        {/* Large order badge */}
        {data?.large_order && (
          <LargeOrderBadge order={data.large_order} symbol={data.symbol} />
        )}

        {/* Charts */}
        {loading && !data ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-400">Loading order book data...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
              {error}
            </div>
          </div>
        ) : data ? (
          <>
            <div className="flex-1 min-h-0">
              <OrderBookChart
                data={data}
                depth={1000}
                settings={settings}
                emas={data.emas_1h}
              />
            </div>
            <div className="flex-1 min-h-0">
              <OrderBookChart
                data={data}
                depth={100}
                settings={settings}
                emas={data.emas_5m}
              />
            </div>
          </>
        ) : null}

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-gray-900/50 rounded text-xs text-gray-500 shrink-0">
          <span>
            {data ? `${settings.symbol} | Bids: ${data.bids.length} | Asks: ${data.asks.length}` : 'No data'}
          </span>
          <span>
            {lastUpdate && `Last update: ${lastUpdate} (UTC+8)`}
            {' | '}
            Interval: {settings.interval}s
          </span>
        </div>
      </main>
    </div>
  );
}
