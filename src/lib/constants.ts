export const SCORING_WEIGHTS = {
  ter: 0.20,
  performance: 0.30,
  aum: 0.15,
  sharpe: 0.20,
  drawdown: 0.15,
};

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
  Sector: "Sectoriel",
  Leveraged: "Levier",
};

export const CATEGORY_COLORS: Record<string, string> = {
  World: "bg-blue-100 text-blue-800",
  US: "bg-indigo-100 text-indigo-800",
  Europe: "bg-emerald-100 text-emerald-800",
  Eurozone: "bg-green-100 text-green-800",
  France: "bg-sky-100 text-sky-800",
  Emerging: "bg-orange-100 text-orange-800",
  Asia: "bg-amber-100 text-amber-800",
  Japan: "bg-red-100 text-red-800",
  Sector: "bg-purple-100 text-purple-800",
  Leveraged: "bg-rose-100 text-rose-800",
};

export const DEFAULT_PORTFOLIO = {
  birthYear: 1997,
  retirementAge: 64,
  startYear: 2026,
  monthlyTotal: 600,
  initialCapital: 14000,
  holdings: [
    { isin: "IE0002XZSHO1", ticker: "WPEA", name: "iShares MSCI World PEA", allocation: 0.85, monthlyInvestment: 510 },
    { isin: "FR0013412020", ticker: "PAEEM", name: "Amundi PEA Emerging Markets", allocation: 0.10, monthlyInvestment: 60 },
    { isin: "FR0010755611", ticker: "CL2", name: "Amundi USA x2 Levier", allocation: 0.05, monthlyInvestment: 30 },
  ],
};
