/**
 * Catalogue dynamique des ETF PEA.
 *
 * Le catalogue est construit automatiquement à partir de l'API Euronext (ETFs
 * cotés sur XPAR) enrichis par JustETF. Un cache globalThis 24h évite de
 * re-scraper à chaque requête.
 *
 * SEED_CATALOG (7 ETFs essentiels) sert uniquement de fallback si Euronext
 * est inaccessible.
 */

import type { EtfCategory } from "@/types/etf";
import {
  fetchEuronextEtfs,
  detectCategory,
  computePeaConfidence,
  mapReplication,
  mapDistribution,
} from "./euronext";
import { scrapeJustEtf, type JustEtfData } from "./justetf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BaseCatalogEntry = {
  isin: string;
  /** Ticker Yahoo Finance (ex: WPEA.PA) */
  yahooTicker: string;
  category: EtfCategory;
  /** Indice répliqué */
  index: string;
  /** TER de référence (fallback si Yahoo Finance n'a pas la donnée) */
  ter: number;
  distribution: "ACC" | "DIST";
  replication: "Physical" | "Synthetic";
  leveraged: boolean;
  leverageMultiplier?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED_CATALOG — fallback si Euronext est inaccessible
// Correspond aux 7 ETFs utilisés dans FALLBACK_ETF de portfolio-strategy.ts
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_CATALOG: BaseCatalogEntry[] = [
  { isin: "IE0002XZSHO1", yahooTicker: "WPEA.PA",  category: "World",    index: "MSCI World",                   ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "IE000DQLYVB9", yahooTicker: "SPEA.PA",  category: "US",       index: "S&P 500",                      ter: 0.0010, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011871128", yahooTicker: "PSP5.PA",  category: "US",       index: "S&P 500",                      ter: 0.0012, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011550193", yahooTicker: "ETZ.PA",   category: "Europe",   index: "STOXX Europe 600",             ter: 0.0019, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0007054358", yahooTicker: "MEUD.PA",  category: "Eurozone", index: "EURO STOXX 50",                ter: 0.0007, distribution: "DIST", replication: "Physical",  leveraged: false },
  { isin: "FR0013412020", yahooTicker: "PAEEM.PA", category: "Emerging", index: "MSCI Emerging Markets",        ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011411980", yahooTicker: "TPXE.PA",  category: "Japan",    index: "TOPIX",                        ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834986900", yahooTicker: "HLT.PA",   category: "Sector",   index: "STOXX Europe 600 Health Care", ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cache globalThis (survit au HMR de Turbopack en dev)
// ─────────────────────────────────────────────────────────────────────────────

const CATALOG_CACHE_MS = 24 * 60 * 60 * 1000; // 24h

const g = globalThis as unknown as {
  __catalogCache?: { data: BaseCatalogEntry[]; timestamp: number } | null;
  __catalogPending?: Promise<BaseCatalogEntry[]> | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// getCatalog() — point d'entrée unique
// ─────────────────────────────────────────────────────────────────────────────

export async function getCatalog(): Promise<BaseCatalogEntry[]> {
  // Servir depuis le cache si valide
  const cached = g.__catalogCache;
  if (cached && Date.now() - cached.timestamp < CATALOG_CACHE_MS) {
    return cached.data;
  }

  // Dédup des requêtes concurrentes
  if (!g.__catalogPending) {
    g.__catalogPending = buildCatalogFromDiscovery().finally(() => {
      g.__catalogPending = null;
    });
  }

  return g.__catalogPending;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCatalogFromDiscovery() — construction depuis Euronext + JustETF
// ─────────────────────────────────────────────────────────────────────────────

const JUSTETF_BATCH = 12;
const JUSTETF_DELAY = 400;

async function buildCatalogFromDiscovery(): Promise<BaseCatalogEntry[]> {
  try {
    console.info("[Catalog] Construction dynamique depuis Euronext…");

    // 1. Récupérer tous les ETFs XPAR
    const euronextEtfs = await fetchEuronextEtfs();

    if (euronextEtfs.length === 0) {
      console.warn("[Catalog] Euronext a retourné 0 ETF — fallback SEED_CATALOG");
      return SEED_CATALOG;
    }

    // 2. Filtrer les PEA candidates (confiance >= 40)
    //    detectCategory ne retourne plus null — les ETFs non reconnus
    //    reçoivent la catégorie "Other", ce qui permet d'inclure
    //    automatiquement tout futur ETF PEA sans modifier les patterns.
    const candidates = euronextEtfs
      .map((raw) => {
        const { category, index } = detectCategory(raw.name);
        const { confidence } = computePeaConfidence(raw.name, raw.isin);
        return { ...raw, category, index, confidence };
      })
      .filter((e) => e.confidence >= 40);

    if (candidates.length === 0) {
      console.warn("[Catalog] 0 PEA candidates trouvés — fallback SEED_CATALOG");
      return SEED_CATALOG;
    }

    console.info(
      `[Catalog] ${candidates.length} PEA candidates (confiance >= 40) — enrichissement JustETF…`,
    );

    // 3. Enrichir par batch avec JustETF (TER, distribution, réplication)
    const catalog: BaseCatalogEntry[] = [];

    for (let i = 0; i < candidates.length; i += JUSTETF_BATCH) {
      const batch = candidates.slice(i, i + JUSTETF_BATCH);
      const results = await Promise.all(
        batch.map((c) =>
          scrapeJustEtf(c.isin).catch(
            (): JustEtfData => ({ isin: c.isin, error: "fetch failed" }),
          ),
        ),
      );

      for (let j = 0; j < batch.length; j++) {
        const c = batch[j];
        const jtf = results[j];
        const yahooTicker = c.ticker ? `${c.ticker}.PA` : "";

        if (!yahooTicker) continue;

        const isLeveraged = c.category === "Leveraged";

        catalog.push({
          isin: c.isin,
          yahooTicker,
          category: c.category,
          index: c.index ?? c.name,
          ter: jtf.ter ?? 0.003,
          distribution: mapDistribution(jtf.distribution),
          replication: mapReplication(jtf.replication),
          leveraged: isLeveraged,
          ...(isLeveraged ? { leverageMultiplier: 2 } : {}),
        });
      }

      if (i + JUSTETF_BATCH < candidates.length) {
        await new Promise((r) => setTimeout(r, JUSTETF_DELAY));
      }
    }

    if (catalog.length === 0) {
      console.warn("[Catalog] Enrichissement JustETF n'a produit aucun résultat — fallback SEED_CATALOG");
      return SEED_CATALOG;
    }

    // 4. Fusionner avec SEED_CATALOG : garantir que les ETFs essentiels
    //    sont toujours présents même si Euronext/JustETF les a ratés.
    const catalogIsins = new Set(catalog.map((e) => e.isin));
    let seedAdded = 0;
    for (const seed of SEED_CATALOG) {
      if (!catalogIsins.has(seed.isin)) {
        catalog.push(seed);
        seedAdded++;
      }
    }
    if (seedAdded > 0) {
      console.info(`[Catalog] +${seedAdded} ETFs essentiels ajoutés depuis SEED_CATALOG`);
    }

    console.info(`[Catalog] Catalogue dynamique construit : ${catalog.length} ETFs PEA`);

    // 5. Mettre en cache
    g.__catalogCache = { data: catalog, timestamp: Date.now() };
    return catalog;
  } catch (error) {
    console.error("[Catalog] Erreur lors de la construction :", error);

    // Retourner le cache expiré si disponible, sinon SEED_CATALOG
    if (g.__catalogCache?.data?.length) {
      console.warn("[Catalog] Utilisation du cache expiré");
      return g.__catalogCache.data;
    }
    return SEED_CATALOG;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function extractIssuer(name: string): string {
  if (/\biShares\b/i.test(name)) return "iShares";
  if (/\bAmundi\b/i.test(name)) return "Amundi";
  if (/\bBNP\b/i.test(name)) return "BNP Paribas";
  if (/\bLyxor\b/i.test(name)) return "Lyxor";
  if (/\bInvesco\b/i.test(name)) return "Invesco";
  if (/\bVanguard\b/i.test(name)) return "Vanguard";
  if (/\bXtrackers\b/i.test(name)) return "DWS";
  if (/\bSPDR\b/i.test(name)) return "SPDR";
  const firstWord = name.split(" ")[0];
  return firstWord ?? "—";
}
