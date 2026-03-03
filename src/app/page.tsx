import { getCatalog } from "@/lib/etf-catalog";
import { refreshAllEtfs } from "@/lib/etf-data";
import { MarketSummary } from "@/components/dashboard/market-summary";
import { EtfSearchLive } from "@/components/dashboard/etf-search-live";
import { EtfRankingLive } from "@/components/dashboard/etf-ranking-live";
import type { EtfRankedEntry } from "@/types/etf";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classement ETF PEA",
  description:
    "Classement complet des ETF éligibles PEA en France, triés par score composite intégrant performance, frais, encours et ratio de Sharpe.",
};

// ISR : page servie depuis le cache, re-générée en background par le cron hebdomadaire
export const revalidate = 604800; // 7 jours (fallback si le cron rate)

export default async function DashboardPage() {
  const catalog = await getCatalog();

  // En production : charger les données complètes côté serveur (pré-rendu ISR)
  // En dev : skip (trop lent ~2 min), fallback SSE streaming côté client
  let serverEtfs: EtfRankedEntry[] | null = null;
  if (process.env.NODE_ENV === "production") {
    try {
      serverEtfs = await refreshAllEtfs();
    } catch {
      // Fallback : SSE streaming côté client
    }
  }

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

      {/* Marchés en temps réel — client-side */}
      <MarketSummary />

      {/* En prod : données pré-rendues (chargement instantané)
          En dev : SSE streaming progressif */}
      <EtfRankingLive catalog={catalog} serverEtfs={serverEtfs} />
    </div>
  );
}
