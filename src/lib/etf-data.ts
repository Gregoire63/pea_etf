import peaEtfCatalog from "@/data/pea-etfs.json";
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

const catalog = peaEtfCatalog as PeaEtfCatalogEntry[];

export async function getAllEtfsRanked(): Promise<EtfRankedEntry[]> {
  const cached = getCachedEtfs();
  if (cached) return cached;

  return refreshAllEtfs();
}

export async function refreshAllEtfs(): Promise<EtfRankedEntry[]> {
  const tickers = catalog.map((e) => e.yahooTicker);

  const [quotes, allPrices] = await Promise.all([
    fetchAllEtfQuotes(tickers),
    fetchAllHistoricalPrices(tickers, 10),
  ]);

  const entries: EtfRankedEntry[] = [];

  for (const etf of catalog) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = quotes.get(etf.yahooTicker) as Record<string, any> | null | undefined;
    const prices = allPrices.get(etf.yahooTicker) || [];

    const r1y = annualizedReturn(prices, 1);
    const r3y = annualizedReturn(prices, 3);
    const r5y = annualizedReturn(prices, 5);
    const r10y = annualizedReturn(prices, 10);
    const mdd = prices.length > 0 ? maxDrawdown(prices) : null;
    const vol = annualizedVolatility(prices);
    const perfForSharpe = r5y ?? r3y ?? r1y;
    const sr = sharpeRatio(perfForSharpe, vol);
    const ytd = ytdReturn(prices);

    const aum: number | null = quote?.marketCap ?? null;

    const { score, breakdown } = computeScore({
      ter: etf.ter,
      return5y: r5y,
      return3y: r3y,
      return1y: r1y,
      aum,
      sharpeRatio: sr,
      maxDrawdown: mdd,
      leveraged: etf.leveraged,
    });

    entries.push({
      ...etf,
      isin: etf.isin,
      currentPrice: quote?.regularMarketPrice ?? null,
      aum,
      volume: quote?.regularMarketVolume ?? null,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
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

export async function getHistoricalPricesForIsin(isin: string, years: number = 10): Promise<PricePoint[]> {
  const etf = catalog.find((e) => e.isin === isin);
  if (!etf) return [];

  const { fetchHistoricalPrices } = await import("./yahoo-finance");
  return fetchHistoricalPrices(etf.yahooTicker, years);
}
