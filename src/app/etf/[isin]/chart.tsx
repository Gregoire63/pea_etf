"use client";

import { PerformanceLineChart } from "@/components/charts/performance-line-chart";
import type { PricePoint } from "@/types/etf";

export function EtfDetailChart({
  prices,
  ticker,
}: {
  prices: PricePoint[];
  ticker: string;
}) {
  return (
    <PerformanceLineChart
      data={{ [ticker]: prices }}
      labels={{ [ticker]: ticker }}
      normalize={false}
    />
  );
}
