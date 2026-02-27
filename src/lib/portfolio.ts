import type { ProjectionPoint, PortfolioConfig } from "@/types/portfolio";

export function computeProjection(config: PortfolioConfig): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const totalYears = config.retirementAge - (config.startYear - config.birthYear);
  const monthlyRate = config.expectedAnnualReturn / 12;

  let portfolioValue = 0;
  let totalInvested = 0;

  // Add current holdings value
  for (const h of config.holdings) {
    portfolioValue += h.currentValue ?? 0;
    totalInvested += h.currentValue ?? 0;
  }

  for (let year = 0; year <= totalYears; year++) {
    const currentYear = config.startYear + year;
    const age = currentYear - config.birthYear;

    if (year > 0) {
      for (let month = 0; month < 12; month++) {
        portfolioValue = portfolioValue * (1 + monthlyRate) + config.monthlyTotal;
        totalInvested += config.monthlyTotal;
      }
    }

    const point: ProjectionPoint = {
      year: currentYear,
      age,
      totalInvested: Math.round(totalInvested),
      projectedValue: Math.round(portfolioValue),
    };

    if (
      portfolioValue >= 1_000_000 &&
      (points.length === 0 || points[points.length - 1].projectedValue < 1_000_000)
    ) {
      point.label = "MILLIONNAIRE";
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
