import type { ProjectionPoint, PortfolioConfig } from "@/types/portfolio";
import { PEA_PLAFOND, getTaxRate } from "@/lib/constants";

export function computeProjection(config: PortfolioConfig): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const totalYears = config.retirementAge - (config.startYear - config.birthYear);
  const netAnnualReturn = config.expectedAnnualReturn - (config.annualFeeRate ?? 0);
  const monthlyRate = netAnnualReturn / 12;
  const isPea = config.envelope === "pea";
  const taxRate = getTaxRate(config.envelope);

  const monthlyTradeFee = config.monthlyTradeFee ?? 0;

  let portfolioValue = 0;
  let totalInvested = 0;
  let cumulativeFees = 0;

  if (config.initialCapital !== undefined) {
    portfolioValue = config.initialCapital;
    totalInvested = config.initialCapital;
  } else {
    for (const h of config.holdings) {
      portfolioValue += h.currentValue ?? 0;
      totalInvested += h.currentValue ?? 0;
    }
  }

  for (let year = 0; year <= totalYears; year++) {
    const currentYear = config.startYear + year;
    const age = currentYear - config.birthYear;

    if (year > 0) {
      for (let month = 0; month < 12; month++) {
        // PEA : plafond 150 000 € de versements. CTO : illimité.
        const contribution = isPea
          ? Math.min(config.monthlyTotal, Math.max(0, PEA_PLAFOND - totalInvested))
          : config.monthlyTotal;

        // Frais de courtage déduits de la contribution effective
        const netContribution = Math.max(0, contribution - monthlyTradeFee);
        cumulativeFees += contribution > 0 ? monthlyTradeFee : 0;

        // Frais de garde annuels (déjà déduits via netAnnualReturn, mais trackés)
        const custodyFeeThisMonth = portfolioValue * (config.annualFeeRate ?? 0) / 12;
        cumulativeFees += custodyFeeThisMonth;

        portfolioValue = portfolioValue * (1 + monthlyRate) + netContribution;
        totalInvested += contribution;
      }
    }

    const gains = Math.max(0, portfolioValue - totalInvested);
    const afterTaxValue = Math.round(portfolioValue - gains * taxRate);

    const point: ProjectionPoint = {
      year: currentYear,
      age,
      totalInvested: Math.round(totalInvested),
      projectedValue: Math.round(portfolioValue),
      afterTaxValue,
      cumulativeFees: Math.round(cumulativeFees),
    };

    if (
      portfolioValue >= 1_000_000 &&
      (points.length === 0 || points[points.length - 1].projectedValue < 1_000_000)
    ) {
      point.label = "MILLIONNAIRE";
    }

    // Jalon plafond PEA uniquement en enveloppe PEA
    if (
      isPea &&
      totalInvested >= PEA_PLAFOND &&
      (points.length === 0 || points[points.length - 1].totalInvested < PEA_PLAFOND)
    ) {
      point.label = (point.label ? point.label + " + " : "") + "PLAFOND PEA";
    }

    if (age === config.retirementAge) {
      point.label = (point.label ? point.label + " + " : "") + "RETRAITE";
    }

    points.push(point);
  }

  return points;
}

export function computeProjectionMultiRate(
  config: PortfolioConfig,
  rates: number[]
): Record<string, ProjectionPoint[]> {
  const result: Record<string, ProjectionPoint[]> = {};
  for (const rate of rates) {
    result[`${Math.round(rate * 100)}%`] = computeProjection({
      ...config,
      expectedAnnualReturn: rate,
    });
  }
  return result;
}
