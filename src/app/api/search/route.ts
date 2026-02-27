import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await yf.search(q, {
      newsCount: 0,
      enableFuzzyQuery: true,
    });

    // Filtrer uniquement les ETF (priorité aux .PA)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etfs = (raw?.quotes ?? []).filter((r: any) => r.quoteType === "ETF");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = etfs.slice(0, 12).map((r: any) => ({
      symbol: r.symbol ?? "",
      shortname: r.shortname ?? r.longname ?? "",
      exchange: r.exchange ?? "",
      // Indicateur si c'est un ETF sur Euronext Paris (potentiellement PEA-eligible)
      isParis: (r.symbol ?? "").endsWith(".PA"),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
