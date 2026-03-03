import type { Metadata } from "next";
import { getCatalog } from "@/lib/etf-catalog";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { Badge } from "@/components/ui/badge";
import { EtfDetailLive } from "./etf-detail-live";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

/**
 * Pré-génère les pages ETF au build. Si Euronext est inaccessible au build,
 * retourne [] et les pages sont rendues à la demande (ISR).
 */
export async function generateStaticParams() {
  try {
    const catalog = await getCatalog();
    return catalog.map((etf) => ({ isin: etf.isin }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isin: string }>;
}): Promise<Metadata> {
  const { isin } = await params;

  const catalog = await getCatalog();
  const entry = catalog.find((e) => e.isin === isin);
  if (entry) {
    const ticker = entry.yahooTicker.replace(".PA", "");
    return {
      title: `${ticker} — ETF PEA`,
      description: `Fiche détaillée ${ticker} (${isin}) — TER ${(entry.ter * 100).toFixed(2)}% · ${entry.distribution} · ${entry.category}. Analyse complète ETF éligible PEA.`,
    };
  }

  return { title: "ETF introuvable" };
}

export default async function EtfDetailPage({
  params,
}: {
  params: Promise<{ isin: string }>;
}) {
  const { isin } = await params;

  // Données catalogue uniquement (instantané, pas de fetch externe bloquant)
  const catalog = await getCatalog();
  const catalogEntry = catalog.find((e) => e.isin === isin);

  if (!catalogEntry) {
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

  const ticker = catalogEntry.yahooTicker.replace(".PA", "");

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour au classement
      </Link>

      {/* ── Badges catalogue — s'affichent immédiatement ────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={catalogEntry.category} />
        {catalogEntry.leveraged && (
          <Badge variant="destructive">Levier x{catalogEntry.leverageMultiplier}</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {ticker} · {isin}
        </span>
      </div>

      {/* ── Contenu dynamique (client-side : header + métriques + chart) */}
      <EtfDetailLive
        isin={isin}
        ticker={ticker}
        catalogTer={catalogEntry.ter}
        catalogDistribution={catalogEntry.distribution}
        catalogReplication={catalogEntry.replication}
        catalogIndex={catalogEntry.index}
      />
    </div>
  );
}
