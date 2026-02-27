import type React from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllEtfsRanked, getEtfByIsin } from "@/lib/etf-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { EtfScoreBadge } from "@/components/dashboard/etf-score-badge";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { PriceChartSection } from "./price-chart-section";
import { BrokerLinksPanel } from "@/components/etf/broker-links-panel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isin: string }>;
}): Promise<Metadata> {
  const { isin } = await params;
  const etfs = await getAllEtfsRanked();
  const etf = getEtfByIsin(etfs, isin);

  if (!etf) return { title: "ETF introuvable" };

  const perf1y = etf.return1y !== null ? `${(etf.return1y * 100).toFixed(1)}%` : "—";
  const description = `${etf.name} (${etf.ticker}) — Score ${etf.score.toFixed(0)}/100 · TER ${(etf.ter * 100).toFixed(2)}% · Perf 1 an : ${perf1y}. Analyse complète ETF éligible PEA.`;

  return {
    title: etf.shortName,
    description,
    openGraph: {
      title: `${etf.shortName} — ETF PEA`,
      description,
    },
  };
}

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

  const metrics: { label: React.ReactNode; value: string }[] = [
    { label: "Prix actuel", value: etf.currentPrice ? `${etf.currentPrice.toFixed(2)} EUR` : "—" },
    {
      label: (
        <span className="flex items-center gap-0.5">
          TER
          <HintTooltip content="Total Expense Ratio — frais annuels de gestion déduits automatiquement de la valeur de l'ETF. Plus c'est bas, mieux c'est." />
        </span>
      ),
      value: `${(etf.ter * 100).toFixed(2)}%`,
    },
    {
      label: (
        <span className="flex items-center gap-0.5">
          Encours
          <HintTooltip content="Actifs sous gestion (AUM). Un encours élevé garantit une meilleure liquidité et des spreads bid/ask plus faibles." />
        </span>
      ),
      value: fmtAum(etf.aum),
    },
    {
      label: (
        <span className="flex items-center gap-0.5">
          Distribution
          <HintTooltip content="ACC (Capitalisant) : les dividendes sont réinvestis automatiquement. DIST (Distribuant) : les dividendes vous sont versés." />
        </span>
      ),
      value: etf.distribution,
    },
    {
      label: (
        <span className="flex items-center gap-0.5">
          Réplication
          <HintTooltip content="Physique : l'ETF achète directement les actions de l'indice. Synthétique (Swap) : réplication via des contrats dérivés — nécessaire pour l'éligibilité PEA des indices non-européens (MSCI World, S&P 500…)." />
        </span>
      ),
      value: etf.replication,
    },
    { label: "Indice", value: etf.index },
    {
      label: (
        <span className="flex items-center gap-0.5">
          YTD
          <HintTooltip content="Year-to-Date — performance depuis le 1er janvier de l'année en cours." />
        </span>
      ),
      value: fmt(etf.ytdReturn),
    },
    { label: "1 an", value: fmt(etf.return1y) },
    { label: "3 ans (ann.)", value: fmt(etf.return3y) },
    { label: "5 ans (ann.)", value: fmt(etf.return5y) },
    { label: "10 ans (ann.)", value: fmt(etf.return10y) },
    {
      label: (
        <span className="flex items-center gap-0.5">
          Max Drawdown
          <HintTooltip content="Pire baisse enregistrée depuis un pic historique jusqu'au creux suivant. Mesure le risque maximal de perte en capital." />
        </span>
      ),
      value: fmt(etf.maxDrawdown),
    },
    {
      label: (
        <span className="flex items-center gap-0.5">
          Volatilité
          <HintTooltip content="Volatilité annualisée — écart-type des rendements hebdomadaires × √52. Mesure l'amplitude des variations de prix." />
        </span>
      ),
      value: fmt(etf.volatility1y),
    },
    {
      label: (
        <span className="flex items-center gap-0.5">
          Sharpe Ratio
          <HintTooltip content="Ratio de Sharpe = rendement / volatilité. Mesure la performance ajustée au risque. Un ratio > 1 est considéré bon ; > 2 est excellent." />
        </span>
      ),
      value: etf.sharpeRatio !== null ? etf.sharpeRatio.toFixed(2) : "—",
    },
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
        {metrics.map((m, i) => (
          <Card key={i}>
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

      <Suspense fallback={<div className="h-80 animate-pulse rounded-lg border bg-muted" />}>
        <PriceChartSection isin={isin} ticker={etf.ticker} />
      </Suspense>

      <BrokerLinksPanel ticker={etf.ticker} isin={etf.isin} />
    </div>
  );
}
