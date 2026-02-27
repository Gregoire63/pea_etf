import { NextResponse } from "next/server";
import { getAllEtfsRanked, getEtfByIsin, getHistoricalPricesForIsin } from "@/lib/etf-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ isin: string }> }
) {
  try {
    const { isin } = await params;
    const etfs = await getAllEtfsRanked();
    const etf = getEtfByIsin(etfs, isin);

    if (!etf) {
      return NextResponse.json({ error: "ETF not found" }, { status: 404 });
    }

    const historicalPrices = await getHistoricalPricesForIsin(isin, 10);

    return NextResponse.json({ etf, historicalPrices });
  } catch (error) {
    console.error("Error fetching ETF detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETF data" },
      { status: 500 }
    );
  }
}
