/**
 * Découverte automatique d'ETFs PEA éligibles sur Euronext Paris.
 *
 * Pipeline :
 *  1. Euronext DataTables API → liste tous les ETFs cotés sur XPAR
 *  2. Filtrage PEA : heuristiques sur le nom + provider + type d'actif
 *  3. Catégorisation automatique basée sur l'indice répliqué
 *  4. Comparaison avec le catalogue dynamique → détection des manquants
 *  5. Enrichissement JustETF (TER, AUM, réplication, distribution)
 */

import { getCatalog, type BaseCatalogEntry } from "./etf-catalog";
import { scrapeJustEtf, type JustEtfData } from "./justetf";
import {
  fetchEuronextEtfs,
  detectCategory,
  computePeaConfidence,
  mapReplication,
  mapDistribution,
} from "./euronext";
import type { EtfCategory } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredEtf {
  isin: string;
  name: string;
  ticker: string;
  yahooTicker: string;
  /** Catégorie détectée automatiquement */
  category: EtfCategory | null;
  /** Indice répliqué (détecté depuis le nom) */
  detectedIndex: string | null;
  /** Score de confiance PEA (0-100) */
  peaConfidence: number;
  /** Raison du score de confiance */
  peaReason: string;
  /** Déjà dans le catalogue ? */
  inCatalog: boolean;
  /** Données JustETF (si enrichi) */
  justEtfData?: JustEtfData;
  /** Entrée catalogue suggérée */
  suggestedEntry?: BaseCatalogEntry;
}

export interface DiscoveryResult {
  /** Tous les ETFs trouvés sur Euronext Paris */
  totalEuronext: number;
  /** ETFs identifiés comme potentiellement PEA */
  peaCandidates: number;
  /** ETFs déjà dans le catalogue */
  alreadyInCatalog: number;
  /** ETFs manquants avec confiance élevée */
  missingHighConfidence: DiscoveredEtf[];
  /** ETFs manquants avec confiance moyenne */
  missingMediumConfidence: DiscoveredEtf[];
  /** Horodatage */
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrichissement JustETF
// ─────────────────────────────────────────────────────────────────────────────

async function enrichWithJustEtf(etfs: DiscoveredEtf[]): Promise<void> {
  const BATCH = 3;
  const DELAY = 1500;

  for (let i = 0; i < etfs.length; i += BATCH) {
    const batch = etfs.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((e) => scrapeJustEtf(e.isin)),
    );

    for (let j = 0; j < batch.length; j++) {
      const etf = batch[j];
      const data = results[j];
      etf.justEtfData = data;

      // Construire l'entrée catalogue suggérée
      if (!data.error && etf.category) {
        const replication = mapReplication(data.replication);
        const distribution = mapDistribution(data.distribution);
        const ter = data.ter ?? 0.003;

        etf.suggestedEntry = {
          isin: etf.isin,
          yahooTicker: etf.yahooTicker,
          category: etf.category,
          index: etf.detectedIndex ?? data.name ?? etf.name,
          ter,
          distribution,
          replication,
          leveraged: etf.category === "Leveraged",
        };
      }
    }

    if (i + BATCH < etfs.length) {
      await new Promise((r) => setTimeout(r, DELAY));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline principal
// ─────────────────────────────────────────────────────────────────────────────

export async function discoverMissingPeaEtfs(
  options: { enrichMissing?: boolean; minConfidence?: number } = {},
): Promise<DiscoveryResult> {
  const { enrichMissing = true, minConfidence = 40 } = options;

  // Récupérer le catalogue dynamique pour savoir ce qu'on a déjà
  const catalog = await getCatalog();
  const catalogIsins = new Set(catalog.map((e) => e.isin));

  // 1. Récupérer tous les ETFs sur Euronext Paris
  const euronextEtfs = await fetchEuronextEtfs();

  // 2. Analyser chaque ETF
  const allDiscovered: DiscoveredEtf[] = euronextEtfs.map((raw) => {
    const { category, index } = detectCategory(raw.name);
    const { confidence, reason } = computePeaConfidence(raw.name, raw.isin);

    return {
      isin: raw.isin,
      name: raw.name,
      ticker: raw.ticker,
      yahooTicker: raw.ticker ? `${raw.ticker}.PA` : "",
      category,
      detectedIndex: index,
      peaConfidence: confidence,
      peaReason: reason,
      inCatalog: catalogIsins.has(raw.isin),
    };
  });

  // 3. Filtrer : PEA candidates (confiance > seuil)
  const peaCandidates = allDiscovered.filter(
    (e) => e.peaConfidence >= minConfidence,
  );
  const alreadyInCatalog = peaCandidates.filter((e) => e.inCatalog);

  // 4. ETFs manquants
  const missing = peaCandidates.filter((e) => !e.inCatalog);
  const highConfidence = missing.filter((e) => e.peaConfidence >= 70);
  const mediumConfidence = missing.filter(
    (e) => e.peaConfidence >= 40 && e.peaConfidence < 70,
  );

  // 5. Enrichir les manquants à haute confiance avec JustETF
  if (enrichMissing && highConfidence.length > 0) {
    console.info(
      `[Discovery] Enrichissement JustETF de ${highConfidence.length} ETFs manquants…`,
    );
    await enrichWithJustEtf(highConfidence);
  }

  return {
    totalEuronext: euronextEtfs.length,
    peaCandidates: peaCandidates.length,
    alreadyInCatalog: alreadyInCatalog.length,
    missingHighConfidence: highConfidence,
    missingMediumConfidence: mediumConfidence,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Génération d'entrées catalogue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère le code TypeScript des entrées à ajouter au catalogue.
 * Utile pour la mise à jour manuelle ou l'affichage dans le rapport.
 */
export function generateCatalogEntries(etfs: DiscoveredEtf[]): string {
  const entries = etfs
    .filter((e) => e.suggestedEntry)
    .map((e) => {
      const s = e.suggestedEntry!;
      const pad = (str: string, len: number) => str.padEnd(len);
      return (
        `  { isin: "${s.isin}", yahooTicker: ${pad(`"${s.yahooTicker}",`, 14)} ` +
        `category: ${pad(`"${s.category}",`, 14)} ` +
        `index: ${pad(`"${s.index}",`, 40)} ` +
        `ter: ${String(s.ter).padEnd(8)}, distribution: "${s.distribution}",  ` +
        `replication: "${s.replication}", leveraged: ${s.leveraged} },`
      );
    });

  return entries.join("\n");
}
