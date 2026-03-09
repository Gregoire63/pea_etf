export const SCORING_WEIGHTS = {
  ter: 0.20,
  performance: 0.30,
  aum: 0.15,
  sharpe: 0.20,
  drawdown: 0.15,
};

/** Malus appliqué aux ETF à levier, en pourcentage (30 = −30 % sur le score).
 *  Raison : le volatility drag quotidien est multiplié par le carré du facteur
 *  de levier (2x → 4x le drag). Sur des marchés volatils, un ETF 2x peut perdre
 *  de la valeur même si l'indice sous-jacent est stable. */
export const DEFAULT_LEVERAGE_PENALTY = 30;

/** Taux sans risque annuel utilisé pour le calcul du ratio de Sharpe.
 *  Basé sur le rendement moyen des obligations d'État européennes (~3 %). */
export const RISK_FREE_RATE = 0.03;

export const SCORING_BENCHMARKS = {
  ter: { best: 0.001, worst: 0.006 },
  return5y: { best: 0.15, worst: -0.02 },
  aum: { best: 5_000_000_000, worst: 10_000_000 },
  sharpe: { best: 1.5, worst: -0.5 },
  drawdown: { best: -0.10, worst: -0.70 },
};

export const CATEGORY_LABELS: Record<string, string> = {
  World: "Monde",
  US: "Etats-Unis",
  Europe: "Europe",
  Eurozone: "Zone Euro",
  France: "France",
  Emerging: "Emergents",
  Asia: "Asie",
  Japan: "Japon",
  UK: "Royaume-Uni",
  Germany: "Allemagne",
  Nordic: "Nordiques",
  Sector: "Sectoriel",
  Dividend: "Dividendes",
  Leveraged: "Levier",
  Other: "Autre",
};

export const CATEGORY_COLORS: Record<string, string> = {
  World:    "bg-blue-100    text-blue-800    dark:bg-transparent dark:border-blue-500/60    dark:text-blue-400",
  US:       "bg-indigo-100  text-indigo-800  dark:bg-transparent dark:border-indigo-500/60  dark:text-indigo-400",
  Europe:   "bg-emerald-100 text-emerald-800 dark:bg-transparent dark:border-emerald-500/60 dark:text-emerald-400",
  Eurozone: "bg-green-100   text-green-800   dark:bg-transparent dark:border-green-500/60   dark:text-green-400",
  France:   "bg-sky-100     text-sky-800     dark:bg-transparent dark:border-sky-500/60     dark:text-sky-400",
  Emerging: "bg-orange-100  text-orange-800  dark:bg-transparent dark:border-orange-500/60  dark:text-orange-400",
  Asia:     "bg-amber-100   text-amber-800   dark:bg-transparent dark:border-amber-500/60   dark:text-amber-400",
  Japan:    "bg-red-100     text-red-800     dark:bg-transparent dark:border-red-500/60     dark:text-red-400",
  UK:       "bg-slate-100   text-slate-800   dark:bg-transparent dark:border-slate-500/60   dark:text-slate-400",
  Germany:  "bg-yellow-100  text-yellow-800  dark:bg-transparent dark:border-yellow-500/60  dark:text-yellow-400",
  Nordic:   "bg-cyan-100    text-cyan-800    dark:bg-transparent dark:border-cyan-500/60    dark:text-cyan-400",
  Sector:   "bg-purple-100  text-purple-800  dark:bg-transparent dark:border-purple-500/60  dark:text-purple-400",
  Dividend: "bg-teal-100    text-teal-800    dark:bg-transparent dark:border-teal-500/60    dark:text-teal-400",
  Leveraged:"bg-rose-100    text-rose-800    dark:bg-transparent dark:border-rose-500/60    dark:text-rose-400",
  Other:    "bg-gray-100    text-gray-800    dark:bg-transparent dark:border-gray-500/60    dark:text-gray-400",
};

// ─────────────────────────────────────────────────────────────────────────────
// Enveloppes fiscales
// ─────────────────────────────────────────────────────────────────────────────

export type Envelope = "pea" | "cto";

export const ENVELOPE_LABELS: Record<Envelope, string> = {
  pea: "PEA",
  cto: "Compte-Titres (CTO)",
};

/** Plafond de versements PEA (les plus-values peuvent le dépasser). */
export const PEA_PLAFOND = 150_000;

/**
 * Taux d'imposition PEA & CTO — barème fiscal en vigueur.
 *
 * À mettre à jour en cas de changement législatif (Loi de Finances).
 * Dernière mise à jour : LF 2026 (CSG relevée à 18,6 %).
 */
export const TAX_EFFECTIVE_YEAR = 2026;

/** Prélèvements sociaux PEA après 5 ans : 18,6 % (CSG 2026). */
export const PEA_TAX_RATE = 0.186;

/** Flat tax CTO : 12,8 % IR + 18,6 % PS = 31,4 %. */
export const CTO_TAX_RATE = 0.314;

export function getTaxRate(envelope: Envelope): number {
  return envelope === "pea" ? PEA_TAX_RATE : CTO_TAX_RATE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio par défaut
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PORTFOLIO = {
  birthYear: 1997,
  retirementAge: 64,
  startYear: new Date().getFullYear(),
  monthlyTotal: 600,
  initialCapital: 14000,
  holdings: [
    { isin: "IE0002XZSHO1", ticker: "WPEA", name: "iShares MSCI World PEA", allocation: 0.85, monthlyInvestment: 510 },
    { isin: "FR0013412020", ticker: "PAEEM", name: "Amundi PEA Emerging Markets", allocation: 0.10, monthlyInvestment: 60 },
    { isin: "FR0010755611", ticker: "CL2", name: "Amundi USA x2 Levier", allocation: 0.05, monthlyInvestment: 30 },
  ],
};
