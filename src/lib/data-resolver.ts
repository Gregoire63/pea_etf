/**
 * Résolveur multi-sources — croise JustETF, Yahoo Finance et
 * le catalogue statique pour obtenir les données les plus fiables possibles.
 *
 * Chaîne de priorité :
 *   TER → JustETF > Yahoo (fraction décimale) > Catalogue
 *   AUM → JustETF > Yahoo > null
 */

import type { DataSourceName, DataProvenance } from "@/types/etf";
import type { BaseCatalogEntry } from "./etf-catalog";
import type { JustEtfData } from "./justetf";
import { getAllJustEtfData } from "./justetf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedMetadata {
  /** TER en fraction décimale (ex: 0.0020 = 0.20 %) */
  ter: number;
  /** Encours en EUR (null si inconnu) */
  aum: number | null;
  /** Provenance de chaque champ */
  sources: DataProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Résolution pour un ETF unique
// ─────────────────────────────────────────────────────────────────────────────

function isValidTer(v: number | undefined): v is number {
  return v !== undefined && v >= 0.0001 && v <= 0.05;
}

interface SourceInputs {
  base: BaseCatalogEntry;
  justEtf?: JustEtfData;
  /** Yahoo netExpenseRatio brut (fraction décimale, ex: 0.0020 pour 0.20 %) */
  yahooTerRaw?: number;
  /** Yahoo AUM (netAssets ou marketCap, déjà filtré >0) */
  yahooAum?: number | null;
}

function resolveOne(inputs: SourceInputs): ResolvedMetadata {
  const { base, justEtf, yahooTerRaw, yahooAum } = inputs;

  // ── Résolution TER ──────────────────────────────────────────────────────
  let ter: number = base.ter;
  let terSource: DataSourceName = "catalog";

  // Priorité 1 : JustETF
  if (isValidTer(justEtf?.ter)) {
    ter = justEtf!.ter!;
    terSource = "justetf";
  }
  // Priorité 2 : Yahoo Finance (déjà en fraction décimale)
  else if (yahooTerRaw != null && yahooTerRaw > 0 && isValidTer(yahooTerRaw)) {
    ter = yahooTerRaw;
    terSource = "yahoo";
  }
  // Sinon : fallback catalogue (terSource reste "catalog")

  // ── Résolution AUM ──────────────────────────────────────────────────────
  let aum: number | null = null;
  let aumSource: DataSourceName = "catalog";

  // Priorité 1 : JustETF
  if (justEtf?.fundSizeEur != null && justEtf.fundSizeEur > 0) {
    aum = justEtf.fundSizeEur;
    aumSource = "justetf";
  }
  // Priorité 2 : Yahoo Finance
  else if (yahooAum != null && yahooAum > 0) {
    aum = yahooAum;
    aumSource = "yahoo";
  }

  return {
    ter,
    aum,
    sources: { ter: terSource, aum: aumSource },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Résolution batch
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolveAllInputs {
  catalog: BaseCatalogEntry[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yahooQuotes: Map<string, Record<string, any> | null>;
}

export async function resolveAllMetadata(
  inputs: ResolveAllInputs
): Promise<Map<string, ResolvedMetadata>> {
  const { catalog, yahooQuotes } = inputs;
  const isins = catalog.map((e) => e.isin);

  // ── JustETF est la seule source bloquante ──────────────────────────────
  const justEtfMap = await getAllJustEtfData(isins).catch((err) => {
    console.warn("[data-resolver] JustETF indisponible:", err);
    return new Map<string, JustEtfData>();
  });

  // Résoudre chaque ETF avec JustETF + Yahoo
  const results = new Map<string, ResolvedMetadata>();
  const sourceStats: Record<DataSourceName, number> = { justetf: 0, boursobank: 0, yahoo: 0, catalog: 0 };

  for (const base of catalog) {
    const quote = yahooQuotes.get(base.yahooTicker);
    const yahooTerRaw = quote?.netExpenseRatio as number | undefined;
    const rawNetAssets = quote?.netAssets as number | undefined;
    const rawMarketCap = quote?.marketCap as number | undefined;
    const yahooAum =
      (rawNetAssets && rawNetAssets > 0 ? rawNetAssets : undefined) ??
      (rawMarketCap && rawMarketCap > 0 ? rawMarketCap : undefined) ??
      null;

    const resolved = resolveOne({
      base,
      justEtf: justEtfMap.get(base.isin),
      yahooTerRaw,
      yahooAum,
    });

    results.set(base.isin, resolved);
    sourceStats[resolved.sources.ter]++;
  }

  console.info(
    `[data-resolver] TER sources : ` +
    `JustETF=${sourceStats.justetf}, Yahoo=${sourceStats.yahoo}, Catalogue=${sourceStats.catalog}`
  );

  return results;
}
