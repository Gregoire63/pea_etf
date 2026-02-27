import type { EtfRankedEntry } from "@/types/etf";

let memoryCache: { data: EtfRankedEntry[]; timestamp: number } | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedEtfs(): EtfRankedEntry[] | null {
  if (!memoryCache) return null;
  if (Date.now() - memoryCache.timestamp > CACHE_DURATION_MS) {
    memoryCache = null;
    return null;
  }
  return memoryCache.data;
}

export function setCachedEtfs(data: EtfRankedEntry[]): void {
  memoryCache = { data, timestamp: Date.now() };
}

export function getCacheTimestamp(): string | null {
  if (!memoryCache) return null;
  return new Date(memoryCache.timestamp).toISOString();
}
