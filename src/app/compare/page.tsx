import { Suspense } from "react";
import { getAllEtfsRanked } from "@/lib/etf-data";
import { CompareClient } from "./compare-client";
import type { EtfRankedEntry } from "@/types/etf";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Comparer des ETF PEA",
  description:
    "Comparez côte à côte 2 à 3 ETF éligibles PEA : performance, frais, volatilité, score composite et historique de prix.",
};

async function CompareSection() {
  let etfs: EtfRankedEntry[] = [];
  try {
    etfs = await getAllEtfsRanked();
  } catch {}
  return <CompareClient allEtfs={etfs} />;
}

export default function ComparePage() {
  return (
    <div className="space-y-6">
      {/* En-tête immédiat */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comparer des ETF</h1>
        <p className="text-muted-foreground">
          Sélectionnez 2 à 3 ETF pour les comparer côte à côte.
        </p>
      </div>

      {/* Contenu streamé */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        }
      >
        <CompareSection />
      </Suspense>
    </div>
  );
}
