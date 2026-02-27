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
}

export interface ProjectionPoint {
  year: number;
  age: number;
  totalInvested: number;
  projectedValue: number;
  label?: string;
}
