import { NextResponse } from "next/server";
import { scrapeBoursobank } from "@/lib/boursobank";

// Cache in-mémoire : 5 minutes par ticker
const cache = new Map<string, { data: Awaited<ReturnType<typeof scrapeBoursobank>>; ts: number }>();
const CACHE_MS = 5 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  if (!ticker) {
    return NextResponse.json({ error: "Ticker manquant" }, { status: 400 });
  }

  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json(cached.data);
  }

  const data = await scrapeBoursobank(ticker);
  cache.set(ticker, { data, ts: Date.now() });
  return NextResponse.json(data);
}
