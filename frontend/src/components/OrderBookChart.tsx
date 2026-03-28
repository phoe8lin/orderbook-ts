'use client';

import { useEffect, useRef, useMemo } from 'react';
import { OrderBookData, TopOrder, Settings, THEMES } from '@/types/orderbook';

interface Props {
  data: OrderBookData;
  depth: number;
  settings: Settings;
  emas: Record<string, number>;
  showSummary?: boolean;
}

function formatPrice(price: number): string {
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(3);
}

export default function OrderBookChart({ data, depth, settings, emas, showSummary = true }: Props) {
  const theme = THEMES[settings.theme];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const chartData = useMemo(() => {
    const bids = data.bids.slice(0, depth);
    const asks = data.asks.slice(0, depth);
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

    // Top orders within this depth
    const topBidsInDepth = data.top_bids.filter(
      t => t.price >= bids[bids.length - 1]?.price
    );
    const topAsksInDepth = data.top_asks.filter(
      t => t.price <= asks[asks.length - 1]?.price
    );

    return {
      bids, asks,
      bidPrices, bidAmounts, askPrices, askAmounts,
      minPrice, maxPrice, maxAmount, currentPrice,
      topBidsInDepth, topAsksInDepth,
    };
  }, [data, depth]);

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
            topBidsInDepth, topAsksInDepth } = chartData;

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

      drawAnnotation(topBidsInDepth, 'bid', data.bid_top1_special, settings.bidColor);
      drawAnnotation(topAsksInDepth, 'ask', data.ask_top1_special, settings.askColor);
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

    // Title
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = theme.titleText;
    ctx.textAlign = 'left';
    ctx.fillText(
      `${data.symbol} - ${depth} Depth - ${data.timestamp} (UTC+8)`,
      PAD.left, 16
    );

    // Legend
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
