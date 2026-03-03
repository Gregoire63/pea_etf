import type {
  MonthlyPlan,
  MonthlyPurchase,
  PurchasePlanResult,
  StrategyEtfStatus,
} from "@/types/broker";
import type { PeaBroker } from "@/data/pea-brokers";
import type { StrategyEtf } from "@/lib/portfolio-strategy";
import { estimateTradeFee, getEffectiveMinOrder } from "@/lib/brokers";

// ─────────────────────────────────────────────────────────────────────────────
// Types d'entrée
// ─────────────────────────────────────────────────────────────────────────────

export interface EtfPriceInfo {
  isin: string;
  ticker: string;
  shortName: string;
  currentPrice: number;
  /** Performance YTD (ex: -0.05 pour -5%) */
  ytdReturn: number | null;
  /** Performance 1 an */
  return1y: number | null;
}

interface PlanInput {
  /** Budget mensuel de l'utilisateur (EUR) */
  monthlyBudget: number;
  /** ETFs de la stratégie avec leur poids cible */
  strategyEtfs: StrategyEtf[];
  /** Prix actuels des ETFs */
  prices: EtfPriceInfo[];
  /** Courtier sélectionné */
  broker: PeaBroker;
  /** Nombre de mois à simuler */
  months?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function fmtEurInternal(v: number): string {
  return Math.round(v).toLocaleString("fr-FR");
}

function getMonthLabel(offset: number): string {
  const now = new Date();
  const month = (now.getMonth() + offset) % 12;
  const year = now.getFullYear() + Math.floor((now.getMonth() + offset) / 12);
  return `${MONTH_LABELS[month]} ${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithme principal
// ─────────────────────────────────────────────────────────────────────────────

export function computePurchasePlan(input: PlanInput): PurchasePlanResult {
  const { monthlyBudget, strategyEtfs, prices, broker, months = 6 } = input;

  // Map prix par ISIN
  const priceMap = new Map(prices.map((p) => [p.isin, p]));

  // Filtrer les ETFs qui ont un prix connu
  const activeEtfs = strategyEtfs.filter((e) => {
    const p = priceMap.get(e.isin);
    return p && p.currentPrice > 0;
  });

  if (activeEtfs.length === 0) {
    return emptyResult(broker);
  }

  const minOrder = getEffectiveMinOrder(broker);

  // Coût réel minimum : 1 part de chaque ETF
  const totalMinShareCost = activeEtfs.reduce((sum, etf) => {
    const p = priceMap.get(etf.isin)!;
    return sum + p.currentPrice;
  }, 0);

  // On peut acheter tous les ETFs chaque mois SI :
  // - Le budget couvre au minimum 1 part de chaque ETF
  // - OU le courtier permet des fractions / DCA fractionnaire
  const canBuyAllMonthly =
    monthlyBudget >= totalMinShareCost; // Le budget doit pouvoir acheter 1 part de chaque

  const result = canBuyAllMonthly
    ? computeAllMonthly(activeEtfs, priceMap, broker, monthlyBudget, months, minOrder)
    : computeRotation(activeEtfs, priceMap, broker, monthlyBudget, minOrder, months);

  // Construire le statut de chaque ETF de la stratégie pour le mois courant
  const currentMonth = result.months.find((m) => m.isCurrent);
  const boughtIsins = new Set(currentMonth?.purchases.map((p) => p.isin) ?? []);
  const totalMonthInvested = currentMonth?.totalInvested ?? 0;

  result.strategyEtfs = activeEtfs.map((etf) => {
    const price = priceMap.get(etf.isin)!;
    const purchase = currentMonth?.purchases.find((p) => p.isin === etf.isin);
    return {
      isin: etf.isin,
      ticker: price.ticker,
      shortName: price.shortName,
      weight: etf.weight,
      actualWeight: totalMonthInvested > 0 && purchase
        ? Math.round((purchase.totalCost / totalMonthInvested) * 1000) / 10
        : 0,
      currentPrice: price.currentPrice,
      boughtThisMonth: boughtIsins.has(etf.isin),
      shares: purchase?.shares ?? 0,
    };
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers raisons
// ─────────────────────────────────────────────────────────────────────────────

function buildReason(
  price: EtfPriceInfo,
  weight: number,
  currentAlloc: number,
  totalAllocated: number,
  isGreedyPass: boolean,
): string {
  const ytd = price.ytdReturn;

  // Under-weight reason (primary for greedy pass — rebalancing first)
  if (isGreedyPass && totalAllocated > 0) {
    const actualPct = (currentAlloc / totalAllocated) * 100;
    if (actualPct < weight * 0.7) {
      const reason = `Rééquilibrage (${actualPct.toFixed(0)} % vs ${weight} % cible)`;
      if (ytd !== null && ytd < -0.02) {
        return `${reason} · en baisse YTD (${(ytd * 100).toFixed(1)} %)`;
      }
      return reason;
    }
  }

  // Momentum-based reason (dip buying)
  if (ytd !== null && ytd < -0.02) {
    const pct = (ytd * 100).toFixed(1);
    return `En baisse YTD (${pct} %), bon point d'entrée`;
  }

