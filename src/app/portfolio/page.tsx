import { getAllEtfsRanked } from "@/lib/etf-data";
import { PortfolioClient } from "./portfolio-client";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const etfs = await getAllEtfsRanked();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Portfolio</h1>
        <p className="text-muted-foreground">
          Stratégie personnalisée et projection jusqu&apos;à la retraite.
        </p>
      </div>
      <PortfolioClient etfs={etfs} />
    </div>
  );
}
