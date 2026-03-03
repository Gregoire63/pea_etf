"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { EtfScoreBadge } from "@/components/dashboard/etf-score-badge";
import { BrokerLinksPanel } from "@/components/etf/broker-links-panel";
import { EtfDetailChart } from "./chart";
import { isMarketOpen } from "@/lib/market-hours";
import { Wifi, WifiOff } from "lucide-react";
import type { EtfRankedEntry, PricePoint, DataSourceName } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(decimals)}%`;
}

function returnColor(val: number | null): string {
  if (val === null) return "";
  return val >= 0 ? "text-emerald-600" : "text-red-600";
}

function fmtAum(val: number | null): string {
  if (val === null) return "—";
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Md€`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} M€`;
  return `${val.toLocaleString("fr-FR")} €`;
}

const SOURCE_LABELS: Record<DataSourceName, { label: string; color: string }> = {
  justetf:    { label: "JustETF",    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  boursobank: { label: "BoursoBank", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  yahoo:      { label: "Yahoo",      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  catalog:    { label: "Catalogue",  color: "bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400" },
};

function SourceBadge({ source }: { source?: DataSourceName }) {
  if (!source) return null;
  const { label, color } = SOURCE_LABELS[source];
  return (
    <span className={`ml-1 inline-block rounded px-1 py-0.5 text-[9px] font-medium leading-none ${color}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live price types
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000;

interface LivePriceData {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton components
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <div className="h-80 animate-pulse rounded-lg border bg-muted" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  isin: string;
  ticker: string;
  /** Données catalogue connues immédiatement (TER, distribution, réplication, catégorie) */
  catalogTer: number;
  catalogDistribution: string;
  catalogReplication: string;
  catalogIndex: string;
}