  // Default proportional reason
  return `Allocation cible ${weight} %`;
}

/**
 * Trie les ETFs pour la passe greedy : priorité au plus sous-pondéré
 * (rééquilibrage), puis au YTD le plus bas (dip buying) en cas d'égalité.
 */
function sortForGreedy(
  etfs: StrategyEtf[],
  priceMap: Map<string, EtfPriceInfo>,
  allocated: Map<string, number>,
  totalAllocated: number,
): StrategyEtf[] {
  return [...etfs].sort((a, b) => {
    // Primary sort: most under-weight first (biggest gap = highest priority)
    const allocA = totalAllocated > 0 ? ((allocated.get(a.isin) ?? 0) / totalAllocated) * 100 : 0;
    const allocB = totalAllocated > 0 ? ((allocated.get(b.isin) ?? 0) / totalAllocated) * 100 : 0;
    const gapA = a.weight - allocA;
    const gapB = b.weight - allocB;
    if (Math.abs(gapA - gapB) > 0.5) return gapB - gapA;

    // Secondary sort: YTD return ascending (biggest dip first)
    const ytdA = priceMap.get(a.isin)!.ytdReturn ?? 0;
    const ytdB = priceMap.get(b.isin)!.ytdReturn ?? 0;
    return ytdA - ytdB;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stratégie "all-monthly" : achat de tous les ETFs chaque mois (greedy 2-pass)
// ─────────────────────────────────────────────────────────────────────────────

function computeAllMonthly(
  etfs: StrategyEtf[],
  priceMap: Map<string, EtfPriceInfo>,
  broker: PeaBroker,
  monthlyBudget: number,
  monthCount: number,
  minOrder: number,
): PurchasePlanResult {
  const months: MonthlyPlan[] = [];

  for (let m = 0; m < monthCount; m++) {
    let remaining = monthlyBudget;
    const sharesMap = new Map<string, number>();
    const allocatedCost = new Map<string, number>();

    // ── Passe 1 : allocation proportionnelle ──────────────────────────────
    for (const etf of etfs) {
      const price = priceMap.get(etf.isin)!;
      const targetAmount = monthlyBudget * (etf.weight / 100);
      const shares = Math.floor(targetAmount / price.currentPrice);

      if (shares > 0) {
        const cost = shares * price.currentPrice;
        // Vérifier le montant minimum d'ordre du courtier
        if (cost < minOrder) continue; // Reporté à la passe greedy
        const fee = estimateTradeFee(broker, cost, sharesMap.size);
        if (cost + fee <= remaining) {
          sharesMap.set(etf.isin, shares);
          allocatedCost.set(etf.isin, cost);
          remaining -= cost + fee;
        }
      }
    }

    // ── Passe 2 : réallocation greedy du surplus avec rééquilibrage ────────
    // On re-trie après chaque achat pour toujours prioriser l'ETF le plus
    // sous-pondéré. Cela garantit que l'allocation réelle converge vers les
    // poids cibles de la stratégie.
    let greedyDone = false;
    while (!greedyDone && remaining > 0) {
      const totalAllocatedNow = [...allocatedCost.values()].reduce((s, c) => s + c, 0);
      const greedySorted = sortForGreedy(etfs, priceMap, allocatedCost, totalAllocatedNow);

      let bought = false;
      for (const etf of greedySorted) {
        const price = priceMap.get(etf.isin)!;
        const currentShares = sharesMap.get(etf.isin) ?? 0;
        const isNewOrder = currentShares === 0;

        if (isNewOrder) {
          // Nouvelle position : acheter assez de parts pour atteindre le minOrder
          const minShares = Math.max(1, Math.ceil(minOrder / price.currentPrice));
          const minCost = minShares * price.currentPrice;
          const fee = estimateTradeFee(broker, minCost, sharesMap.size);
          if (minCost + fee <= remaining) {
            sharesMap.set(etf.isin, minShares);
            allocatedCost.set(etf.isin, minCost);
            remaining -= minCost + fee;
            bought = true;
            break;
          }
        } else {
          // Position existante : ajouter 1 part (l'ordre atteint déjà le minOrder)
          const cost1 = price.currentPrice;
          if (cost1 <= remaining) {
            sharesMap.set(etf.isin, currentShares + 1);
            allocatedCost.set(etf.isin, (allocatedCost.get(etf.isin) ?? 0) + cost1);
            remaining -= cost1;
            bought = true;
            break;
          }
        }
      }
      if (!bought) greedyDone = true;
    }

    // ── Build purchases with reasons ──────────────────────────────────────
    const purchases: MonthlyPurchase[] = [];
    const totalAllocated = [...allocatedCost.values()].reduce((s, c) => s + c, 0);
    let orderIdx = 0;

    for (const etf of etfs) {
      const shares = sharesMap.get(etf.isin) ?? 0;
      if (shares <= 0) continue;

      const price = priceMap.get(etf.isin)!;
      const totalCost = shares * price.currentPrice;
      const fee = estimateTradeFee(broker, totalCost, orderIdx);
      const targetFromPass1 = monthlyBudget * (etf.weight / 100);
      const wasGreedy = totalCost > targetFromPass1 * 1.1 || Math.floor(targetFromPass1 / price.currentPrice) === 0;
      const actualWeight = totalAllocated > 0
        ? Math.round(((allocatedCost.get(etf.isin) ?? 0) / totalAllocated) * 1000) / 10
        : etf.weight;

      purchases.push({
        isin: etf.isin,
        ticker: price.ticker,
        shortName: price.shortName,
        shares,
        totalCost,
        pricePerShare: price.currentPrice,
        estimatedFee: fee,
        targetWeight: etf.weight,
        actualWeight,
        reason: buildReason(price, etf.weight, allocatedCost.get(etf.isin) ?? 0, totalAllocated, wasGreedy),
      });

      orderIdx++;
    }

    const totalInvested = purchases.reduce((s, p) => s + p.totalCost, 0);
    const totalFees = purchases.reduce((s, p) => s + p.estimatedFee, 0);

    months.push({
      monthLabel: getMonthLabel(m),
      cycleMonth: 1,
      purchases,
      totalInvested,
      totalFees,
      remainingCash: remaining,
      isCurrent: m === 0,
    });
  }

  const totalFeesAll = months.reduce((s, m) => s + m.totalFees, 0);
  const avgMonthlyFee = totalFeesAll / monthCount;
  const annualFees = avgMonthlyFee * 12;
  const annualInvestment = monthlyBudget * 12;

  return {
    broker,
    strategyType: "all-monthly",
    rotationCycleLength: 1,
    months,
    strategyEtfs: [], // rempli par computePurchasePlan
    averageMonthlyFee: Math.round(avgMonthlyFee * 100) / 100,
    annualFees: Math.round(annualFees * 100) / 100,
    feeRatio:
      annualInvestment > 0
        ? Math.round((annualFees / annualInvestment) * 10000) / 100
        : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stratégie "rotation" : accumulation + achat quand seuil atteint
// ─────────────────────────────────────────────────────────────────────────────

function computeRotation(
  etfs: StrategyEtf[],
  priceMap: Map<string, EtfPriceInfo>,
  broker: PeaBroker,
  monthlyBudget: number,
  minOrder: number,
  monthCount: number,
): PurchasePlanResult {
  // Cagnotte virtuelle par ETF
  const pots = new Map<string, number>();
  for (const etf of etfs) {
    pots.set(etf.isin, 0);
  }

  const months: MonthlyPlan[] = [];
  let cycleDetected = false;
  let cycleLength = 0;
  const purchasedIsins = new Set<string>();

  for (let m = 0; m < monthCount; m++) {
    // 1. Alimenter chaque cagnotte proportionnellement au poids
    for (const etf of etfs) {
      const current = pots.get(etf.isin) ?? 0;
      pots.set(etf.isin, current + monthlyBudget * (etf.weight / 100));
    }

    // 2. Trier par cagnotte décroissante → priorité d'achat
    const sorted = [...etfs].sort((a, b) => {
      return (pots.get(b.isin) ?? 0) - (pots.get(a.isin) ?? 0);
    });

    let remaining = monthlyBudget;
    const purchases: MonthlyPurchase[] = [];
    let orderIndex = 0;

    for (const etf of sorted) {
      const pot = pots.get(etf.isin) ?? 0;
      const price = priceMap.get(etf.isin)!;

      // Le seuil d'achat est le max entre le minOrder et le prix d'une part
      const threshold = Math.max(minOrder, price.currentPrice);

      if (pot < threshold) continue;

      // Nombre de parts qu'on peut acheter avec la cagnotte
      const maxSharesFromPot = Math.floor(pot / price.currentPrice);
      // Nombre de parts qu'on peut se permettre ce mois
      const maxSharesFromBudget = Math.floor(remaining / price.currentPrice);
      const shares = Math.min(maxSharesFromPot, maxSharesFromBudget);

      if (shares <= 0) continue;

      const totalCost = shares * price.currentPrice;
      const fee = estimateTradeFee(broker, totalCost, orderIndex);

      if (totalCost + fee > remaining) continue;

      const ytd = price.ytdReturn;
      let reason = `Cagnotte accumulée (${fmtEurInternal(pot)} €)`;
      if (ytd !== null && ytd < -0.02) {
        reason += ` · En baisse YTD (${(ytd * 100).toFixed(1)} %)`;
      }

      purchases.push({
        isin: etf.isin,
        ticker: price.ticker,
        shortName: price.shortName,
        shares,
        totalCost,
        pricePerShare: price.currentPrice,
        estimatedFee: fee,
        targetWeight: etf.weight,
        actualWeight: 0, // calculé après la boucle
        reason,
      });

      // Déduire de la cagnotte le montant réel dépensé
      pots.set(etf.isin, pot - totalCost);
      remaining -= totalCost + fee;
      orderIndex++;

      // Tracking du cycle
      purchasedIsins.add(etf.isin);
      if (!cycleDetected && purchasedIsins.size === etfs.length) {
        cycleDetected = true;
        cycleLength = m + 1;
      }
    }

    // ── Passe surplus : réinvestir le budget restant ──────────────────────
    // Après les achats basés sur les cagnottes, utiliser le budget restant
    // en respectant les poids cibles de la stratégie.
    // Priorité : ETF le plus sous-pondéré par rapport à son allocation cible.
    // Pour les nouvelles positions : vérifier que le coût min n'est pas
    // disproportionné par rapport à l'allocation cible (max 2x).
    let surplusDone = false;
    while (!surplusDone && remaining > 0) {
      let bestAction: {
        type: "new";
        etf: StrategyEtf;
        price: EtfPriceInfo;
        shares: number;
        cost: number;
        fee: number;
        gap: number;
      } | {
        type: "add";
        purchase: MonthlyPurchase;
        price: EtfPriceInfo;
        isin: string;
        gap: number;
      } | null = null;

      for (const etf of etfs) {
        const price = priceMap.get(etf.isin)!;
        const purchase = purchases.find((p) => p.isin === etf.isin);
        const currentAlloc = purchase?.totalCost ?? 0;
        const targetAlloc = monthlyBudget * (etf.weight / 100);
        const gap = targetAlloc - currentAlloc;

        if (!purchase) {
          // Nouvelle position : vérifier minOrder + proportionnalité
          const minSharesForOrder = Math.max(1, Math.ceil(minOrder / price.currentPrice));
          const cost = minSharesForOrder * price.currentPrice;
          // Ne pas acheter si le coût min dépasse 2x l'allocation cible
          // (évite de sur-allouer les petits poids avec des ETFs chers)
          if (cost > targetAlloc * 2) continue;
          const fee = estimateTradeFee(broker, cost, orderIndex);
          if (cost + fee > remaining) continue;
          if (!bestAction || gap > bestAction.gap) {
            bestAction = { type: "new", etf, price, shares: minSharesForOrder, cost, fee, gap };
          }
        } else {
          // Position existante : ajouter 1 part
          if (price.currentPrice > remaining) continue;
          if (!bestAction || gap > bestAction.gap) {
            bestAction = { type: "add", purchase, price, isin: etf.isin, gap };
          }
        }
      }

      if (!bestAction) {
        surplusDone = true;
      } else if (bestAction.type === "new") {
        const { etf, price, shares: newShares, cost, fee } = bestAction;
        const pot = pots.get(etf.isin) ?? 0;
        const ytd = price.ytdReturn;
        let reason = `Achat anticipé (surplus ${fmtEurInternal(remaining)} €)`;
        if (ytd !== null && ytd < -0.02) {
          reason += ` · En baisse YTD (${(ytd * 100).toFixed(1)} %)`;
        }
        purchases.push({
          isin: etf.isin,
          ticker: price.ticker,
          shortName: price.shortName,
          shares: newShares,
          totalCost: cost,
          pricePerShare: price.currentPrice,
          estimatedFee: fee,
          targetWeight: etf.weight,
          actualWeight: 0,
          reason,
        });
        pots.set(etf.isin, pot - cost);
        remaining -= cost + fee;
        orderIndex++;
        purchasedIsins.add(etf.isin);
        if (!cycleDetected && purchasedIsins.size === etfs.length) {
          cycleDetected = true;
          cycleLength = m + 1;
        }
      } else {
        const { purchase, price, isin } = bestAction;
        purchase.shares += 1;
        purchase.totalCost += price.currentPrice;
        const pot = pots.get(isin) ?? 0;
        pots.set(isin, pot - price.currentPrice);
        remaining -= price.currentPrice;
      }
    }

    const totalInvested = purchases.reduce((s, p) => s + p.totalCost, 0);
    const totalFees = purchases.reduce((s, p) => s + p.estimatedFee, 0);

    // Calculer le poids réel de chaque achat
    for (const p of purchases) {
      p.actualWeight = totalInvested > 0
        ? Math.round((p.totalCost / totalInvested) * 1000) / 10
        : p.targetWeight;
    }

    months.push({
      monthLabel: getMonthLabel(m),
      cycleMonth: cycleDetected ? ((m % cycleLength) + 1) : m + 1,
      purchases,
      totalInvested,
      totalFees,
      remainingCash: monthlyBudget - totalInvested - totalFees,
      isCurrent: m === 0,
    });
  }

  const estimatedCycle = cycleDetected
    ? cycleLength
    : Math.ceil(etfs.length * (minOrder / monthlyBudget));

  const totalFeesAll = months.reduce((s, m) => s + m.totalFees, 0);
  const avgMonthlyFee = totalFeesAll / monthCount;
  const annualFees = avgMonthlyFee * 12;
  const annualInvestment = monthlyBudget * 12;

  return {
    broker,
    strategyType: "rotation",
    rotationCycleLength: estimatedCycle,
    months,
    strategyEtfs: [], // rempli par computePurchasePlan
    averageMonthlyFee: Math.round(avgMonthlyFee * 100) / 100,
    annualFees: Math.round(annualFees * 100) / 100,
    feeRatio:
      annualInvestment > 0
        ? Math.round((annualFees / annualInvestment) * 10000) / 100
        : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Résultat vide
// ─────────────────────────────────────────────────────────────────────────────

function emptyResult(broker: PeaBroker): PurchasePlanResult {
  return {
    broker,
    strategyType: "all-monthly",
    rotationCycleLength: 0,
    months: [],
    strategyEtfs: [],
    averageMonthlyFee: 0,
    annualFees: 0,
    feeRatio: 0,
  };
}
