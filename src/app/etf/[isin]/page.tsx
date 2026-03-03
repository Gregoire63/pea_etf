import type { Metadata } from "next";
import { SEED_CATALOG } from "@/lib/etf-catalog";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { Badge } from "@/components/ui/badge";
import { EtfDetailLive } from "./etf-detail-live";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

/**
 * generateStaticParams désactivé — les pages sont rendues à la demande (ISR).
 * En dev, getCatalog() prenait ~16s (Euronext + JustETF) et bloquait chaque navigation.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isin: string }>;
}): Promise<Metadata> {
  const { isin } = await params;

  // Lookup instantané dans le seed catalog (pas de fetch externe)
  const entry = SEED_CATALOG.find((e) => e.isin === isin);
  if (entry) {
    const ticker = entry.yahooTicker.replace(".PA", "");
    return {
      title: `${ticker} — ETF PEA`,
      description: `Fiche détaillée ${ticker} (${isin}) — TER ${(entry.ter * 100).toFixed(2)}% · ${entry.distribution} · ${entry.category}. Analyse complète ETF éligible PEA.`,
    };
  }

  // ETF hors seed : titre générique, le client enrichira
  return {
    title: `${isin} — ETF PEA`,
    description: `Fiche détaillée ETF éligible PEA — ISIN ${isin}.`,
  };
}

export default async function EtfDetailPage({
  params,
}: {
  params: Promise<{ isin: string }>;
}) {
  const { isin } = await params;

  // Lookup instantané — aucun fetch réseau
  const catalogEntry = SEED_CATALOG.find((e) => e.isin === isin);
  const ticker = catalogEntry?.yahooTicker.replace(".PA", "") ?? isin;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour au classement
      </Link>

      {/* Badges catalogue (si disponible dans le seed) */}
      {catalogEntry && (
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={catalogEntry.category} />
          {catalogEntry.leveraged && (
            <Badge variant="destructive">Levier x{catalogEntry.leverageMultiplier}</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {ticker} · {isin}
          </span>
        </div>
      )}

      {/* Si pas dans le seed, afficher juste l'ISIN (le client chargera le reste) */}
      {!catalogEntry && (
        <div className="text-xs text-muted-foreground">{isin}</div>
      )}

      {/* Contenu dynamique (client-side : header + métriques + chart) */}
      <EtfDetailLive
        isin={isin}
        ticker={ticker}
        catalogTer={catalogEntry?.ter ?? 0}
        catalogDistribution={catalogEntry?.distribution ?? "ACC"}
        catalogReplication={catalogEntry?.replication ?? "Physical"}
        catalogIndex={catalogEntry?.index ?? ""}
      />
    </div>
  );
}
