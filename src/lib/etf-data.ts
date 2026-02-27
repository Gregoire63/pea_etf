import type { PeaEtfCatalogEntry, EtfRankedEntry, PricePoint } from "@/types/etf";
import { fetchAllEtfQuotes, fetchAllHistoricalPrices } from "./yahoo-finance";
import {
  annualizedReturn,
  maxDrawdown,
  annualizedVolatility,
  sharpeRatio,
  ytdReturn,
} from "./calculations";
import { computeScore } from "./scoring";
import { getCachedEtfs, setCachedEtfs } from "./cache";
import { BASE_CATALOG, extractIssuer } from "./etf-catalog";

// Évite les appels concurrent à Yahoo Finance si plusieurs composants déclenchent
// getAllEtfsRanked en parallèle (ex: Suspense boundaries sur la même page)
let pendingRefresh: Promise<EtfRankedEntry[]> | null = null;

export async function getAllEtfsRanked(): Promise<EtfRankedEntry[]> {
  const cached = getCachedEtfs();
  if (cached) return cached;

  if (!pendingRefresh) {
    pendingRefresh = refreshAllEtfs().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

export async function refreshAllEtfs(): Promise<EtfRankedEntry[]> {
  const tickers = BASE_CATALOG.map((e) => e.yahooTicker);

  const [quotes, allPrices] = await Promise.all([
    fetchAllEtfQuotes(tickers),
    fetchAllHistoricalPrices(tickers, 10),
  ]);

  const entries: EtfRankedEntry[] = [];

  for (const base of BASE_CATALOG) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = quotes.get(base.yahooTicker) as Record<string, any> | null | undefined;
    const prices = allPrices.get(base.yahooTicker) || [];

    // Exclure les ETF sans aucune donnée : pas de cotation ET pas d'historique
    // → probablement délisté ou ticker invalide
    if (!quote && prices.length === 0) {
      console.warn(`[ETF catalog] Skipping ${base.yahooTicker} (${base.isin}): aucune donnée disponible`);
      continue;
    }

    // Enrichissement dynamique depuis Yahoo Finance
    const longName: string = quote?.longName ?? quote?.shortName ?? base.yahooTicker;
    const shortName: string = quote?.shortName ?? longName.substring(0, 50);
    // TER depuis Yahoo Finance si disponible, sinon valeur de référence du catalogue
    const ter: number = (quote?.annualReportExpenseRatio as number | undefined) ?? base.ter;

    const r1y = annualizedReturn(prices, 1);
    const r3y = annualizedReturn(prices, 3);
    const r5y = annualizedReturn(prices, 5);
    const r10y = annualizedReturn(prices, 10);
    const mdd = prices.length > 0 ? maxDrawdown(prices) : null;
    const vol = annualizedVolatility(prices);
    const perfForSharpe = r5y ?? r3y ?? r1y;
    const sr = sharpeRatio(perfForSharpe, vol);
    const ytd = ytdReturn(prices);

    // Pour les ETF, totalAssets est plus précis que marketCap
    const aum: number | null =
      (quote?.totalAssets as number | undefined) ??
      (quote?.marketCap as number | undefined) ??
      null;

    const catalogEntry: PeaEtfCatalogEntry = {
      isin: base.isin,
      ticker: base.yahooTicker.replace(".PA", ""),
      yahooTicker: base.yahooTicker,
      name: longName,
      shortName,
      issuer: extractIssuer(longName),
      ter,
      category: base.category,
      distribution: base.distribution,
      replication: base.replication,
      currency: (quote?.currency as string | undefined) ?? "EUR",
      index: base.index,
      launchDate: "",
      leveraged: base.leveraged,
      leverageMultiplier: base.leverageMultiplier,
    };

    const { score, breakdown } = computeScore({
      ter,
      return5y: r5y,
      return3y: r3y,
      return1y: r1y,
      aum,
      sharpeRatio: sr,
      maxDrawdown: mdd,
      leveraged: base.leveraged,
    });

    entries.push({
      ...catalogEntry,
      currentPrice: (quote?.regularMarketPrice as number | undefined) ?? null,
      aum,
      volume: (quote?.regularMarketVolume as number | undefined) ?? null,
      fiftyTwoWeekHigh: (quote?.fiftyTwoWeekHigh as number | undefined) ?? null,
      fiftyTwoWeekLow: (quote?.fiftyTwoWeekLow as number | undefined) ?? null,
      ytdReturn: ytd,
      return1y: r1y,
      return3y: r3y,
      return5y: r5y,
      return10y: r10y,
      maxDrawdown: mdd,
      sharpeRatio: sr,
      volatility1y: vol,
      lastUpdated: new Date().toISOString(),
      score,
      scoreBreakdown: breakdown,
      rank: 0,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => (e.rank = i + 1));

  setCachedEtfs(entries);
  return entries;
}

export function getEtfByIsin(etfs: EtfRankedEntry[], isin: string): EtfRankedEntry | undefined {
  return etfs.find((e) => e.isin === isin);
}

// Cache des historiques de prix par ticker (TTL 1h)
const priceCache = new Map<string, { data: PricePoint[]; timestamp: number }>();
const PRICE_CACHE_MS = 60 * 60 * 1000;

export async function getHistoricalPricesForIsin(isin: string, years: number = 10): Promise<PricePoint[]> {
  const etf = BASE_CATALOG.find((e) => e.isin === isin);
  if (!etf) return [];

  const cached = priceCache.get(etf.yahooTicker);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_MS) {
    return cached.data;
  }

  const { fetchHistoricalPrices } = await import("./yahoo-finance");
  const data = await fetchHistoricalPrices(etf.yahooTicker, years);
  priceCache.set(etf.yahooTicker, { data, timestamp: Date.now() });
  return data;
}
