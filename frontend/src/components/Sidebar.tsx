'use client';

import { useEffect, useState, useRef } from 'react';
import { Settings, TabGroup, THEMES } from '@/types/orderbook';
import { fetchSymbols } from '@/lib/api';
import { TrendingUp, Plus, Save, Trash2, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const UPDATE_INTERVALS = [1, 2, 5, 10, 20, 30, 60];

export default function Sidebar({ settings, onChange, collapsed, onToggleCollapse }: Props) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTabName, setNewTabName] = useState('');
  const [showSaveTab, setShowSaveTab] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const theme = THEMES[settings.theme];
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

  const visibleSymbols = filteredSymbols.slice(0, 50);

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

  const toggleTheme = () => {
    update({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const labelStyle = { color: theme.textSecondary };
  const btnBase = (active: boolean) => ({
    backgroundColor: active ? '#2563eb' : theme.inputBg,
    color: active ? '#fff' : theme.textSecondary,
    border: `1px solid ${active ? '#2563eb' : theme.inputBorder}`,
  });

  if (collapsed) {
    return (
      <aside
        className="w-12 flex flex-col items-center py-3 gap-3 h-screen shrink-0 transition-all duration-300"
        style={{ backgroundColor: theme.sidebarBg, borderRight: `1px solid ${theme.sidebarBorder}` }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
          title="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
        <div className="w-6 h-px" style={{ backgroundColor: theme.border }} />
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: theme.inputBg, color: theme.textSecondary }}
          title={settings.theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        >
          {settings.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="w-64 p-4 flex flex-col gap-3 overflow-y-auto h-screen shrink-0 transition-all duration-300"
      style={{ backgroundColor: theme.sidebarBg, borderRight: `1px solid ${theme.sidebarBorder}` }}
    >
      <div
        className="flex items-center justify-between pb-3"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-2 font-bold text-lg" style={{ color: theme.text }}>
          <TrendingUp size={20} />
          <span>OrderFlow</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: theme.inputBg, color: theme.textSecondary }}
            title={settings.theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: theme.inputBg, color: theme.textSecondary }}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>

      {/* Tab groups */}
      <div>
        <label className="text-xs uppercase tracking-wider font-semibold mb-1 block" style={labelStyle}>
          Tab Groups
        </label>
        <div className="flex flex-wrap gap-1 mb-1">
          {settings.tabGroups.map((tab: TabGroup) => (
            <div key={tab.id} className="flex items-center gap-0.5">
              <button
                onClick={() => switchTab(tab.id)}
                className="px-2 py-1 text-xs rounded-l transition-colors"
                style={btnBase(tab.id === settings.activeTabId)}
              >
                {tab.name} ({tab.symbols.length})
              </button>
              {settings.tabGroups.length > 1 && (
                <button
                  onClick={() => deleteTab(tab.id)}
                  className="px-1 py-1 text-xs rounded-r transition-colors hover:text-red-400"
                  style={{ backgroundColor: theme.inputBg, color: theme.textMuted, border: `1px solid ${theme.inputBorder}`, borderLeft: 'none' }}
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
              className="flex-1 rounded px-2 py-1 text-xs focus:outline-none"
              style={{ backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
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
            className="flex items-center gap-1 px-2 py-1 text-xs hover:text-blue-400 transition-colors"
            style={{ color: theme.textSecondary }}
          >
            <Plus size={12} /> New Tab
          </button>
        )}
      </div>

      {/* Watched symbols */}
      <div>
        <label className="text-xs uppercase tracking-wider font-semibold mb-1 block" style={labelStyle}>
          Watching ({watchedSymbols.length}/10)
        </label>
        <div className="flex flex-wrap gap-1 mb-2">
          {watchedSymbols.map((sym: string) => (
            <span
              key={sym}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
            >
              {sym}
              <button
                onClick={() => removeSymbol(sym)}
                className="hover:text-red-400 ml-0.5"
                style={{ color: theme.textMuted }}
              >
                ×
              </button>
            </span>
          ))}
          {watchedSymbols.length === 0 && (
            <span className="text-xs" style={{ color: theme.textMuted }}>Search below to add symbols</span>
          )}
        </div>
      </div>

      {/* Symbol search & add */}
      <div>
        <label className="text-xs uppercase tracking-wider font-semibold mb-1 block" style={labelStyle}>
          Add Symbol
        </label>
        <input
          type="text"
          placeholder="Search symbol..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerm(e.target.value);
            setHighlightIndex(0);
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (visibleSymbols.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIndex(prev => {
                const next = Math.min(prev + 1, visibleSymbols.length - 1);
                const el = listRef.current?.children[next] as HTMLElement;
                el?.scrollIntoView({ block: 'nearest' });
                return next;
              });
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIndex(prev => {
                const next = Math.max(prev - 1, 0);
                const el = listRef.current?.children[next] as HTMLElement;
                el?.scrollIntoView({ block: 'nearest' });
                return next;
              });
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const target = visibleSymbols[highlightIndex] || visibleSymbols[0];
              if (target) addSymbol(target);
            }
          }}
          className="w-full rounded px-2 py-1.5 text-sm mb-1 focus:outline-none"
          style={{ backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
        />
        {searchTerm && (
          <div
            ref={listRef}
            className="w-full rounded max-h-[140px] overflow-y-auto"
            style={{ backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
          >
            {loading ? (
              <div className="px-2 py-1.5 text-sm" style={{ color: theme.textMuted }}>Loading...</div>
            ) : visibleSymbols.length === 0 ? (
              <div className="px-2 py-1.5 text-sm" style={{ color: theme.textMuted }}>No matches</div>
            ) : (
              visibleSymbols.map((s: string, i: number) => (
                <div
                  key={s}
                  onClick={() => addSymbol(s)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className="px-2 py-1 text-sm cursor-pointer transition-colors"
                  style={{
                    color: watchedSymbols.includes(s) ? '#60a5fa' : theme.text,
                    backgroundColor: i === highlightIndex
                      ? (settings.theme === 'dark' ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.15)')
                      : watchedSymbols.includes(s)
                        ? (settings.theme === 'dark' ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)')
                        : 'transparent',
                  }}
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
        <label className="text-xs uppercase tracking-wider font-semibold mb-1 block" style={labelStyle}>
          Update Interval
        </label>
        <div className="flex flex-wrap gap-1">
          {UPDATE_INTERVALS.map((iv: number) => (
            <button
              key={iv}
              onClick={() => update({ interval: iv })}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={btnBase(settings.interval === iv)}
            >
              {iv}s
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="text-xs uppercase tracking-wider font-semibold mb-2 block" style={labelStyle}>
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
            <span className="text-sm" style={{ color: theme.text }}>Bid</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.askColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ askColor: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
            />
            <span className="text-sm" style={{ color: theme.text }}>Ask</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.specialColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ specialColor: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
            />
            <span className="text-sm" style={{ color: theme.text }}>Special</span>
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
          className="w-4 h-4 rounded accent-blue-500"
        />
        <label htmlFor="showLabels" className="text-sm" style={{ color: theme.text }}>
          Show Order Labels
        </label>
      </div>

      <div className="mt-auto text-xs pt-3" style={{ color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
        Data: Binance API via ccxt
      </div>
    </aside>
  );
}
