import { NextResponse } from "next/server";
import { getAllEtfsRanked } from "@/lib/etf-data";
import type { EtfCategory } from "@/types/etf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as EtfCategory | null;
    const distribution = searchParams.get("distribution");
    const minAum = searchParams.get("minAum");
    const maxTer = searchParams.get("maxTer");

    let etfs = await getAllEtfsRanked();

    if (category) etfs = etfs.filter((e) => e.category === category);
    if (distribution) etfs = etfs.filter((e) => e.distribution === distribution);
    if (minAum) etfs = etfs.filter((e) => (e.aum ?? 0) >= Number(minAum));
    if (maxTer) etfs = etfs.filter((e) => e.ter <= Number(maxTer));

    return NextResponse.json({
      etfs,
      lastUpdated: etfs[0]?.lastUpdated ?? new Date().toISOString(),
      totalCount: etfs.length,
    });
  } catch (error) {
    console.error("Error fetching ETFs:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETF data" },
      { status: 500 }
    );
  }
}
