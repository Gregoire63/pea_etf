import type { PeaEtfCatalogEntry, EtfRankedEntry, PricePoint, DataProvenance } from "@/types/etf";
import { fetchAllEtfQuotes, fetchAllHistoricalPrices } from "./yahoo-finance";
import {
  annualizedReturn,
  maxDrawdown,
  annualizedVolatility,
  sharpeRatio,
  ytdReturn,
} from "./calculations";
import { computeScore, computeDynamicBenchmarks } from "./scoring";
import { getCachedEtfs, setCachedEtfs } from "./cache";
import { getCatalog, extractIssuer } from "./etf-catalog";
import { resolveAllMetadata } from "./data-resolver";
import { getActiveDealsForIssuer } from "./broker-partnerships";

// ─────────────────────────────────────────────────────────────────────────────
// Validation — garde-fous pour les données financières
// ─────────────────────────────────────────────────────────────────────────────

/** Vérifie qu'un rendement annualisé est dans une plage réaliste, sinon null. */
function validateReturn(value: number | null, ticker: string, label: string): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < -0.90 || value > 2.0) {
    console.warn(`[ETF data] Rendement ${label} hors plage pour ${ticker}: ${value}. Ignoré.`);
    return null;
  }
  return value;
}

/** Vérifie qu'un drawdown est entre -1 et 0. */
function validateDrawdown(value: number | null, ticker: string): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value > 0 || value < -1) {
    console.warn(`[ETF data] Drawdown hors plage pour ${ticker}: ${value}. Ignoré.`);
    return null;
  }
  return value;
}

/** Vérifie qu'une volatilité est positive et réaliste. */
function validateVolatility(value: number | null, ticker: string): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 2.0) {
    console.warn(`[ETF data] Volatilité hors plage pour ${ticker}: ${value}. Ignorée.`);
    return null;
  }
  return value;
}

/** Vérifie qu'un ratio de Sharpe est réaliste. */
function validateSharpe(value: number | null, ticker: string): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < -5 || value > 5) {
    console.warn(`[ETF data] Sharpe hors plage pour ${ticker}: ${value}. Ignoré.`);
    return null;
  }
  return value;
}

// globalThis pour survivre au HMR de Turbopack en dev
const g = globalThis as unknown as {
  __pendingRefresh?: Promise<EtfRankedEntry[]> | null;
  __priceCache?: Map<string, { data: PricePoint[]; timestamp: number }>;
};

export async function getAllEtfsRanked(): Promise<EtfRankedEntry[]> {
  const cached = getCachedEtfs();
  if (cached) return cached;

  if (!g.__pendingRefresh) {
    g.__pendingRefresh = refreshAllEtfs().finally(() => {
      g.__pendingRefresh = null;
    });
  }
  return g.__pendingRefresh;
}

