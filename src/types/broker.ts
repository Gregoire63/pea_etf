import type { PeaBroker } from "@/data/pea-brokers";

/**
 * IDs des courtiers connus (hardcodes dans pea-brokers.ts).
 * Les courtiers decouverts dynamiquement utilisent des IDs string arbitraires.
 */
export type KnownBrokerId =
  | "trade-republic"
  | "xtb"
  | "interactive-brokers"
  | "fortuneo"
  | "boursobank"
  | "bourse-direct"
  | "saxo-banque"
  | "yomoni"
  | "ramify"
  | "easybourse"
  | "hello-bank"
  | "monabanq"
  | "credit-agricole"
  | "bnp-paribas"
  | "societe-generale"
  | "lcl"
  | "credit-mutuel"
  | "caisse-epargne"
  | "banque-populaire"
  | "goodvest"
  | "nalo";

/**
 * Accepte les IDs connus + les IDs decouverts dynamiquement.
 * Utiliser KnownBrokerId quand on a besoin de type-checking strict.
 */
export type BrokerId = KnownBrokerId | (string & {});

// ── Plan d'achat mensuel ────────────────────────────────────────────────────

export interface MonthlyPurchase {
  isin: string;
  ticker: string;
  shortName: string;
  /** Nombre de parts entières à acheter */
  shares: number;
  /** Coût total estimé (parts × prix) */
  totalCost: number;
  /** Prix unitaire utilisé pour le calcul */
  pricePerShare: number;
  /** Frais de courtage estimés pour cet ordre */
  estimatedFee: number;
  /** Poids cible de cet ETF dans la stratégie (0-100) */
  targetWeight: number;
  /** Poids réellement atteint ce mois (0-100) */
  actualWeight: number;
  /** Raison de l'achat ce mois (affichée à l'utilisateur) */
  reason: string;
}

export interface MonthlyPlan {
  monthLabel: string;
  cycleMonth: number;
  purchases: MonthlyPurchase[];
  totalInvested: number;
  totalFees: number;
  remainingCash: number;
  isCurrent: boolean;
}

/** ETF de la stratégie avec son statut dans le plan d'achat */
export interface StrategyEtfStatus {
  isin: string;
  ticker: string;
  shortName: string;
  weight: number;
  /** Poids réellement atteint ce mois (0-100) */
  actualWeight: number;
  currentPrice: number;
  /** Acheté ce mois-ci ? */
  boughtThisMonth: boolean;
  /** Nombre de parts achetées (0 si pas acheté) */
  shares: number;
}

export interface PurchasePlanResult {
  broker: PeaBroker;
  /** "all-monthly" si le budget permet d'acheter tous les ETFs, sinon "rotation" */
  strategyType: "all-monthly" | "rotation";
  /** Nombre de mois pour un cycle de rotation complet */
  rotationCycleLength: number;
  months: MonthlyPlan[];
  /** Tous les ETFs de la stratégie avec leur statut d'achat du mois courant */
  strategyEtfs: StrategyEtfStatus[];
  averageMonthlyFee: number;
  annualFees: number;
  /** Ratio frais / investissement annuel (en %) */
  feeRatio: number;
}
