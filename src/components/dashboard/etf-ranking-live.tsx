"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { EtfRankingTable } from "./etf-ranking-table";
import { EtfOverview } from "./etf-overview";
import { Loader2, RefreshCw } from "lucide-react";
import type { EtfRankedEntry, EtfCategory } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

interface CatalogEntry {
  isin: string;
  yahooTicker: string;
  category: EtfCategory;
  index: string;
  ter: number;
  distribution: "ACC" | "DIST";
  replication: "Physical" | "Synthetic";
  leveraged: boolean;
  leverageMultiplier?: number;
}

/** Convertit une entrée catalogue en entrée "placeholder" affichable immédiatement. */
function catalogToPlaceholder(base: CatalogEntry): EtfRankedEntry {
  const ticker = base.yahooTicker.replace(".PA", "");
  return {
    isin: base.isin,
    ticker,
    yahooTicker: base.yahooTicker,
    name: ticker,
    shortName: ticker,
    issuer: "",
    ter: base.ter,
    category: base.category,
    distribution: base.distribution,
    replication: base.replication,
    currency: "EUR",
    index: base.index,
    launchDate: "",
    leveraged: base.leveraged,
    leverageMultiplier: base.leverageMultiplier,
    currentPrice: null,
    aum: null,
    volume: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    ytdReturn: null,
    return1y: null,
    return3y: null,
    return5y: null,
    return10y: null,
    maxDrawdown: null,
    sharpeRatio: null,
    volatility1y: null,
    lastUpdated: "",
    score: 0,
    scoreBreakdown: {
      terScore: 0,
      performanceScore: 0,
      aumScore: 0,
      sharpeScore: 0,
      drawdownScore: 0,
    },
    rank: 0,
  };
}

/** Fusionne les entrées entrantes avec les placeholders existants. */
function mergeEtfs(
  current: EtfRankedEntry[],
  incoming: EtfRankedEntry[]
): EtfRankedEntry[] {
  const map = new Map(incoming.map((e) => [e.isin, e]));
  return current.map((e) => map.get(e.isin) ?? e);
}

/** Vérifie si une entrée est un placeholder (pas encore de données live). */
function isPlaceholder(etf: EtfRankedEntry): boolean {
  return etf.lastUpdated === "" && etf.score === 0;
}

interface Props {
  catalog: CatalogEntry[];
  /** Données pré-rendues côté serveur (SSG/ISR) — null si pas encore disponibles */
  serverEtfs: EtfRankedEntry[] | null;
}

export function EtfRankingLive({ catalog, serverEtfs }: Props) {
  const [etfs, setEtfs] = useState<EtfRankedEntry[]>(
    () => serverEtfs ?? catalog.map(catalogToPlaceholder)
  );
  const [loading, setLoading] = useState(!serverEtfs);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Chargement des données live…"
  );
  const [isComplete, setIsComplete] = useState(
    !!serverEtfs && serverEtfs.length > 0
  );

  // Compter les ETFs chargés vs placeholders
  const loadedCount = useMemo(
    () => etfs.filter((e) => !isPlaceholder(e)).length,
    [etfs]
  );

  // Pendant le chargement, trier les ETFs chargés avant les placeholders
  const sortedEtfs = useMemo(() => {
    if (isComplete) return etfs; // Données finales déjà triées par score
    // Séparer chargés et placeholders, garder l'ordre relatif
    const loaded = etfs.filter((e) => !isPlaceholder(e));
    const placeholders = etfs.filter((e) => isPlaceholder(e));
    return [...loaded, ...placeholders];
  }, [etfs, isComplete]);

  // Timestamp de la dernière mise à jour (extrait du premier ETF non-placeholder)
  const lastUpdated = useMemo(() => {
    const first = etfs.find((e) => e.lastUpdated && e.lastUpdated !== "");
    return first?.lastUpdated ?? null;
  }, [etfs]);

  const fetchStreamingData = useCallback(async () => {
    try {
      const res = await fetch("/api/etfs/stream");
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(part.slice(6));

            if (data.type === "batch") {
              setEtfs((prev) => mergeEtfs(prev, data.etfs));
              setProgress(data.progress ?? 0);
              setStatusMessage(
                data.total
                  ? `Récupération des cours — ${data.loaded ?? 0}/${data.total} ETF`
                  : "Récupération des cours…"
              );
            } else if (data.type === "status") {
              setStatusMessage(data.message ?? "");
              setProgress(data.progress ?? 0);
            } else if (data.type === "complete") {
              setEtfs(data.etfs);
              setProgress(100);
              setIsComplete(true);
            } else if (data.type === "error") {
              setError(true);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Rafraîchissement manuel : remet le composant en mode SSE streaming
  const handleRefresh = useCallback(() => {
    setEtfs(catalog.map(catalogToPlaceholder));
    setLoading(true);
    setIsComplete(false);
    setError(false);
    setProgress(0);
    setStatusMessage("Chargement des données live…");
    fetchStreamingData();
  }, [catalog, fetchStreamingData]);

  useEffect(() => {
    if (serverEtfs && serverEtfs.length > 0) return;
    fetchStreamingData();
  }, [serverEtfs, fetchStreamingData]);

  return (
    <>
      {/* Aperçu du marché — apparaît une fois les données complètes */}
      {isComplete && etfs.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Aperçu du marché PEA
          </h2>
          <EtfOverview etfs={etfs} />
        </section>
      )}

      {/* Tableau complet */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold">
            Liste complète · {etfs.length} ETF
          </h2>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {statusMessage}
            </span>
          )}
          {isComplete && !loading && lastUpdated && (
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
              Mise à jour {formatRelativeTime(lastUpdated)}
            </span>
          )}
          {isComplete && !loading && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Rafraîchir
            </button>
          )}
          {error && !loading && (
            <span className="text-xs text-amber-600">
              Données partielles — impossible de contacter le serveur
            </span>
          )}
        </div>

        <EtfRankingTable etfs={sortedEtfs} />
      </section>
    </>
  );
}
