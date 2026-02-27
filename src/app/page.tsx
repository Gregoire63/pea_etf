import { getAllEtfsRanked } from "@/lib/etf-data";
import { EtfRankingTable } from "@/components/dashboard/etf-ranking-table";
import { MarketSummary } from "@/components/dashboard/market-summary";
import { EtfOverview } from "@/components/dashboard/etf-overview";
import { EtfSearchLive } from "@/components/dashboard/etf-search-live";
import type { EtfRankedEntry } from "@/types/etf";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let etfs: EtfRankedEntry[] = [];
  try {
    etfs = await getAllEtfsRanked();
  } catch {
    etfs = [];
  }

  return (
    <div className="space-y-8">
      {/* En-tête + recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classement ETF PEA</h1>
          <p className="text-muted-foreground">
            {etfs.length} ETF éligibles PEA · classés par score composite.
          </p>
        </div>
        <EtfSearchLive />
      </div>

      {/* Marchés en temps réel */}
      <MarketSummary />

      {/* Aperçu global */}
      {etfs.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Aperçu du marché PEA</h2>
          <EtfOverview etfs={etfs} />
        </section>
      )}

      {/* Tableau complet */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Liste complète</h2>
        <EtfRankingTable etfs={etfs} />
      </section>
    </div>
  );
}
