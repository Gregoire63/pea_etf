import { getAllEtfsRanked } from "@/lib/etf-data";
import { PortfolioClient } from "./portfolio-client";
import type { EtfRankedEntry } from "@/types/etf";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Mon Portfolio PEA",
  description:
    "Stratégie ETF personnalisée et projection de votre patrimoine PEA jusqu'à la retraite, basée sur votre profil investisseur.",
};

export default function PortfolioPage() {
  // Démarre le fetch immédiatement mais sans l'attendre :
  // le profil et la projection s'affichent instantanément,
  // seule la section Stratégie ETF attend les données.
  const etfsPromise = getAllEtfsRanked().catch((): EtfRankedEntry[] => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Portfolio</h1>
        <p className="text-muted-foreground">
          Stratégie personnalisée et projection jusqu&apos;à la retraite.
        </p>
      </div>
      <PortfolioClient etfsPromise={etfsPromise} />
    </div>
  );
}
