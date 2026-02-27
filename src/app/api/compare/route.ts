import { NextResponse } from "next/server";
import { getAllEtfsRanked, getHistoricalPricesForIsin } from "@/lib/etf-data";
import type { PricePoint } from "@/types/etf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isinsParam = searchParams.get("isins");

    if (!isinsParam) {
      return NextResponse.json({ error: "Missing isins parameter" }, { status: 400 });
    }

    const isins = isinsParam.split(",").slice(0, 3);
    const allEtfs = await getAllEtfsRanked();
    const etfs = isins
      .map((isin) => allEtfs.find((e) => e.isin === isin))
      .filter(Boolean);

    const historicalPrices: Record<string, PricePoint[]> = {};
    for (const isin of isins) {
      historicalPrices[isin] = await getHistoricalPricesForIsin(isin, 5);
    }

    return NextResponse.json({ etfs, historicalPrices });
  } catch (error) {
    console.error("Error comparing ETFs:", error);
    return NextResponse.json(
      { error: "Failed to compare ETFs" },
      { status: 500 }
    );
  }
}
