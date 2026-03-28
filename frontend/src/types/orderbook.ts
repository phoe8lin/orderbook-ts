export interface OrderLevel {
  price: number;
  amount: number;
}

export interface TopOrder {
  price: number;
  amount: number;
  rank: number;
}

export interface LargeOrder {
  side: 'bid' | 'ask';
  price: number;
  amount: number;
  price_diff: number;
  ratio: number;
}

export interface TrendResult {
  price_above_ema20: boolean;
  price_above_ema50: boolean;
  price_above_ema100: boolean;
  price_above_ema200: boolean;
  rsi_overbought: boolean;
  rsi_oversold: boolean;
}

export interface AnalysisResult {
  close: number;
  rsi: number;
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
}

export interface OrderBookData {
  symbol: string;
  timestamp: string;
  current_price: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
  top_bids: TopOrder[];
  top_asks: TopOrder[];
  bid_top1_special: boolean;
  ask_top1_special: boolean;
  large_order: LargeOrder | null;
  emas_5m: Record<string, number>;
  emas_1h: Record<string, number>;
  analysis: Record<string, AnalysisResult>;
  trends: Record<string, TrendResult>;
  summary: string;
  error?: string;
}

export interface TabGroup {
  id: string;
  name: string;
  symbols: string[];
}

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  canvasBg: string;
  gridLine: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  surfaceBg: string;
  surfaceHover: string;
  sidebarBg: string;
  sidebarBorder: string;
  inputBg: string;
  inputBorder: string;
  tooltipBg: string;
  scrollTrack: string;
  scrollThumb: string;
  scrollThumbHover: string;
  currentPrice: string;
  titleText: string;
  axisText: string;
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
  dark: {
    bg: '#0d1117',
    canvasBg: '#0d1117',
    gridLine: '#1e2a3a',
    text: '#e6edf3',
    textSecondary: '#8b949e',
    textMuted: '#484f58',
    border: '#30363d',
    surfaceBg: '#161b22',
    surfaceHover: '#1c2128',
    sidebarBg: '#111827',
    sidebarBorder: '#1f2937',
    inputBg: '#1f2937',
    inputBorder: '#374151',
    tooltipBg: 'rgba(13,17,23,0.95)',
    scrollTrack: '#161b22',
    scrollThumb: '#30363d',
    scrollThumbHover: '#484f58',
    currentPrice: '#00FFFF',
    titleText: '#e6edf3',
    axisText: '#8b949e',
  },
  light: {
    bg: '#FAF8F5',
    canvasBg: '#FFFFFF',
    gridLine: '#E8E4DF',
    text: '#2D2A26',
    textSecondary: '#6B6560',
    textMuted: '#A09A94',
    border: '#DDD8D2',
    surfaceBg: '#F5F2EE',
    surfaceHover: '#EDE9E4',
    sidebarBg: '#F0ECE7',
    sidebarBorder: '#DDD8D2',
    inputBg: '#FFFFFF',
    inputBorder: '#CCC7C1',
    tooltipBg: 'rgba(255,255,255,0.95)',
    scrollTrack: '#F0ECE7',
    scrollThumb: '#CCC7C1',
    scrollThumbHover: '#A09A94',
    currentPrice: '#0066CC',
    titleText: '#2D2A26',
    axisText: '#6B6560',
  },
};

export interface Settings {
  symbol: string;
  interval: number;
  bidColor: string;
  askColor: string;
  specialColor: string;
  showOrderLabels: boolean;
  depths: number[];
  tabGroups: TabGroup[];
  activeTabId: string;
  theme: ThemeMode;
}
