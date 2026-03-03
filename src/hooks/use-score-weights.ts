"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SCORING_WEIGHTS, DEFAULT_LEVERAGE_PENALTY } from "@/lib/constants";

export interface ScoreWeights {
  ter: number;
  performance: number;
  aum: number;
  sharpe: number;
  drawdown: number;
  /** Malus levier en pourcentage (0 = pas de malus, 50 = −50 %) */
  leveragePenalty: number;
}

const STORAGE_KEY = "pea_score_weights";
const SAVE_DEBOUNCE_MS = 400;

// Raw slider values 0–100, matching the default ratios
export const DEFAULT_WEIGHTS: ScoreWeights = {
  ter: Math.round(SCORING_WEIGHTS.ter * 100),                // 20
  performance: Math.round(SCORING_WEIGHTS.performance * 100), // 30
  aum: Math.round(SCORING_WEIGHTS.aum * 100),                // 15
  sharpe: Math.round(SCORING_WEIGHTS.sharpe * 100),          // 20
  drawdown: Math.round(SCORING_WEIGHTS.drawdown * 100),      // 15
  leveragePenalty: DEFAULT_LEVERAGE_PENALTY,
};

function isDefault(weights: ScoreWeights): boolean {
  return (
    weights.ter === DEFAULT_WEIGHTS.ter &&
    weights.performance === DEFAULT_WEIGHTS.performance &&
    weights.aum === DEFAULT_WEIGHTS.aum &&
    weights.sharpe === DEFAULT_WEIGHTS.sharpe &&
    weights.drawdown === DEFAULT_WEIGHTS.drawdown &&
    weights.leveragePenalty === DEFAULT_WEIGHTS.leveragePenalty
  );
}

function loadFromStorage(): ScoreWeights {
  if (typeof window === "undefined") return DEFAULT_WEIGHTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_WEIGHTS;
    const parsed = JSON.parse(saved) as Partial<ScoreWeights>;
    if (
      typeof parsed.ter === "number" &&
      typeof parsed.performance === "number" &&
      typeof parsed.aum === "number" &&
      typeof parsed.sharpe === "number" &&
      typeof parsed.drawdown === "number"
    ) {
      return {
        ...parsed as ScoreWeights,
        // Migration : anciens réglages sans leveragePenalty → valeur par défaut
        leveragePenalty: typeof parsed.leveragePenalty === "number"
          ? parsed.leveragePenalty
          : DEFAULT_WEIGHTS.leveragePenalty,
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_WEIGHTS;
}

export function useScoreWeights() {
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setWeights(loadFromStorage());
  }, []);

  const updateWeights = useCallback((newWeights: ScoreWeights) => {
    // Mise à jour immédiate de l'état pour fluidité du slider
    setWeights(newWeights);

    // Écriture localStorage débouncée : évite le freeze sur chaque event de drag
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWeights));
      } catch {
        // ignore storage errors
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const resetWeights = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setWeights(DEFAULT_WEIGHTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Normalized weights in 0–1 range for score computation
  const normalizedWeights = useMemo(() => {
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
  }, [weights]);

  return {
    weights,
    normalizedWeights,
    isCustom: !isDefault(weights),
    updateWeights,
    resetWeights,
  };
}
