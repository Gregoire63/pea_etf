import { NextResponse } from "next/server";
import { refreshAllEtfs } from "@/lib/etf-data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const etfs = await refreshAllEtfs();
    return NextResponse.json({
      success: true,
      count: etfs.length,
      timestamp: new Date().toISOString(),
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
export async function GET() {
  return POST();
}
