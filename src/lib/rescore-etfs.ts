/**
 * Recalcule les scores des ETFs avec des poids personnalisés.
 *
 * Utilisé par :
 *  - etf-ranking-table.tsx → classement interactif
 *  - portfolio-client.tsx  → stratégie adaptée aux préférences utilisateur
 *
 * Les sous-scores (terScore, performanceScore, etc.) sont calculés côté serveur
 * avec les benchmarks dynamiques. Cette fonction ne recalcule que le score
 * composite final avec les poids choisis par l'utilisateur.
 */

import type { EtfRankedEntry } from "@/types/etf";
import type { ScoreWeights } from "@/hooks/use-score-weights";

interface NormalizedWeights {
  ter: number;
  performance: number;
  aum: number;
  sharpe: number;
  drawdown: number;
}

export function normalizeWeights(weights: ScoreWeights): NormalizedWeights {
  const total =
    weights.ter + weights.performance + weights.aum + weights.sharpe + weights.drawdown;
  if (total === 0) {
    return { ter: 0.2, performance: 0.3, aum: 0.15, sharpe: 0.2, drawdown: 0.15 };
  }
  return {
    ter: weights.ter / total,
    performance: weights.performance / total,
    aum: weights.aum / total,
    sharpe: weights.sharpe / total,
    drawdown: weights.drawdown / total,
  };
}

/**
 * Re-score et re-rank les ETFs avec des poids personnalisés.
 * Retourne un nouveau tableau trié par score décroissant.
 */
export function rescoreEtfs(
  etfs: EtfRankedEntry[],
  weights: ScoreWeights,
): EtfRankedEntry[] {
  const nw = normalizeWeights(weights);
  const leverageMultiplier = (100 - weights.leveragePenalty) / 100;

  const scored = etfs.map((etf) => {
    const { terScore, performanceScore, aumScore, sharpeScore, drawdownScore, dataCoverage } =
      etf.scoreBreakdown;
    const penalty = etf.leveraged ? leverageMultiplier : 1.0;
    const aumFloorPenalty =
      etf.aum !== null && etf.aum < 20_000_000 ? 0.85
      : etf.aum !== null && etf.aum < 50_000_000 ? 0.93
      : 1.0;
    const dataCoveragePenalty = 1.0 - (4 - (dataCoverage ?? 4)) * 0.03;
    const customScore =
      Math.round(
        (nw.ter * terScore +
          nw.performance * performanceScore +
          nw.aum * aumScore +
          nw.sharpe * sharpeScore +
          nw.drawdown * drawdownScore) *
          penalty *
          aumFloorPenalty *
          dataCoveragePenalty *
          10
      ) / 10;
    return { ...etf, score: customScore };
  });

  // Re-rank par score décroissant
  scored.sort((a, b) => b.score - a.score);
  return scored.map((etf, i) => ({ ...etf, rank: i + 1 }));
}
