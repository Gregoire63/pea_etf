"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const tickers = Object.keys(data);
  if (tickers.length === 0) return null;

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

  // Fewer X labels to avoid crowding, especially on mobile
  const tickInterval = Math.max(1, Math.floor(chartData.length / 6));

  if (!mounted) {
    return <div className="h-[260px] animate-pulse rounded-lg bg-muted" />;
  }

  return (
    // height is a fixed number → avoids the -1 ResponsiveContainer warning
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, textAnchor: "end" }}
          angle={-35}
          interval={tickInterval}
          tickFormatter={(d: string) => d.slice(0, 7)}
          height={48}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => normalize ? `${Math.round(v)}` : `${Math.round(v)}€`}
          width={normalize ? 32 : 44}
          tickCount={5}
        />
        <Tooltip
          labelFormatter={(d) => String(d)}
          formatter={(value, name) => [
            normalize
              ? `${Number(value).toFixed(1)}`
              : `${Number(value).toFixed(2)} €`,
            labels[String(name)] || String(name),
          ]}
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--card-foreground)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--card-foreground)", fontWeight: 600 }}
          itemStyle={{ color: "var(--muted-foreground)" }}
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
