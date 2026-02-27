"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PricePoint } from "@/types/etf";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea"];

interface Props {
  data: Record<string, PricePoint[]>;
  labels?: Record<string, string>;
  normalize?: boolean;
}

export function PerformanceLineChart({
  data,
  labels = {},
  normalize = true,
}: Props) {
  const tickers = Object.keys(data);
  if (tickers.length === 0) return null;

  // Merge all dates and normalize to base 100
  const allDates = new Set<string>();
  for (const prices of Object.values(data)) {
    for (const p of prices) allDates.add(p.date);
  }

  const sortedDates = [...allDates].sort();

  const basePrices: Record<string, number> = {};
  if (normalize) {
    for (const [ticker, prices] of Object.entries(data)) {
      if (prices.length > 0) basePrices[ticker] = prices[0].close;
    }
  }

  const chartData = sortedDates.map((date) => {
    const point: Record<string, string | number> = { date };
    for (const ticker of tickers) {
      const prices = data[ticker];
      const match = prices.find((p) => p.date === date);
      if (match) {
        point[ticker] = normalize && basePrices[ticker]
          ? Math.round((match.close / basePrices[ticker]) * 10000) / 100
          : Math.round(match.close * 100) / 100;
      }
    }
    return point;
  });

  // Only show every nth label for readability
  const tickInterval = Math.max(1, Math.floor(chartData.length / 8));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          interval={tickInterval}
          tickFormatter={(d: string) => d.slice(0, 7)}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => (normalize ? `${v}` : `${v}€`)}
        />
        <Tooltip
          labelFormatter={(d) => String(d)}
          formatter={(value, name) => [
            normalize ? `${Number(value).toFixed(1)}` : `${Number(value).toFixed(2)}€`,
            labels[String(name)] || String(name),
          ]}
        />
        {tickers.length > 1 && <Legend formatter={(v) => labels[String(v)] || String(v)} />}
        {tickers.map((ticker, i) => (
          <Line
            key={ticker}
            type="monotone"
            dataKey={ticker}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
