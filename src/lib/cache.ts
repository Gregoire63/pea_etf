import type { EtfRankedEntry } from "@/types/etf";

// globalThis survit au hot-reload (HMR) et aux re-évaluations de module par Turbopack.
// Sans ça, chaque navigation en dev perd le cache et relance le scraping.
const g = globalThis as unknown as {
  __etfCache?: { data: EtfRankedEntry[]; timestamp: number } | null;
};

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedEtfs(): EtfRankedEntry[] | null {
  const cached = g.__etfCache;
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION_MS) {
    g.__etfCache = null;
    return null;
  }
  return cached.data;
}

export function setCachedEtfs(data: EtfRankedEntry[]): void {
  g.__etfCache = { data, timestamp: Date.now() };
}

export function getCacheTimestamp(): string | null {
  if (!g.__etfCache) return null;
  return new Date(g.__etfCache.timestamp).toISOString();
}

/** Invalide le cache pour forcer un refresh complet au prochain appel. */
export function clearCache(): void {
  g.__etfCache = null;
}
