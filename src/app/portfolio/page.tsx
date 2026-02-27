import { Suspense } from "react";
import { getAllEtfsRanked } from "@/lib/etf-data";
import { PortfolioClient } from "./portfolio-client";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Mon Portfolio PEA",
  description:
    "Stratégie ETF personnalisée et projection de votre patrimoine PEA jusqu'à la retraite, basée sur votre profil investisseur.",
};

async function PortfolioSection() {
  const etfs = await getAllEtfsRanked();
  return <PortfolioClient etfs={etfs} />;
}

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      {/* En-tête immédiat */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Portfolio</h1>
        <p className="text-muted-foreground">
          Stratégie personnalisée et projection jusqu&apos;à la retraite.
        </p>
      </div>

      {/* Contenu streamé dès que les données ETF sont disponibles */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-lg border bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded-lg border bg-muted" />
          </div>
        }
      >
        <PortfolioSection />
      </Suspense>
    </div>
  );
}
