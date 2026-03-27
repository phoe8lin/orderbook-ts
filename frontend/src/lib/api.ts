const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8888';

export async function fetchSymbols(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/symbols`);
  const data = await res.json();
  return data.symbols || [];
}

export async function fetchOrderBook(symbol: string, limit: number = 1000) {
  const res = await fetch(
    `${API_BASE}/api/orderbook?symbol=${encodeURIComponent(symbol)}&limit=${limit}`
  );
  return res.json();
}