export function EtfDetailLive({
  isin,
  ticker,
  catalogTer,
  catalogDistribution,
  catalogReplication,
  catalogIndex,
}: Props) {
  const [etf, setEtf] = useState<EtfRankedEntry | null>(null);
  const [prices, setPrices] = useState<PricePoint[] | null>(null);
  const [error, setError] = useState(false);

  // ── Live price polling ──────────────────────────────────────────────────
  const [livePrice, setLivePrice] = useState<LivePriceData | null>(null);
  const [live, setLive] = useState(false);
  const [lastPriceRefresh, setLastPriceRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLivePrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/etf/${encodeURIComponent(isin)}/price`);
      if (res.ok) {
        const data: LivePriceData = await res.json();
        setLivePrice(data);
        setLastPriceRefresh(new Date());
      }
    } catch {
      // Silently fail — stale price remains visible
    }
  }, [isin]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (isMarketOpen()) fetchLivePrice();
    }, POLL_INTERVAL);
    setLive(true);
  }, [fetchLivePrice]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLive(false);
  }, []);

  const toggleLive = useCallback(() => {
    if (live) stopPolling();
    else {
      fetchLivePrice();
      startPolling();
    }
  }, [live, fetchLivePrice, startPolling, stopPolling]);

  // ── Initial data load ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/etf/${encodeURIComponent(isin)}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.etf) setEtf(data.etf);
        if (data.historicalPrices) setPrices(data.historicalPrices);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isin]);

  // ── Start live polling when data is loaded and market open ──────────────
  useEffect(() => {
    if (!etf) return;
    if (isMarketOpen()) {
      fetchLivePrice();
      startPolling();
    }
    return () => stopPolling();
  }, [etf, fetchLivePrice, startPolling, stopPolling]);

  // ── Computed price values ───────────────────────────────────────────────
  const currentDisplayPrice = livePrice?.price ?? etf?.currentPrice ?? null;
  const dailyChange = livePrice?.change ?? null;
  const dailyChangePercent = livePrice?.changePercent ?? null;
  const priceColor = dailyChangePercent !== null
    ? dailyChangePercent >= 0 ? "text-emerald-600" : "text-red-600"
    : "";

  // ── Métriques : skeleton ou données ─────────────────────────────────────

  const metricsLoaded = etf !== null;

  const metrics: { label: React.ReactNode; value: string; className?: string; sub?: string }[] = metricsLoaded
    ? [
        {
          label: (
            <span className="flex items-center gap-1">
              Prix actuel
              <button
                onClick={(e) => { e.stopPropagation(); toggleLive(); }}
                className={`flex items-center gap-0.5 rounded p-0.5 text-[9px] transition-colors ${
                  live
                    ? "text-emerald-600 hover:bg-emerald-500/10"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title={live ? "Désactiver le temps réel" : "Activer le temps réel (30s)"}
              >
                {live ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              </button>
              {live && (
                <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              )}
            </span>
          ),
          value: currentDisplayPrice ? `${currentDisplayPrice.toFixed(2)} €` : "—",
          className: priceColor,
          sub: dailyChange !== null && dailyChangePercent !== null
            ? `${dailyChange >= 0 ? "+" : ""}${dailyChange.toFixed(2)} (${dailyChangePercent >= 0 ? "+" : ""}${dailyChangePercent.toFixed(2)}%)`
            : undefined,
        },
        {
          label: (
            <span className="flex items-center gap-0.5">
              TER
              <HintTooltip content="Total Expense Ratio — frais annuels de gestion déduits automatiquement de la valeur de l'ETF. Plus c'est bas, mieux c'est." />
              <SourceBadge source={etf.dataSources?.ter} />
            </span>
          ),
          value: `${(etf.ter * 100).toFixed(2)}%`,
        },
        {
          label: (
            <span className="flex items-center gap-0.5">
              Encours
              <HintTooltip content="Actifs sous gestion (AUM). Un encours élevé garantit une meilleure liquidité et des spreads bid/ask plus faibles." />
              <SourceBadge source={etf.dataSources?.aum} />
            </span>
          ),
          value: fmtAum(etf.aum),
        },
        {
          label: (
            <span className="flex items-center gap-0.5">
              Distribution
              <HintTooltip content="ACC (Capitalisant) : les dividendes sont réinvestis automatiquement. DIST (Distribuant) : les dividendes vous sont versés." />
            </span>
          ),
          value: etf.distribution,
        },
        {
          label: (
            <span className="flex items-center gap-0.5">
              Réplication
              <HintTooltip content="Physique : l'ETF achète directement les actions de l'indice. Synthétique (Swap) : réplication via des contrats dérivés — nécessaire pour l'éligibilité PEA des indices non-européens (MSCI World, S&P 500…)." />
            </span>
          ),
          value: etf.replication,
        },
        { label: "Indice", value: etf.index },
        {
          label: (
            <span className="flex items-center gap-0.5">
              YTD
              <HintTooltip content="Year-to-Date — performance depuis le 1er janvier de l'année en cours." />
            </span>
          ),
          value: fmt(etf.ytdReturn), className: returnColor(etf.ytdReturn),
        },
        { label: "1 an", value: fmt(etf.return1y), className: returnColor(etf.return1y) },
        { label: "3 ans (ann.)", value: fmt(etf.return3y), className: returnColor(etf.return3y) },
        { label: "5 ans (ann.)", value: fmt(etf.return5y), className: returnColor(etf.return5y) },
        { label: "10 ans (ann.)", value: fmt(etf.return10y), className: returnColor(etf.return10y) },
        {
          label: (
            <span className="flex items-center gap-0.5">
              Max Drawdown
              <HintTooltip content="Pire baisse enregistrée depuis un pic historique jusqu'au creux suivant. Mesure le risque maximal de perte en capital." />
            </span>
          ),
          value: fmt(etf.maxDrawdown), className: "text-red-600",
        },
        {
          label: (
            <span className="flex items-center gap-0.5">
              Volatilité
              <HintTooltip content="Volatilité annualisée — écart-type des rendements hebdomadaires × √52. Mesure l'amplitude des variations de prix." />
            </span>
          ),
          value: fmt(etf.volatility1y),
        },
        {
          label: (
            <span className="flex items-center gap-0.5">
              Sharpe Ratio
              <HintTooltip content="Ratio de Sharpe = rendement / volatilité. Mesure la performance ajustée au risque. Un ratio > 1 est considéré bon ; > 2 est excellent." />
            </span>
          ),
          value: etf.sharpeRatio !== null ? etf.sharpeRatio.toFixed(2) : "—",
        },
      ]
    : [
        { label: "Prix actuel", value: "—" },
        { label: "TER", value: `${(catalogTer * 100).toFixed(2)}%` },
        { label: "Encours", value: "—" },
        { label: "Distribution", value: catalogDistribution },
        { label: "Réplication", value: catalogReplication },
        { label: "Indice", value: catalogIndex },
        { label: "YTD", value: "—" },
        { label: "1 an", value: "—" },
        { label: "3 ans (ann.)", value: "—" },
        { label: "5 ans (ann.)", value: "—" },
        { label: "10 ans (ann.)", value: "—" },
        { label: "Max Drawdown", value: "—" },
        { label: "Volatilité", value: "—" },
        { label: "Sharpe Ratio", value: "—" },
      ];

  const breakdown = etf
    ? [
        { label: "TER", value: etf.scoreBreakdown.terScore, weight: "20%" },
        { label: "Performance", value: etf.scoreBreakdown.performanceScore, weight: "30%" },
        { label: "Encours", value: etf.scoreBreakdown.aumScore, weight: "15%" },
        { label: "Sharpe", value: etf.scoreBreakdown.sharpeScore, weight: "20%" },
        { label: "Drawdown", value: etf.scoreBreakdown.drawdownScore, weight: "15%" },
      ]
    : null;

  return (
    <>
      {/* ── En-tête dynamique — se remplit quand les données arrivent ── */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">
            {etf?.shortName ?? ticker}
          </h1>
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-muted-foreground">Rang</div>
            <div className="text-2xl font-bold leading-none sm:text-3xl">
              {etf?.rank ? `#${etf.rank}` : (
                <span className="inline-block h-8 w-12 animate-pulse rounded bg-muted" />
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {etf ? (
            <EtfScoreBadge score={etf.score} />
          ) : (
            <span className="inline-block h-6 w-14 animate-pulse rounded-full bg-muted" />
          )}
        </div>
        {etf?.issuer && (
          <p className="text-xs text-muted-foreground">
            {etf.issuer}
          </p>
        )}
      </div>

      <Separator />

      {/* ── Métriques ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {metricsLoaded
          ? metrics.map((m, i) => (
              <Card key={i} className="animate-in fade-in duration-300">
                <CardContent className="p-2 sm:p-4">
                  <div className="text-[10px] leading-tight text-muted-foreground sm:text-xs sm:leading-normal">{m.label}</div>
                  <div className={`mt-0.5 text-sm font-semibold leading-tight sm:mt-1 sm:text-base lg:text-lg ${m.className ?? ""}`}>{m.value}</div>
                  {m.sub && (
                    <div className={`text-[9px] tabular-nums sm:text-[10px] ${m.className ?? ""}`}>
                      {m.sub}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          : metrics.map((m, i) => (
              <Card key={i}>
                <CardContent className="p-2 sm:p-4">
                  <div className="text-[10px] leading-tight text-muted-foreground sm:text-xs sm:leading-normal">{m.label}</div>
                  <div className="mt-0.5 text-sm font-semibold leading-tight sm:mt-1 sm:text-base lg:text-lg">
                    {m.value === "—" ? (
                      <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
                    ) : (
                      m.value
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* ── Last refresh timestamp ─────────────────────────────────── */}
      {lastPriceRefresh && live && (
        <div className="text-right text-[10px] tabular-nums text-muted-foreground">
          Dernière mise à jour : {lastPriceRefresh.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      )}

      <Separator />

      {/* ── Score breakdown ──────────────────────────────────────────── */}
      {breakdown ? (
        <Card className="animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle>Détail du score : {etf!.score.toFixed(1)} / 100</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-28 text-sm">{b.label} ({b.weight})</div>
                  <div className="flex-1">
                    <div className="h-3 w-full rounded-full bg-muted">
                      <div
                        className="h-3 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${b.value}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-10 text-right text-sm font-mono">{b.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScoreBreakdownSkeleton />
      )}

      {/* ── Graphique ────────────────────────────────────────────────── */}
      {prices && prices.length > 0 ? (
        <Card className="animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle>Historique de prix</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <EtfDetailChart prices={prices} ticker={etf?.ticker ?? isin} />
          </CardContent>
        </Card>
      ) : prices === null && !error ? (
        <ChartSkeleton />
      ) : null}

      {/* ── Broker links ─────────────────────────────────────────────── */}
      {etf ? (
        <div className="animate-in fade-in duration-300">
          <BrokerLinksPanel
            ticker={etf.ticker}
            isin={etf.isin}
            issuer={etf.issuer}
            brokerDeals={etf.brokerDeals}
          />
        </div>
      ) : !error ? (
        <div className="h-48 animate-pulse rounded-lg border bg-muted" />
      ) : null}

      {/* ── Erreur ───────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Les données détaillées ne sont pas disponibles pour le moment. Réessayez plus tard.
        </div>
      )}
    </>
  );
}