export async function refreshAllEtfs(): Promise<EtfRankedEntry[]> {
  const catalog = await getCatalog();
  const tickers = catalog.map((e) => e.yahooTicker);

  // ── Étape 1 : récupérer toutes les données en parallèle ──────────────
  const [quotes, allPrices] = await Promise.all([
    fetchAllEtfQuotes(tickers),
    fetchAllHistoricalPrices(tickers, 5),
  ]);

  // ── Étape 2 : résolution multi-sources (JustETF + BoursoBank + Yahoo) ─
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedQuotes = quotes as Map<string, Record<string, any> | null>;
  const resolvedMap = await resolveAllMetadata({
    catalog,
    yahooQuotes: typedQuotes,
  });

  // ── Étape 3 : construire les entrées enrichies (passe 1 — données brutes) ─
  type PreScoredEntry = {
    catalogEntry: PeaEtfCatalogEntry;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote: Record<string, any> | null;
    r1y: number | null; r3y: number | null; r5y: number | null; r10y: number | null;
    ytd: number | null; mdd: number | null; vol: number | null; sr: number | null;
    aum: number | null;
    dataSources: DataProvenance | undefined;
  };
  const preScoredEntries: PreScoredEntry[] = [];

  for (const base of catalog) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = quotes.get(base.yahooTicker) as Record<string, any> | null | undefined;
    const prices = allPrices.get(base.yahooTicker) || [];

    if (!quote && prices.length === 0) {
      console.warn(`[ETF catalog] Skipping ${base.yahooTicker} (${base.isin}): aucune donnée disponible`);
      continue;
    }

    // Noms depuis Yahoo Finance
    const rawLongName: string = quote?.longName ?? quote?.shortName ?? "";
    const rawShortName: string = quote?.shortName ?? "";
    const isRedirectName = (s: string) => /^\*\*\s*SEE\b/i.test(s);
    const longName: string = isRedirectName(rawLongName) || !rawLongName
      ? (isRedirectName(rawShortName) || !rawShortName ? base.yahooTicker : rawShortName)
      : rawLongName;
    const shortName: string = isRedirectName(rawShortName) || !rawShortName
      ? longName.substring(0, 50)
      : rawShortName;

    // TER et AUM depuis le résolveur multi-sources
    const resolved = resolvedMap.get(base.isin);
    const ter = resolved?.ter ?? base.ter;
    const aum = resolved?.aum ?? null;
    const dataSources = resolved?.sources;

    // Calculs de performance depuis les prix historiques Yahoo
    const r1y = validateReturn(annualizedReturn(prices, 1), base.yahooTicker, "1y");
    const r3y = validateReturn(annualizedReturn(prices, 3), base.yahooTicker, "3y");
    const r5y = validateReturn(annualizedReturn(prices, 5), base.yahooTicker, "5y");
    const r10y: number | null = null; // Nécessite 10 ans de prix — disponible via /api/etf/[isin]
    const mdd = validateDrawdown(prices.length > 0 ? maxDrawdown(prices) : null, base.yahooTicker);
    const vol = validateVolatility(annualizedVolatility(prices), base.yahooTicker);
    const perfForSharpe = r5y ?? r3y ?? r1y;
    const sr = validateSharpe(sharpeRatio(perfForSharpe, vol), base.yahooTicker);
    const ytd = validateReturn(ytdReturn(prices), base.yahooTicker, "YTD");

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

    preScoredEntries.push({
      catalogEntry,
      quote: quote ?? null,
      r1y, r3y, r5y, r10y, ytd, mdd, vol, sr, aum, dataSources,
    });
  }

  // ── Étape 4 : benchmarks dynamiques (percentiles P10/P90 des données réelles) ─
  const scoringInputs = preScoredEntries.map((e) => ({
    ter: e.catalogEntry.ter,
    return5y: e.r5y, return3y: e.r3y, return1y: e.r1y,
    aum: e.aum, sharpeRatio: e.sr, maxDrawdown: e.mdd,
    leveraged: e.catalogEntry.leveraged,
  }));
  const benchmarks = computeDynamicBenchmarks(scoringInputs);

  // ── Étape 5 : scoring avec benchmarks adaptatifs ────────────────────────
  const entries: EtfRankedEntry[] = [];

  for (const pre of preScoredEntries) {
    const { catalogEntry, quote, r1y, r3y, r5y, r10y, ytd, mdd, sr, vol, aum, dataSources } = pre;

    const { score, breakdown } = computeScore({
      ter: catalogEntry.ter,
      return5y: r5y,
      return3y: r3y,
      return1y: r1y,
      aum,
      sharpeRatio: sr,
      maxDrawdown: mdd,
      leveraged: catalogEntry.leveraged,
    }, benchmarks);

    const deals = getActiveDealsForIssuer(catalogEntry.issuer);

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
      dataSources,
      brokerDeals: deals.length > 0 ? deals : undefined,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => (e.rank = i + 1));

  // Diagnostic : résumé de la qualité des données après enrichissement
  const withAum = entries.filter((e) => e.aum !== null).length;
  const withR1y = entries.filter((e) => e.return1y !== null).length;
  const withR5y = entries.filter((e) => e.return5y !== null).length;
  const withSharpe = entries.filter((e) => e.sharpeRatio !== null).length;
  const avgTer = entries.reduce((s, e) => s + e.ter, 0) / entries.length;
  console.info(
    `[ETF data] Refresh terminé : ${entries.length}/${catalog.length} ETF chargés | ` +
    `AUM: ${withAum}/${entries.length} | Perf 1a: ${withR1y} | Perf 5a: ${withR5y} | ` +
    `Sharpe: ${withSharpe} | TER moy: ${(avgTer * 100).toFixed(2)} %`
  );

  setCachedEtfs(entries);
  return entries;
}

export function getEtfByIsin(etfs: EtfRankedEntry[], isin: string): EtfRankedEntry | undefined {
  return etfs.find((e) => e.isin === isin);
}

// Cache des historiques de prix par ticker (TTL 1h)
const PRICE_CACHE_MS = 60 * 60 * 1000;

function getPriceCache() {
  if (!g.__priceCache) g.__priceCache = new Map();
  return g.__priceCache;
}

/** Pre-warm the historical price cache for a given ticker. Used by the refresh cron. */
export function setHistoricalPriceCache(ticker: string, prices: PricePoint[]): void {
  const cache = getPriceCache();
  cache.set(ticker, { data: prices, timestamp: Date.now() });
}

export async function getHistoricalPricesForIsin(isin: string, years: number = 10): Promise<PricePoint[]> {
  const catalog = await getCatalog();
  const etf = catalog.find((e) => e.isin === isin);
  if (!etf) return [];

  const cache = getPriceCache();
  const cached = cache.get(etf.yahooTicker);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_MS) {
    return cached.data;
  }

  const { fetchHistoricalPrices } = await import("./yahoo-finance");
  const data = await fetchHistoricalPrices(etf.yahooTicker, years);
  cache.set(etf.yahooTicker, { data, timestamp: Date.now() });
  return data;
}
