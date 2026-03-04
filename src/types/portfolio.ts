import type { Envelope } from "@/lib/constants";

export interface PortfolioHolding {
  isin: string;
  ticker: string;
  name: string;
  allocation: number;
  monthlyInvestment: number;
  currentValue?: number;
}

export interface PortfolioConfig {
  holdings: PortfolioHolding[];
  monthlyTotal: number;
  startYear: number;
  birthYear: number;
  retirementAge: number;
  expectedAnnualReturn: number;
  initialCapital?: number;
  /** Frais annuels du courtier en décimal (ex: 0.016 pour 1.60 %) — déduits des rendements */
  annualFeeRate?: number;
  /** Frais de courtage estimés par mois en € (ordres mensuels) */
  monthlyTradeFee?: number;
  /** Enveloppe fiscale — détermine le plafond et le taux d'imposition */
  envelope: Envelope;
}

export interface ProjectionPoint {
  year: number;
  age: number;
  totalInvested: number;
  projectedValue: number;
  /** Valeur après impôts (gains taxés au taux de l'enveloppe) */
  afterTaxValue: number;
  /** Frais courtier cumulés (garde + courtage) depuis le début */
  cumulativeFees: number;
  label?: string;
}
