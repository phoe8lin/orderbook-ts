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

export interface Settings {
  symbol: string;
  interval: number;
  bidColor: string;
  askColor: string;
  specialColor: string;
  showOrderLabels: boolean;
  depths: number[];
}
