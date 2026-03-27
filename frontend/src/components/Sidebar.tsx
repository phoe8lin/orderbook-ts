'use client';

import { useEffect, useState, useRef } from 'react';
import { Settings, TabGroup } from '@/types/orderbook';
import { fetchSymbols } from '@/lib/api';
import { TrendingUp, Plus, Save, Trash2 } from 'lucide-react';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

const UPDATE_INTERVALS = [1, 2, 5, 10, 20, 30, 60];

export default function Sidebar({ settings, onChange }: Props) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTabName, setNewTabName] = useState('');
  const [showSaveTab, setShowSaveTab] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const activeTab = settings.tabGroups.find((t: TabGroup) => t.id === settings.activeTabId);
  const watchedSymbols = activeTab?.symbols || [];

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
    : [];

  const update = (partial: Partial<Settings>) => {
    onChange({ ...settings, ...partial });
  };

  const addSymbol = (sym: string) => {
    if (watchedSymbols.includes(sym)) return;
    if (watchedSymbols.length >= 10) return;
    const updatedGroups = settings.tabGroups.map((g: TabGroup) =>
      g.id === settings.activeTabId
        ? { ...g, symbols: [...g.symbols, sym] }
        : g
    );
    update({ tabGroups: updatedGroups, symbol: sym });
    setSearchTerm('');
  };

  const removeSymbol = (sym: string) => {
    const updatedGroups = settings.tabGroups.map((g: TabGroup) =>
      g.id === settings.activeTabId
        ? { ...g, symbols: g.symbols.filter((s: string) => s !== sym) }
        : g
    );
    update({ tabGroups: updatedGroups });
  };

  const switchTab = (tabId: string) => {
    update({ activeTabId: tabId });
  };

  const saveNewTab = () => {
    if (!newTabName.trim()) return;
    const newTab: TabGroup = {
      id: `tab_${Date.now()}`,
      name: newTabName.trim(),
      symbols: [...watchedSymbols],
    };
    update({
      tabGroups: [...settings.tabGroups, newTab],
      activeTabId: newTab.id,
    });
    setNewTabName('');
    setShowSaveTab(false);
  };

  const deleteTab = (tabId: string) => {
    if (settings.tabGroups.length <= 1) return;
    const remaining = settings.tabGroups.filter((g: TabGroup) => g.id !== tabId);
    update({
      tabGroups: remaining,
      activeTabId: remaining[0].id,
    });
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-3 overflow-y-auto h-screen shrink-0">
      <div className="flex items-center gap-2 text-gray-100 font-bold text-lg border-b border-gray-700 pb-3">
        <TrendingUp size={20} />
        <span>OrderFlow</span>
      </div>

      {/* Tab groups */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
          Tab Groups
        </label>
        <div className="flex flex-wrap gap-1 mb-1">
          {settings.tabGroups.map((tab: TabGroup) => (
            <div key={tab.id} className="flex items-center gap-0.5">
              <button
                onClick={() => switchTab(tab.id)}
                className={`px-2 py-1 text-xs rounded-l transition-colors ${
                  tab.id === settings.activeTabId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab.name} ({tab.symbols.length})
              </button>
              {settings.tabGroups.length > 1 && (
                <button
                  onClick={() => deleteTab(tab.id)}
                  className="px-1 py-1 text-xs bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-r transition-colors"
                  title="Delete tab"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {showSaveTab ? (
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Tab name..."
              value={newTabName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTabName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') saveNewTab();
                if (e.key === 'Escape') setShowSaveTab(false);
              }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={saveNewTab}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              <Save size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveTab(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
          >
            <Plus size={12} /> New Tab
          </button>
        )}
      </div>

      {/* Watched symbols */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
          Watching ({watchedSymbols.length}/10)
        </label>
        <div className="flex flex-wrap gap-1 mb-2">
          {watchedSymbols.map((sym: string) => (
            <span
              key={sym}
              className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200"
            >
              {sym}
              <button
                onClick={() => removeSymbol(sym)}
                className="text-gray-500 hover:text-red-400 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          {watchedSymbols.length === 0 && (
            <span className="text-xs text-gray-500">Search below to add symbols</span>
          )}
        </div>
      </div>

      {/* Symbol search & add */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
          Add Symbol
        </label>
        <input
          type="text"
          placeholder="Search symbol..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && filteredSymbols.length > 0) {
              addSymbol(filteredSymbols[0]);
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 mb-1 focus:outline-none focus:border-blue-500"
        />
        {searchTerm && (
          <div
            ref={listRef}
            className="w-full bg-gray-800 border border-gray-700 rounded max-h-[140px] overflow-y-auto"
          >
            {loading ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">Loading...</div>
            ) : filteredSymbols.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">No matches</div>
            ) : (
              filteredSymbols.slice(0, 50).map((s: string) => (
                <div
                  key={s}
                  onClick={() => addSymbol(s)}
                  className={`px-2 py-1 text-sm cursor-pointer transition-colors ${
                    watchedSymbols.includes(s)
                      ? 'bg-blue-600/30 text-blue-300'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {watchedSymbols.includes(s) ? `✓ ${s}` : s}
                </div>
              ))
            )}
          </div>
        )}
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
