import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAllEtfs } from "@/lib/etf-data";
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

    // 3. Revalider les pages ISR pour qu'elles utilisent les nouvelles données
    revalidatePath("/");
    revalidatePath("/etf/[isin]", "page");
    revalidatePath("/compare");

    return NextResponse.json({
      success: true,
      count: etfs.length,
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
