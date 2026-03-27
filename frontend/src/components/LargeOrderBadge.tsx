'use client';

import { LargeOrder } from '@/types/orderbook';

interface Props {
  order: LargeOrder | null;
  symbol: string;
}

function formatPrice(price: number): string {
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(3);
}

export default function LargeOrderBadge({ order, symbol }: Props) {
  if (!order) return null;

  const isBid = order.side === 'bid';
  const icon = isBid ? '📈' : '📉';
  const sideText = isBid ? '买入' : '卖出';
  const diffDir = isBid ? '低于' : '高于';
  const isSpecial = order.ratio >= 5;
  const bgColor = isBid
    ? 'bg-emerald-900/50 border-emerald-700'
    : 'bg-red-900/50 border-red-700';

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${bgColor}`}>
      <span className="text-xl">{icon}</span>
      <div className="flex items-center gap-4 text-sm">
        <span className="font-bold text-gray-100">
          {isSpecial && '⚠️ '}{symbol}
        </span>
        <span className="text-gray-300">
          {sideText} @ <span className="font-mono">{formatPrice(order.price)}</span>
        </span>
        <span className="text-gray-400">
          Amount: <span className="font-mono">{order.amount.toFixed(3)}</span>
        </span>
        <span className="text-gray-400">
          {diffDir}当前价 <span className="font-mono">{Math.abs(order.price_diff).toFixed(2)}%</span>
        </span>
        <span className={`font-bold ${isSpecial ? 'text-yellow-400' : 'text-gray-300'}`}>
          {order.ratio.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
