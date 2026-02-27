import { Suspense } from "react";
import { getAllEtfsRanked } from "@/lib/etf-data";
import { EtfRankingTable } from "@/components/dashboard/etf-ranking-table";
import { MarketSummary } from "@/components/dashboard/market-summary";
import { EtfOverview } from "@/components/dashboard/etf-overview";
import { EtfSearchLive } from "@/components/dashboard/etf-search-live";
import type { EtfRankedEntry } from "@/types/etf";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Classement ETF PEA",
  description:
    "Classement complet des ETF éligibles PEA en France, triés par score composite intégrant performance, frais, encours et ratio de Sharpe.",
};

async function getEtfs(): Promise<EtfRankedEntry[]> {
  try {
    return await getAllEtfsRanked();
  } catch {
    return [];
  }
}

async function EtfOverviewSection() {
  const etfs = await getEtfs();
  if (etfs.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Aperçu du marché PEA</h2>
      <EtfOverview etfs={etfs} />
    </section>
  );
}

async function EtfRankingSection() {
  const etfs = await getEtfs();
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">
        Liste complète · {etfs.length} ETF
      </h2>
      <EtfRankingTable etfs={etfs} />
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* En-tête + recherche — s'affiche immédiatement */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classement ETF PEA</h1>
          <p className="text-muted-foreground">
            ETF éligibles PEA · classés par score composite.
          </p>
        </div>
        <EtfSearchLive />
      </div>

      {/* Marchés en temps réel — client-side, s'affiche dès que les données arrivent */}
      <MarketSummary />

      {/* Aperçu PEA — stream dès que les données ETF sont prêtes */}
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-lg border bg-muted" />
              <div className="h-64 animate-pulse rounded-lg border bg-muted" />
            </div>
          </div>
        }
      >
        <EtfOverviewSection />
      </Suspense>

      {/* Tableau complet — stream indépendamment */}
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-12 animate-pulse rounded-md border bg-muted/40" />
            <div className="overflow-hidden rounded-lg border">
              <div className="h-11 border-b bg-muted/30" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 border-b bg-muted/20 last:border-0" />
              ))}
            </div>
          </div>
        }
      >
        <EtfRankingSection />
      </Suspense>
    </div>
  );
}
