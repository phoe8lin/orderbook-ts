'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import SymbolPanel from '@/components/SymbolPanel';
import { Settings, TabGroup, THEMES } from '@/types/orderbook';
import { pollScreenshotRequest, clearScreenshotRequest } from '@/lib/api';

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
  filterMM: false,
  hideMM: false,
  showAbsorption: true,
  absorptionWindow: 30,
  mockAbsorption: false,
  depths: [1000, 100],
  tabGroups: [DEFAULT_TAB],
  activeTabId: 'default',
  theme: 'dark',
};

export default function Home() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [screenshotSymbol, setScreenshotSymbol] = useState<string | null>(null);
  const screenshotTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);

  const activeTab = useMemo(
    () => settings.tabGroups.find((t: TabGroup) => t.id === settings.activeTabId),
    [settings.tabGroups, settings.activeTabId]
  );
  const watchedSymbols = activeTab?.symbols || [];

  const theme = THEMES[settings.theme];

  // Apply theme to body
  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
    // Update CSS variables for scrollbars
    document.documentElement.style.setProperty('--scroll-track', theme.scrollTrack);
    document.documentElement.style.setProperty('--scroll-thumb', theme.scrollThumb);
    document.documentElement.style.setProperty('--scroll-thumb-hover', theme.scrollThumbHover);
  }, [settings.theme, theme]);

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

  // Poll for screenshot requests from menubar
  useEffect(() => {
    const poll = async () => {
      const req = await pollScreenshotRequest();
      if (req && req.symbol) {
        setScreenshotSymbol(req.symbol);
        await clearScreenshotRequest();
      }
    };
    screenshotTimerRef.current = setInterval(poll, 2000);
    return () => {
      if (screenshotTimerRef.current) clearInterval(screenshotTimerRef.current);
    };
  }, []);

  const handleScreenshotDone = useCallback(() => {
    setScreenshotSymbol(null);
  }, []);

  const handleRemoveSymbol = (sym: string) => {
    const updatedGroups = settings.tabGroups.map((g: TabGroup) =>
      g.id === settings.activeTabId
        ? { ...g, symbols: g.symbols.filter((s: string) => s !== sym) }
        : g
    );
    setSettings({ ...settings, tabGroups: updatedGroups });
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: theme.bg }}>
      <Sidebar settings={settings} onChange={setSettings} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

      <main className="flex-1 flex flex-col overflow-y-auto p-2 gap-2">
        {watchedSymbols.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ color: theme.textMuted }}>
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
              screenshotRequested={screenshotSymbol === sym}
              onScreenshotDone={handleScreenshotDone}
            />
          ))
        )}

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-3 py-1 rounded text-xs shrink-0"
          style={{ backgroundColor: theme.surfaceBg, color: theme.textMuted }}
        >
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
