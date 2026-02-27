import { getAllEtfsRanked, getEtfByIsin, getHistoricalPricesForIsin } from "@/lib/etf-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EtfScoreBadge } from "@/components/dashboard/etf-score-badge";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { EtfDetailChart } from "./chart";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(decimals)}%`;
}

function fmtAum(val: number | null): string {
  if (val === null) return "—";
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Md EUR`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} M EUR`;
  return `${val.toLocaleString("fr-FR")} EUR`;
}

export default async function EtfDetailPage({
  params,
}: {
  params: Promise<{ isin: string }>;
}) {
  const { isin } = await params;
  const etfs = await getAllEtfsRanked();
  const etf = getEtfByIsin(etfs, isin);

  if (!etf) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-bold">ETF non trouve</h1>
        <p className="text-muted-foreground">ISIN : {isin}</p>
        <Link href="/" className="mt-4 inline-block text-primary underline">
          Retour au classement
        </Link>
      </div>
    );
  }

  const prices = await getHistoricalPricesForIsin(isin, 10);

  const metrics = [
    { label: "Prix actuel", value: etf.currentPrice ? `${etf.currentPrice.toFixed(2)} EUR` : "—" },
    { label: "TER", value: `${(etf.ter * 100).toFixed(2)}%` },
    { label: "Encours", value: fmtAum(etf.aum) },
    { label: "Distribution", value: etf.distribution },
    { label: "Replication", value: etf.replication },
    { label: "Indice", value: etf.index },
    { label: "YTD", value: fmt(etf.ytdReturn) },
    { label: "1 an", value: fmt(etf.return1y) },
    { label: "3 ans (ann.)", value: fmt(etf.return3y) },
    { label: "5 ans (ann.)", value: fmt(etf.return5y) },
    { label: "10 ans (ann.)", value: fmt(etf.return10y) },
    { label: "Max Drawdown", value: fmt(etf.maxDrawdown) },
    { label: "Volatilite", value: fmt(etf.volatility1y) },
    { label: "Sharpe Ratio", value: etf.sharpeRatio !== null ? etf.sharpeRatio.toFixed(2) : "—" },
  ];

  const breakdown = [
    { label: "TER", value: etf.scoreBreakdown.terScore, weight: "20%" },
    { label: "Performance", value: etf.scoreBreakdown.performanceScore, weight: "30%" },
    { label: "Encours", value: etf.scoreBreakdown.aumScore, weight: "15%" },
    { label: "Sharpe", value: etf.scoreBreakdown.sharpeScore, weight: "20%" },
    { label: "Drawdown", value: etf.scoreBreakdown.drawdownScore, weight: "15%" },
  ];

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour au classement
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{etf.shortName}</h1>
            <EtfScoreBadge score={etf.score} />
            <CategoryBadge category={etf.category} />
            {etf.leveraged && (
              <Badge variant="destructive">Levier x{etf.leverageMultiplier}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {etf.name} &middot; {etf.ticker} &middot; {etf.isin} &middot; {etf.issuer}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Rang</div>
          <div className="text-3xl font-bold">#{etf.rank}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="mt-1 text-lg font-semibold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Detail du score : {etf.score.toFixed(1)} / 100</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <div className="w-28 text-sm">{b.label} ({b.weight})</div>
                <div className="flex-1">
                  <div className="h-3 w-full rounded-full bg-muted">
                    <div
                      className="h-3 rounded-full bg-primary transition-all"
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                </div>
                <div className="w-10 text-right text-sm font-mono">{b.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {prices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique de prix</CardTitle>
          </CardHeader>
          <CardContent>
            <EtfDetailChart prices={prices} ticker={etf.ticker} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
