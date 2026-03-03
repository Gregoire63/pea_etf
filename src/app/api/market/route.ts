import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface MarketIndex {
  symbol: string;
  label: string;
  currency: string;
  type: "index" | "etf" | "currency";
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

const INDICES = [
  // Indices majeurs
  { symbol: "^FCHI", label: "CAC 40", currency: "EUR", type: "index" as const },
  { symbol: "^GSPC", label: "S&P 500", currency: "USD", type: "index" as const },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50", currency: "EUR", type: "index" as const },
  { symbol: "^NDX", label: "Nasdaq 100", currency: "USD", type: "index" as const },
  // ETFs PEA de référence
  { symbol: "LCWD.PA", label: "MSCI World", currency: "EUR", type: "etf" as const },
  { symbol: "PAEEM.PA", label: "Emerging Mkts", currency: "EUR", type: "etf" as const },
  // Devises
  { symbol: "EURUSD=X", label: "EUR/USD", currency: "", type: "currency" as const },
  { symbol: "EURGBP=X", label: "EUR/GBP", currency: "", type: "currency" as const },
];

let cache: { data: MarketIndex[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const results = await Promise.all(
      INDICES.map(async (idx): Promise<MarketIndex> => {
        try {
          const quote = await yf.quote(idx.symbol);
          return {
            ...idx,
            price: quote.regularMarketPrice ?? null,
            change: quote.regularMarketChange ?? null,
            changePercent: quote.regularMarketChangePercent ?? null,
            dayHigh: quote.regularMarketDayHigh ?? null,
            dayLow: quote.regularMarketDayLow ?? null,
            previousClose: quote.regularMarketPreviousClose ?? null,
            volume: quote.regularMarketVolume ?? null,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
          };
        } catch {
          return {
            ...idx,
            price: null, change: null, changePercent: null,
            dayHigh: null, dayLow: null, previousClose: null,
            volume: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null,
          };
        }
      })
    );

    cache = { data: results, ts: Date.now() };
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Impossible de récupérer les données marché" }, { status: 500 });
  }
}
