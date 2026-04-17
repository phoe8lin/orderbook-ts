'use client';

import { useEffect, useRef, useMemo } from 'react';
import { OrderBookData, TopOrder, Settings, THEMES, AbsorptionEvent } from '@/types/orderbook';

interface Props {
  data: OrderBookData;
  depth: number;
  settings: Settings;
  emas: Record<string, number>;
  showSummary?: boolean;
  showLegend?: boolean;
}

function formatPrice(price: number): string {
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(3);
}

export default function OrderBookChart({ data, depth, settings, emas, showSummary = true, showLegend = true }: Props) {
  const theme = THEMES[settings.theme];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const chartData = useMemo(() => {
    // MM price sets
    const mmBidSet = new Set<number>(data.mm_bid_prices || []);
    const mmAskSet = new Set<number>(data.mm_ask_prices || []);

    // hideMM：真正从渲染中移除 MM 价档
    const rawBids = data.bids.slice(0, depth);
    const rawAsks = data.asks.slice(0, depth);
    const bids = settings.hideMM ? rawBids.filter(b => !mmBidSet.has(b.price)) : rawBids;
    const asks = settings.hideMM ? rawAsks.filter(a => !mmAskSet.has(a.price)) : rawAsks;

    if (!bids.length || !asks.length) return null;

    const bidPrices = bids.map(b => b.price);
    const bidAmounts = bids.map(b => b.amount);
    const askPrices = asks.map(a => a.price);
    const askAmounts = asks.map(a => a.amount);

    const allPrices = [...bidPrices, ...askPrices];
    const allAmounts = [...bidAmounts, ...askAmounts];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const maxAmount = Math.max(...allAmounts);
    const currentPrice = data.current_price;

    // Top5 和徽章在 filterMM 或 hideMM 任一开启时使用过滤版本
    const useFiltered = settings.filterMM || settings.hideMM;
    const effTopBids = useFiltered && data.top_bids_filtered ? data.top_bids_filtered : data.top_bids;
    const effTopAsks = useFiltered && data.top_asks_filtered ? data.top_asks_filtered : data.top_asks;
    const effBidSpecial = useFiltered
      ? (data.bid_top1_special_filtered ?? data.bid_top1_special)
      : data.bid_top1_special;
    const effAskSpecial = useFiltered
      ? (data.ask_top1_special_filtered ?? data.ask_top1_special)
      : data.ask_top1_special;

    const topBidsInDepth = effTopBids.filter(
      t => t.price >= bids[bids.length - 1]?.price
    );
    const topAsksInDepth = effTopAsks.filter(
      t => t.price <= asks[asks.length - 1]?.price
    );

    // 灰点/配对仅在 filterMM 开启且 hideMM 未开启时绘制（hideMM 下 MM 已被移除，没什么可标记）
    const showDots = settings.filterMM && !settings.hideMM;

    // Absorption events within price range
    const absorption: AbsorptionEvent[] = (data.absorption_events || []).filter(
      e => e.price >= minPrice && e.price <= maxPrice
    );

    return {
      bids, asks,
      bidPrices, bidAmounts, askPrices, askAmounts,
      minPrice, maxPrice, maxAmount, currentPrice,
      topBidsInDepth, topAsksInDepth,
      mmBidSet, mmAskSet,
      showDots,
      absorption,
      effBidSpecial, effAskSpecial,
    };
  }, [data, depth, settings.filterMM, settings.hideMM]);

  useEffect(() => {
    if (!chartData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PAD = { top: 30, right: 60, bottom: showSummary ? 50 : 30, left: 70 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const { bidPrices, bidAmounts, askPrices, askAmounts,
            minPrice, maxPrice, maxAmount, currentPrice,
            topBidsInDepth, topAsksInDepth,
            mmBidSet, mmAskSet, showDots, absorption,
            effBidSpecial, effAskSpecial } = chartData;

    const priceRange = maxPrice - minPrice || 1;
    const amountRange = maxAmount * 1.1;

    const toX = (price: number) => PAD.left + ((price - minPrice) / priceRange) * plotW;
    const toY = (amount: number) => PAD.top + plotH - (amount / amountRange) * plotH;

    // Clear
    ctx.fillStyle = theme.canvasBg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = theme.gridLine;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (plotH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }

    // Draw bid area (filled)
    ctx.beginPath();
    ctx.moveTo(toX(bidPrices[0]), toY(0));
    for (let i = 0; i < bidPrices.length; i++) {
      ctx.lineTo(toX(bidPrices[i]), toY(bidAmounts[i]));
    }
    ctx.lineTo(toX(bidPrices[bidPrices.length - 1]), toY(0));
    ctx.closePath();
    const bidGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + plotH);
    bidGrad.addColorStop(0, settings.bidColor + '60');
    bidGrad.addColorStop(1, settings.bidColor + '05');
    ctx.fillStyle = bidGrad;
    ctx.fill();

    // Bid line
    ctx.beginPath();
    ctx.strokeStyle = settings.bidColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < bidPrices.length; i++) {
      if (i === 0) ctx.moveTo(toX(bidPrices[i]), toY(bidAmounts[i]));
      else ctx.lineTo(toX(bidPrices[i]), toY(bidAmounts[i]));
    }
    ctx.stroke();

    // Draw ask area (filled)
    ctx.beginPath();
    ctx.moveTo(toX(askPrices[0]), toY(0));
    for (let i = 0; i < askPrices.length; i++) {
      ctx.lineTo(toX(askPrices[i]), toY(askAmounts[i]));
    }
    ctx.lineTo(toX(askPrices[askPrices.length - 1]), toY(0));
    ctx.closePath();
    const askGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + plotH);
    askGrad.addColorStop(0, settings.askColor + '60');
    askGrad.addColorStop(1, settings.askColor + '05');
    ctx.fillStyle = askGrad;
    ctx.fill();

    // Ask line
    ctx.beginPath();
    ctx.strokeStyle = settings.askColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < askPrices.length; i++) {
      if (i === 0) ctx.moveTo(toX(askPrices[i]), toY(askAmounts[i]));
      else ctx.lineTo(toX(askPrices[i]), toY(askAmounts[i]));
    }
    ctx.stroke();

    // EMA lines with distinct colors for each EMA period
    const emaColors: Record<string, string> = {
      'EMA20': '#FFD700',
      'EMA50': '#FF69B4',
      'EMA100': '#00CED1',
      'EMA200': '#9370DB',
    };
    if (emas) {
      Object.entries(emas).forEach(([label, emaPrice]) => {
        if (emaPrice >= minPrice && emaPrice <= maxPrice) {
          const x = toX(emaPrice);
          // Match color by EMA period keyword
          const emaKey = Object.keys(emaColors).find(k => label.includes(k));
          const color = emaKey ? emaColors[emaKey] : '#4a9eff';

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(x, PAD.top);
          ctx.lineTo(x, PAD.top + plotH);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = '10px monospace';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(label, x, PAD.top - 4);
        }
      });
    }

    // Current price label on x-axis only (no vertical line)
    const cpX = toX(currentPrice);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = theme.currentPrice;
    ctx.textAlign = 'center';
    ctx.fillText(formatPrice(currentPrice), cpX, PAD.top + plotH + 14);

    // Top order annotations with anti-overlap
    if (settings.showOrderLabels) {
      const drawAnnotation = (
        orders: TopOrder[], side: 'bid' | 'ask',
        isSpecial: boolean, color: string
      ) => {
        // Collect label positions and push apart if overlapping
        const labels: { x: number; y: number; text: string; color: string }[] = [];
        orders.forEach((o, i) => {
          const x = toX(o.price);
          const y = toY(o.amount);
          const dotColor = (i === 0 && isSpecial) ? settings.specialColor : color;
          labels.push({
            x, y,
            text: `${side}${i + 1} ${formatPrice(o.price)}: ${o.amount.toFixed(2)}`,
            color: dotColor,
          });
        });

        // Sort by y position (top to bottom)
        labels.sort((a, b) => a.y - b.y);

        // Push labels apart if they overlap (min 14px vertical gap)
        const MIN_GAP = 14;
        for (let i = 1; i < labels.length; i++) {
          const prevBottom = labels[i - 1].y;
          if (labels[i].y - prevBottom < MIN_GAP) {
            labels[i].y = prevBottom + MIN_GAP;
          }
        }

        labels.forEach((l) => {
          const origOrder = orders.find(o => l.text.includes(formatPrice(o.price)));
          const origX = origOrder ? toX(origOrder.price) : l.x;
          const origY = origOrder ? toY(origOrder.amount) : l.y;

          // Dot at original data position
          ctx.beginPath();
          ctx.arc(origX, origY, 4, 0, Math.PI * 2);
          ctx.fillStyle = l.color;
          ctx.fill();

          // Label at adjusted position
          ctx.font = '10px monospace';
          ctx.fillStyle = l.color;
          ctx.textAlign = side === 'bid' ? 'right' : 'left';
          const offsetX = side === 'bid' ? -8 : 8;
          ctx.fillText(l.text, l.x + offsetX, l.y - 6);
        });
      };

      drawAnnotation(topBidsInDepth, 'bid', effBidSpecial, settings.bidColor);
      drawAnnotation(topAsksInDepth, 'ask', effAskSpecial, settings.askColor);
    }

    // MM 灰点标记：仅在 filterMM 开启且 hideMM 未开启时绘制
    if (showDots && (mmBidSet.size > 0 || mmAskSet.size > 0)) {
      ctx.save();
      const dotColor = '#9ca3af';
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = dotColor;
      const drawMM = (list: { price: number; amount: number }[], set: Set<number>) => {
        for (const lvl of list) {
          if (!set.has(lvl.price)) continue;
          const x = toX(lvl.price);
          const y = toY(lvl.amount);
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      drawMM(chartData.bids, mmBidSet);
      drawMM(chartData.asks, mmAskSet);

      ctx.globalAlpha = 0.85;
      ctx.font = '10px monospace';
      ctx.fillStyle = dotColor;
      ctx.textAlign = 'left';
      ctx.fillText(`MM ${mmBidSet.size}+${mmAskSet.size}`, PAD.left + 90, 16);
      ctx.restore();
    }

    // hideMM 下在标题处给出提示
    if (settings.hideMM && (mmBidSet.size > 0 || mmAskSet.size > 0)) {
      ctx.save();
      ctx.font = '10px monospace';
      ctx.fillStyle = '#60a5fa';
      ctx.textAlign = 'left';
      ctx.fillText(`MM hidden ${mmBidSet.size}+${mmAskSet.size}`, PAD.left + 90, 16);
      ctx.restore();
    }

    // Absorption ghost markers: recent large-order absorptions
    if (settings.showAbsorption && absorption.length > 0) {
      const now = Date.now() / 1000;
      const window = Math.max(5, settings.absorptionWindow || 30);
      ctx.save();
      absorption.forEach((ev) => {
        const age = Math.max(0, now - ev.ts);
        const fade = Math.max(0, 1 - age / window);
        if (fade <= 0) return;

        const x = toX(ev.price);
        // y 位置放在图顶附近，避免被价格/数量曲线压住；用 20% plotH 深度
        const y = PAD.top + plotH * 0.25;
        const color = ev.side === 'bid' ? '#4ade80' : '#f87171';
        // Purple base to signify absorption (distinct from bid/ask color)
        const ringColor = '#c084fc';

        // Outer pulsing ring (size ~ sqrt(amount) scaled)
        const radius = 6 + Math.min(14, Math.sqrt(ev.amount) * 4);
        ctx.globalAlpha = 0.15 * fade;
        ctx.fillStyle = ringColor;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.8 * fade;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner dot colored by side (absorbed bid=green eaten by sells, ask=red eaten by buys)
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Vertical drop-down faint line to x-axis
        ctx.globalAlpha = 0.25 * fade;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y + radius);
        ctx.lineTo(x, PAD.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.globalAlpha = fade;
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = ringColor;
        ctx.textAlign = 'center';
        const ageTxt = age < 60 ? `${Math.round(age)}s` : `${Math.round(age / 60)}m`;
        ctx.fillText(`⊙ ${ev.amount.toFixed(2)} · ${ageTxt}`, x, y - radius - 4);
      });
      ctx.restore();
    }

    // Y axis labels (amount)
    ctx.font = '10px monospace';
    ctx.fillStyle = theme.axisText;
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const val = (amountRange / 5) * (5 - i);
      const y = PAD.top + (plotH / 5) * i;
      ctx.fillText(val.toFixed(1), PAD.left - 6, y + 3);
    }

    // X axis labels (price)
    ctx.textAlign = 'center';
    const priceStep = priceRange / 6;
    for (let i = 0; i <= 6; i++) {
      const price = minPrice + priceStep * i;
      const x = toX(price);
      ctx.fillText(formatPrice(price), x, PAD.top + plotH + 14);
    }

    // Title (depth level only, symbol & time are in header)
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = theme.titleText;
    ctx.textAlign = 'left';
    ctx.fillText(`${depth} Depth`, PAD.left, 16);

    // Legend
    if (showLegend) {
      ctx.font = '11px sans-serif';
      const legendX = W - PAD.right - 120;
      ctx.fillStyle = settings.bidColor;
      ctx.fillRect(legendX, 6, 12, 12);
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'left';
      ctx.fillText('Bids', legendX + 16, 16);

      ctx.fillStyle = settings.askColor;
      ctx.fillRect(legendX + 60, 6, 12, 12);
      ctx.fillStyle = theme.text;
      ctx.fillText('Asks', legendX + 76, 16);
    }

    // Summary at bottom with colored status
    if (showSummary && data.summary) {
      ctx.font = '10px monospace';

      // Split by " | " and color each segment based on keywords
      const segments = data.summary.split(' | ');
      const sep = ' | ';
      const fullText = segments.join(sep);
      const totalWidth = ctx.measureText(fullText).width;
      let curX = (W - totalWidth) / 2;

      segments.forEach((seg, idx) => {
        if (idx > 0) {
          ctx.fillStyle = theme.textMuted;
          ctx.textAlign = 'left';
          ctx.fillText(sep, curX, H - 4);
          curX += ctx.measureText(sep).width;
        }

        // Determine color for entire segment
        let color = theme.textSecondary;
        if (/Bullish/i.test(seg)) {
          if (/[5-6]\/6/.test(seg)) color = '#22c55e'; // strong green
          else if (/[3-4]\/6/.test(seg)) color = '#4ade80'; // green
          else color = '#86efac'; // light green
        } else if (/Bearish/i.test(seg)) {
          if (/[0-1]\/6/.test(seg)) color = '#ef4444'; // strong red
          else if (/[2-3]\/6/.test(seg)) color = '#f87171'; // red
          else color = '#fca5a5'; // light red
        } else if (/Overbought/i.test(seg)) {
          color = '#fb923c'; // orange
        } else if (/Oversold/i.test(seg)) {
          color = '#60a5fa'; // blue
        } else if (/Neutral/i.test(seg)) {
          color = '#a78bfa'; // purple
        }

        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(seg, curX, H - 4);
        curX += ctx.measureText(seg).width;
      });
    }

  }, [chartData, settings, emas, data]);

  // Tooltip on hover
  useEffect(() => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip || !chartData) return;

    const rect = canvas.getBoundingClientRect();
    const PAD = { top: 30, right: 60, bottom: showSummary ? 50 : 30, left: 70 };
    const plotW = rect.width - PAD.left - PAD.right;
    const { minPrice, maxPrice, bids, asks } = chartData;
    const priceRange = maxPrice - minPrice || 1;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < PAD.left || x > rect.width - PAD.right || y < PAD.top || y > rect.height - PAD.bottom) {
        tooltip.style.display = 'none';
        return;
      }

      const price = minPrice + ((x - PAD.left) / plotW) * priceRange;

      // Find closest bid or ask
      let closest: { price: number; amount: number; side: string } | null = null;
      let minDist = Infinity;

      for (const b of bids) {
        const dist = Math.abs(b.price - price);
        if (dist < minDist) { minDist = dist; closest = { ...b, side: 'Bid' }; }
      }
      for (const a of asks) {
        const dist = Math.abs(a.price - price);
        if (dist < minDist) { minDist = dist; closest = { ...a, side: 'Ask' }; }
      }

      if (closest) {
        tooltip.innerHTML = `
          <div class="text-xs">
            <div class="font-bold">${closest.side}</div>
            <div>Price: ${formatPrice(closest.price)}</div>
            <div>Amount: ${closest.amount.toFixed(4)}</div>
          </div>
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX - rect.left + 12}px`;
        tooltip.style.top = `${e.clientY - rect.top - 10}px`;
      }
    };

    const handleMouseLeave = () => {
      tooltip.style.display = 'none';
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [chartData]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Waiting for data...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      <div
        ref={tooltipRef}
        className="absolute hidden pointer-events-none rounded px-2 py-1 z-50"
        style={{ display: 'none', backgroundColor: theme.tooltipBg, border: `1px solid ${theme.border}`, color: theme.text }}
      />
    </div>
  );
}
