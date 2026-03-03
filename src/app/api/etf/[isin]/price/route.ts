import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getCatalog } from "@/lib/etf-catalog";

export const dynamic = "force-dynamic";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Per-ticker price cache — 2 min TTL (same pattern as /api/market)
const CACHE_MS = 2 * 60 * 1000;

interface PriceData {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  timestamp: string;
}

const priceCache = new Map<string, { data: PriceData; ts: number }>();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ isin: string }> },
) {
  const { isin } = await params;

  // Resolve ISIN → Yahoo ticker via catalog (cached 24h, instant when warm)
  const catalog = await getCatalog();
  const entry = catalog.find((e) => e.isin === isin);
  if (!entry) {
    return NextResponse.json(
      { error: "ETF not found in catalog" },
      { status: 404 },
    );
  }

  const { yahooTicker } = entry;

  // Serve from cache if fresh
  const cached = priceCache.get(yahooTicker);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const quote = await yf.quote(yahooTicker);
    const data: PriceData = {
      price: quote.regularMarketPrice ?? null,
      change: quote.regularMarketChange ?? null,
      changePercent: quote.regularMarketChangePercent ?? null,
      dayHigh: quote.regularMarketDayHigh ?? null,
      dayLow: quote.regularMarketDayLow ?? null,
      previousClose: quote.regularMarketPreviousClose ?? null,
      volume: quote.regularMarketVolume ?? null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
      timestamp: new Date().toISOString(),
    };

    priceCache.set(yahooTicker, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[Price] Error fetching ${yahooTicker}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch price data" },
      { status: 500 },
    );
  }
}
