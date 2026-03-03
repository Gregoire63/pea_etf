import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAllEtfs, setHistoricalPriceCache } from "@/lib/etf-data";
import { fetchAllHistoricalPrices } from "@/lib/yahoo-finance";
import { clearCache, getCacheTimestamp } from "@/lib/cache";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: Request): boolean {
  if (!CRON_SECRET) return true; // no secret configured → allow (dev)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Vider le cache in-memory pour forcer un re-fetch complet
    clearCache();

    // 2. Re-fetch toutes les données (Yahoo + JustETF + BoursoBank)
    const etfs = await refreshAllEtfs();
    const timestamp = getCacheTimestamp() ?? new Date().toISOString();

    // 3. Pré-chauffer les prix historiques (10 ans) pour toutes les pages détail
    const tickers = etfs.map((e) => e.yahooTicker);
    const allPrices = await fetchAllHistoricalPrices(tickers, 10);
    let priceWarmCount = 0;
    for (const [ticker, prices] of allPrices) {
      if (prices.length > 0) {
        setHistoricalPriceCache(ticker, prices);
        priceWarmCount++;
      }
    }
    console.info(
      `[Refresh] Pre-warmed historical prices for ${priceWarmCount}/${tickers.length} ETFs`,
    );

    // 4. Revalider les pages ISR pour qu'elles utilisent les nouvelles données
    revalidatePath("/");
    revalidatePath("/etf/[isin]", "page");
    revalidatePath("/compare");

    return NextResponse.json({
      success: true,
      count: etfs.length,
      pricesWarmed: priceWarmCount,
      timestamp,
    });
  } catch (error) {
    console.error("Error refreshing ETF data:", error);
    return NextResponse.json(
      { error: "Failed to refresh data" },
      { status: 500 }
    );
  }
}

// Vercel Cron calls GET
export async function GET(request: Request) {
  return POST(request);
}
