import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface MarketIndex {
  symbol: string;
  label: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

const INDICES = [
  { symbol: "^FCHI", label: "CAC 40", currency: "EUR" },
  { symbol: "^GSPC", label: "S&P 500", currency: "USD" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50", currency: "EUR" },
  { symbol: "LCWD.PA", label: "MSCI World PEA", currency: "EUR" },
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
          };
        } catch {
          return { ...idx, price: null, change: null, changePercent: null };
        }
      })
    );

    cache = { data: results, ts: Date.now() };
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Impossible de récupérer les données marché" }, { status: 500 });
  }
}
