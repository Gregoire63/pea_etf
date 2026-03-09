import { SCORING_WEIGHTS, SCORING_BENCHMARKS, DEFAULT_LEVERAGE_PENALTY } from "./constants";
import type { ScoreBreakdown } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScoringBenchmarks = typeof SCORING_BENCHMARKS;

export type ScoringInput = {
  ter: number;
  return5y: number | null;
  return3y: number | null;
  return1y: number | null;
  aum: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  leveraged: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise une valeur entre 0 et 100 par rapport aux bornes best/worst.
 * Les données manquantes (null) reçoivent un score neutre (50/100).
 * La pénalité pour données manquantes est appliquée séparément via
 * le facteur dataCoverage dans computeScore().
 */
function normalize(value: number | null, best: number, worst: number): number {
  if (value === null) return 50;
  if (best === worst) return 50;
  const min = Math.min(best, worst);
  const max = Math.max(best, worst);
  const clamped = Math.max(min, Math.min(max, value));
  const score = ((clamped - worst) / (best - worst)) * 100;
  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmarks dynamiques
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule des benchmarks adaptatifs à partir des données réelles.
 *
 * Utilise les percentiles P10 (best) et P90 (worst) pour chaque métrique,
 * ce qui garantit que le scoring s'adapte à la distribution réelle du marché.
 * Fallback sur les constantes statiques si le dataset est trop petit (< 5 ETFs).
 */
export function computeDynamicBenchmarks(
  etfs: ScoringInput[]
): ScoringBenchmarks {
  if (etfs.length < 5) return SCORING_BENCHMARKS;

  function percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  }

  const ters = etfs.map((e) => e.ter).filter((v) => v > 0);
  const perfs = etfs
    .map((e) => e.return5y ?? e.return3y ?? e.return1y)
    .filter((v): v is number => v !== null);
  const aums = etfs
    .map((e) => e.aum)
    .filter((v): v is number => v !== null && v > 0);
  const sharpes = etfs
    .map((e) => e.sharpeRatio)
    .filter((v): v is number => v !== null);
  const drawdowns = etfs
    .map((e) => e.maxDrawdown)
    .filter((v): v is number => v !== null);

  return {
    ter: {
      best: ters.length >= 5 ? percentile(ters, 10) : SCORING_BENCHMARKS.ter.best,
      worst: ters.length >= 5 ? percentile(ters, 90) : SCORING_BENCHMARKS.ter.worst,
    },
    return5y: {
      best: perfs.length >= 5 ? percentile(perfs, 90) : SCORING_BENCHMARKS.return5y.best,
      worst: perfs.length >= 5 ? percentile(perfs, 10) : SCORING_BENCHMARKS.return5y.worst,
    },
    aum: {
      best: aums.length >= 5 ? percentile(aums, 90) : SCORING_BENCHMARKS.aum.best,
      worst: aums.length >= 5 ? percentile(aums, 10) : SCORING_BENCHMARKS.aum.worst,
    },
    sharpe: {
      best: sharpes.length >= 5 ? percentile(sharpes, 90) : SCORING_BENCHMARKS.sharpe.best,
      worst: sharpes.length >= 5 ? percentile(sharpes, 10) : SCORING_BENCHMARKS.sharpe.worst,
    },
    drawdown: {
      best: drawdowns.length >= 5 ? percentile(drawdowns, 90) : SCORING_BENCHMARKS.drawdown.best,
      worst: drawdowns.length >= 5 ? percentile(drawdowns, 10) : SCORING_BENCHMARKS.drawdown.worst,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Score composite
// ─────────────────────────────────────────────────────────────────────────────

export function computeScore(
  etf: ScoringInput,
  benchmarks: ScoringBenchmarks = SCORING_BENCHMARKS,
): { score: number; breakdown: ScoreBreakdown } {
  const terScore = normalize(etf.ter, benchmarks.ter.best, benchmarks.ter.worst);

  const perfValue = etf.return5y ?? etf.return3y ?? etf.return1y;
  const performanceScore = normalize(perfValue, benchmarks.return5y.best, benchmarks.return5y.worst);

  const aumScore = normalize(etf.aum, benchmarks.aum.best, benchmarks.aum.worst);

  const sharpeScore = normalize(etf.sharpeRatio, benchmarks.sharpe.best, benchmarks.sharpe.worst);

  const drawdownScore = normalize(etf.maxDrawdown, benchmarks.drawdown.best, benchmarks.drawdown.worst);

  // ── Pénalité levier (volatility drag = levier² × drag normal) ──
  const leveragePenalty = etf.leveraged ? (100 - DEFAULT_LEVERAGE_PENALTY) / 100 : 1.0;

  // ── Plancher AUM : pénalité pour les très petits fonds (risque de fermeture) ──
  const aumFloorPenalty =
    etf.aum !== null && etf.aum < 20_000_000 ? 0.85
    : etf.aum !== null && etf.aum < 50_000_000 ? 0.93
    : 1.0;

  // ── Couverture données : pénalité douce pour les métriques manquantes ──
  // Chaque métrique manquante (sauf TER, toujours dispo) réduit légèrement le score.
  // 4/4 métriques = 1.00, 3/4 = 0.97, 2/4 = 0.94, 1/4 = 0.91, 0/4 = 0.88
  const availableMetrics = [
    perfValue !== null,
    etf.aum !== null,
    etf.sharpeRatio !== null,
    etf.maxDrawdown !== null,
  ].filter(Boolean).length;
  const dataCoverage = 1.0 - (4 - availableMetrics) * 0.03;

  const compositeScore =
    (SCORING_WEIGHTS.ter * terScore +
      SCORING_WEIGHTS.performance * performanceScore +
      SCORING_WEIGHTS.aum * aumScore +
      SCORING_WEIGHTS.sharpe * sharpeScore +
      SCORING_WEIGHTS.drawdown * drawdownScore) *
    leveragePenalty *
    aumFloorPenalty *
    dataCoverage;

  return {
    score: Math.round(compositeScore * 10) / 10,
    breakdown: {
      terScore: Math.round(terScore),
      performanceScore: Math.round(performanceScore),
      aumScore: Math.round(aumScore),
      sharpeScore: Math.round(sharpeScore),
      drawdownScore: Math.round(drawdownScore),
      dataCoverage: availableMetrics,
    },
  };
}
