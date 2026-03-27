'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import SymbolPanel from '@/components/SymbolPanel';
import { Settings, TabGroup } from '@/types/orderbook';

const DEFAULT_TAB: TabGroup = {
  id: 'default',
  name: 'Main',
  symbols: ['BTC/USDT'],
};

const DEFAULT_SETTINGS: Settings = {
  symbol: 'BTC/USDT',
  interval: 5,
  bidColor: '#1E90FF',
  askColor: '#FFA500',
  specialColor: '#00FF2D',
  showOrderLabels: true,
  depths: [1000, 100],
  tabGroups: [DEFAULT_TAB],
  activeTabId: 'default',
};

export default function Home() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const activeTab = useMemo(
    () => settings.tabGroups.find((t: TabGroup) => t.id === settings.activeTabId),
    [settings.tabGroups, settings.activeTabId]
  );
  const watchedSymbols = activeTab?.symbols || [];

  // Update page title
  useEffect(() => {
    if (watchedSymbols.length === 0) {
      document.title = 'OrderFlow Monitor';
    } else if (watchedSymbols.length === 1) {
      document.title = `${watchedSymbols[0]} - OrderFlow`;
    } else {
      document.title = `${watchedSymbols.length} symbols - OrderFlow`;
    }
  }, [watchedSymbols]);

  const handleRemoveSymbol = (sym: string) => {
    const updatedGroups = settings.tabGroups.map((g: TabGroup) =>
      g.id === settings.activeTabId
        ? { ...g, symbols: g.symbols.filter((s: string) => s !== sym) }
        : g
    );
    setSettings({ ...settings, tabGroups: updatedGroups });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar settings={settings} onChange={setSettings} />

      <main className="flex-1 flex flex-col overflow-y-auto p-2 gap-2">
        {watchedSymbols.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">No symbols selected</p>
              <p className="text-sm">Use the sidebar to search and add symbols to monitor</p>
            </div>
          </div>
        ) : (
          watchedSymbols.map((sym: string) => (
            <SymbolPanel
              key={sym}
              symbol={sym}
              settings={settings}
              onRemove={handleRemoveSymbol}
            />
          ))
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-gray-900/50 rounded text-xs text-gray-500 shrink-0">
          <span>
            {activeTab ? `${activeTab.name} | ${watchedSymbols.length} symbol(s)` : 'No tab'}
          </span>
          <span>
            Interval: {settings.interval}s
          </span>
        </div>
      </main>
    </div>
  );
}
