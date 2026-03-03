import type { PricePoint } from "@/types/etf";
import { RISK_FREE_RATE } from "./constants";

function findClosestPrice(prices: PricePoint[], targetDate: Date): number | null {
  const targetTime = targetDate.getTime();
  let closest: PricePoint | null = null;
  let minDiff = Infinity;

  for (const p of prices) {
    const diff = Math.abs(new Date(p.date).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }

  if (closest && minDiff < 14 * 24 * 60 * 60 * 1000) {
    return closest.close;
  }
  return null;
}

export function annualizedReturn(prices: PricePoint[], years: number): number | null {
  if (prices.length < 2) return null;

  const endDate = new Date(prices[prices.length - 1].date);
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - years);

  const startPrice = findClosestPrice(prices, startDate);
  const endPrice = prices[prices.length - 1].close;

  if (!startPrice || startPrice === 0) return null;

  const totalReturn = endPrice / startPrice;
  return Math.pow(totalReturn, 1 / years) - 1;
}

export function maxDrawdown(prices: PricePoint[]): number {
  let peak = -Infinity;
  let maxDd = 0;

  for (const p of prices) {
    if (p.close > peak) peak = p.close;
    const dd = (p.close - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }

  return maxDd;
}

export function annualizedVolatility(prices: PricePoint[]): number | null {
  if (prices.length < 52) return null;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].close > 0) {
      returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
    }
  }

  if (returns.length === 0) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const weeklyStdDev = Math.sqrt(variance);

  return weeklyStdDev * Math.sqrt(52);
}

export function sharpeRatio(
  annualReturn: number | null,
  annualVolatility: number | null,
  riskFreeRate: number = RISK_FREE_RATE
): number | null {
  if (annualReturn === null || annualVolatility === null || annualVolatility === 0) {
    return null;
  }
  return (annualReturn - riskFreeRate) / annualVolatility;
}

export function ytdReturn(prices: PricePoint[]): number | null {
  if (prices.length < 2) return null;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const startPrice = findClosestPrice(prices, yearStart);
  const endPrice = prices[prices.length - 1].close;

  if (!startPrice || startPrice === 0) return null;
  return (endPrice - startPrice) / startPrice;
}
