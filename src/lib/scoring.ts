import { SCORING_WEIGHTS, SCORING_BENCHMARKS } from "./constants";
import type { ScoreBreakdown } from "@/types/etf";

function normalize(value: number | null, best: number, worst: number): number {
  if (value === null) return 50;
  const min = Math.min(best, worst);
  const max = Math.max(best, worst);
  const clamped = Math.max(min, Math.min(max, value));
  const score = ((clamped - worst) / (best - worst)) * 100;
  return Math.max(0, Math.min(100, score));
}

export function computeScore(etf: {
  ter: number;
  return5y: number | null;
  return3y: number | null;
  return1y: number | null;
  aum: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  leveraged: boolean;
}): { score: number; breakdown: ScoreBreakdown } {
  const terScore = normalize(etf.ter, SCORING_BENCHMARKS.ter.best, SCORING_BENCHMARKS.ter.worst);

  const perfValue = etf.return5y ?? etf.return3y ?? etf.return1y;
  const performanceScore = normalize(perfValue, SCORING_BENCHMARKS.return5y.best, SCORING_BENCHMARKS.return5y.worst);

  const aumScore = normalize(etf.aum, SCORING_BENCHMARKS.aum.best, SCORING_BENCHMARKS.aum.worst);

  const sharpeScore = normalize(etf.sharpeRatio, SCORING_BENCHMARKS.sharpe.best, SCORING_BENCHMARKS.sharpe.worst);

  const drawdownScore = normalize(etf.maxDrawdown, SCORING_BENCHMARKS.drawdown.best, SCORING_BENCHMARKS.drawdown.worst);

  const leveragePenalty = etf.leveraged ? 0.85 : 1.0;

  const compositeScore =
    (SCORING_WEIGHTS.ter * terScore +
      SCORING_WEIGHTS.performance * performanceScore +
      SCORING_WEIGHTS.aum * aumScore +
      SCORING_WEIGHTS.sharpe * sharpeScore +
      SCORING_WEIGHTS.drawdown * drawdownScore) *
    leveragePenalty;

  return {
    score: Math.round(compositeScore * 10) / 10,
    breakdown: {
      terScore: Math.round(terScore),
      performanceScore: Math.round(performanceScore),
      aumScore: Math.round(aumScore),
      sharpeScore: Math.round(sharpeScore),
      drawdownScore: Math.round(drawdownScore),
    },
  };
}
