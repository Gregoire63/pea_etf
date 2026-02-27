import { getAllEtfsRanked } from "@/lib/etf-data";
import { CompareClient } from "./compare-client";
import type { EtfRankedEntry } from "@/types/etf";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  let etfs: EtfRankedEntry[] = [];
  try {
    etfs = await getAllEtfsRanked();
  } catch {
    etfs = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Comparer des ETF
        </h1>
        <p className="text-muted-foreground">
          Selectionnez 2 a 3 ETF pour les comparer cote a cote.
        </p>
      </div>
      <CompareClient allEtfs={etfs} />
    </div>
  );
}
