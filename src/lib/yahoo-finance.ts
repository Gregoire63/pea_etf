import yahooFinance from "yahoo-finance2";
import type { PricePoint } from "@/types/etf";

const BATCH_SIZE = 5;
const DELAY_MS = 1200;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchEtfQuote(yahooTicker: string) {
  try {
    return await yahooFinance.quote(yahooTicker);
  } catch (error) {
    console.error(`Failed to fetch quote for ${yahooTicker}:`, error);
    return null;
  }
}

export async function fetchHistoricalPrices(
  yahooTicker: string,
  yearsBack: number = 10
): Promise<PricePoint[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - yearsBack);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.chart(yahooTicker, {
      period1: startDate,
      period2: endDate,
      interval: "1wk",
    });

    const quotes = result.quotes || [];
    return quotes
      .filter((q: { close?: number; date?: Date }) => q.close != null && q.date != null)
      .map((q: { close: number; date: Date }) => ({
        date: q.date.toISOString().split("T")[0],
        close: q.close,
      }));
  } catch (error) {
    console.error(`Failed to fetch history for ${yahooTicker}:`, error);
    return [];
  }
}

export async function fetchAllEtfQuotes(
  yahooTickers: string[]
): Promise<Map<string, Awaited<ReturnType<typeof yahooFinance.quote>> | null>> {
  const results = new Map<string, Awaited<ReturnType<typeof yahooFinance.quote>> | null>();

  for (let i = 0; i < yahooTickers.length; i += BATCH_SIZE) {
    const batch = yahooTickers.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (ticker) => {
      try {
        const quote = await yahooFinance.quote(ticker);
        results.set(ticker, quote);
      } catch (error) {
        console.error(`Failed to fetch ${ticker}:`, error);
        results.set(ticker, null);
      }
    });
    await Promise.all(promises);

    if (i + BATCH_SIZE < yahooTickers.length) {
      await delay(DELAY_MS);
    }
  }

  return results;
}

export async function fetchAllHistoricalPrices(
  yahooTickers: string[],
  yearsBack: number = 10
): Promise<Map<string, PricePoint[]>> {
  const results = new Map<string, PricePoint[]>();

  for (let i = 0; i < yahooTickers.length; i += BATCH_SIZE) {
    const batch = yahooTickers.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (ticker) => {
      const prices = await fetchHistoricalPrices(ticker, yearsBack);
      results.set(ticker, prices);
    });
    await Promise.all(promises);

    if (i + BATCH_SIZE < yahooTickers.length) {
      await delay(DELAY_MS);
    }
  }

  return results;
}
