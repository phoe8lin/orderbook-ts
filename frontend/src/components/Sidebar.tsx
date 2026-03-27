'use client';

import { useEffect, useState, useRef } from 'react';
import { Settings } from '@/types/orderbook';
import { fetchSymbols } from '@/lib/api';
import { TrendingUp } from 'lucide-react';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

const UPDATE_INTERVALS = [1, 2, 5, 10, 20, 30, 60];

export default function Sidebar({ settings, onChange }: Props) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSymbols()
      .then((s: string[]) => {
        setSymbols(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredSymbols = searchTerm
    ? symbols.filter((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))
    : symbols;

  const update = (partial: Partial<Settings>) => {
    onChange({ ...settings, ...partial });
  };

  const handleSelectSymbol = (sym: string) => {
    update({ symbol: sym });
    setSearchTerm('');
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto h-screen shrink-0">
      <div className="flex items-center gap-2 text-gray-100 font-bold text-lg border-b border-gray-700 pb-3">
        <TrendingUp size={20} />
        <span>OrderFlow</span>
      </div>

      {/* Symbol selector */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
          Trading Pair
        </label>
        <input
          type="text"
          placeholder="Search symbol..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && filteredSymbols.length > 0) {
              handleSelectSymbol(filteredSymbols[0]);
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 mb-1 focus:outline-none focus:border-blue-500"
        />
        <div
          ref={listRef}
          className="w-full bg-gray-800 border border-gray-700 rounded max-h-[160px] overflow-y-auto"
        >
          {loading ? (
            <div className="px-2 py-1.5 text-sm text-gray-500">Loading...</div>
          ) : filteredSymbols.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-gray-500">No matches</div>
          ) : (
            filteredSymbols.map((s: string) => (
              <div
                key={s}
                onClick={() => handleSelectSymbol(s)}
                className={`px-2 py-1 text-sm cursor-pointer transition-colors ${
                  s === settings.symbol
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {s}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Update interval */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
          Update Interval
        </label>
        <div className="flex flex-wrap gap-1">
          {UPDATE_INTERVALS.map((iv: number) => (
            <button
              key={iv}
              onClick={() => update({ interval: iv })}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                settings.interval === iv
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {iv}s
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 block">
          Colors
        </label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.bidColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ bidColor: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
            />
            <span className="text-sm text-gray-300">Bid</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.askColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ askColor: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
            />
            <span className="text-sm text-gray-300">Ask</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.specialColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ specialColor: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
            />
            <span className="text-sm text-gray-300">Special</span>
          </div>
        </div>
      </div>

      {/* Show labels */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showLabels"
          checked={settings.showOrderLabels}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ showOrderLabels: e.target.checked })}
          className="w-4 h-4 rounded bg-gray-800 border-gray-600 accent-blue-500"
        />
        <label htmlFor="showLabels" className="text-sm text-gray-300">
          Show Order Labels
        </label>
      </div>

      <div className="mt-auto text-xs text-gray-600 border-t border-gray-800 pt-3">
        Data: Binance API via ccxt
      </div>
    </aside>
  );
}
