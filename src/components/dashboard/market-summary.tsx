"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff, BarChart3, Globe, DollarSign } from "lucide-react";
import { isMarketOpen } from "@/lib/market-hours";

interface MarketIndex {
  symbol: string;
  label: string;
  currency: string;
  type: "index" | "etf" | "currency";
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtNum(val: number, decimals = 2): string {
  return val.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVolume(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Md`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)} k`;
  return val.toLocaleString("fr-FR");
}

function MarketCard({ index }: { index: MarketIndex }) {
  const isPositive = (index.changePercent ?? 0) > 0;
  const isNegative = (index.changePercent ?? 0) < 0;
  const isNull = index.price === null;
  const isCurrency = index.type === "currency";
  const decimals = isCurrency ? 4 : 2;

  const accentColor = isPositive
    ? "border-emerald-500/20 dark:border-emerald-500/10"
    : isNegative
      ? "border-red-500/20 dark:border-red-500/10"
      : "";

  const changeBg = isPositive
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : isNegative
      ? "bg-red-500/10 text-red-700 dark:text-red-400"
      : "bg-muted text-muted-foreground";

  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-card p-3 transition-shadow hover:shadow-md ${accentColor}`}>
      {/* Gradient subtil en haut */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isPositive
            ? "linear-gradient(90deg, transparent, rgb(16 185 129 / 0.4), transparent)"
            : isNegative
              ? "linear-gradient(90deg, transparent, rgb(239 68 68 / 0.4), transparent)"
              : "transparent",
        }}
      />

      {/* Header : label + badge variation */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {index.label}
        </span>
        {!isNull && index.changePercent !== null && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${changeBg}`}>
            {isPositive ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : isNegative ? (
              <TrendingDown className="h-2.5 w-2.5" />
            ) : (
              <Minus className="h-2.5 w-2.5" />
            )}
            {isPositive ? "+" : ""}
            {index.changePercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Prix principal */}
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums tracking-tight">
          {isNull ? "—" : fmtNum(index.price!, decimals)}
        </span>
        {!isNull && index.currency && (
          <span className="text-[10px] font-medium text-muted-foreground">{index.currency}</span>
        )}
      </div>

      {/* Détails */}
      {!isNull && (
        <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
          {/* Variation absolue */}
          {index.change !== null && (
            <div className="flex items-center gap-1">
              <span className="w-12 shrink-0 text-muted-foreground/60">Var.</span>
              <span className="tabular-nums">{index.change > 0 ? "+" : ""}{fmtNum(index.change, decimals)}</span>
            </div>
          )}
          {/* Séance : plus bas — plus haut du jour */}
          {!isCurrency && index.dayHigh !== null && index.dayLow !== null && (
            <div className="flex items-center gap-1">
              <span className="w-12 shrink-0 text-muted-foreground/60">Séance</span>
              <span className="tabular-nums">{fmtNum(index.dayLow, decimals)} — {fmtNum(index.dayHigh, decimals)}</span>
            </div>
          )}
          {/* Volume */}
          {!isCurrency && index.volume !== null && index.volume > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-12 shrink-0 text-muted-foreground/60">Vol.</span>
              <span className="tabular-nums">{fmtVolume(index.volume)}</span>
            </div>
          )}
        </div>
      )}

      {/* 52 semaines */}
      {!isNull && index.fiftyTwoWeekHigh !== null && index.fiftyTwoWeekLow !== null && (() => {
        const fromHigh = ((index.price! - index.fiftyTwoWeekHigh) / index.fiftyTwoWeekHigh) * 100;
        const nearHigh = fromHigh > -3;
        const nearLow = ((index.price! - index.fiftyTwoWeekLow) / index.fiftyTwoWeekLow) * 100 < 10;

        return (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium tabular-nums ${
              nearHigh
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : nearLow
                  ? "bg-red-500/10 text-red-700 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
            }`}>
              {nearHigh
                ? `Proche du pic annuel (${fmtNum(index.fiftyTwoWeekHigh)})`
                : `${fromHigh.toFixed(1)}% vs pic annuel (${fmtNum(index.fiftyTwoWeekHigh)})`}
            </span>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Section groupée ────────────────────────────────────────────────────────

const SECTION_META: Record<MarketIndex["type"], { icon: typeof BarChart3; label: string }> = {
  index: { icon: BarChart3, label: "Indices" },
  etf: { icon: Globe, label: "ETFs PEA" },
  currency: { icon: DollarSign, label: "Devises" },
};

function MarketSection({ type, items, className }: { type: MarketIndex["type"]; items: MarketIndex[]; className?: string }) {
  const meta = SECTION_META[type];
  const Icon = meta.icon;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground">{meta.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((idx) => (
          <MarketCard key={idx.symbol} index={idx} />
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000;


export function MarketSummary() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [live, setLive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const indexItems = useMemo(() => indices.filter((i) => i.type === "index"), [indices]);
  const etfItems = useMemo(() => indices.filter((i) => i.type === "etf"), [indices]);
  const currencyItems = useMemo(() => indices.filter((i) => i.type === "currency"), [indices]);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch("/api/market");
      if (res.ok) {
        const data = await res.json();
        setIndices(data);
        setLastRefresh(new Date());
      }
    } catch {
      // Silencieux
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (isMarketOpen()) fetchMarket();
    }, POLL_INTERVAL);
    setLive(true);
  }, [fetchMarket]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLive(false);
  }, []);

  useEffect(() => {
    fetchMarket().finally(() => setLoading(false));
    if (isMarketOpen()) startPolling();
    return () => stopPolling();
  }, [fetchMarket, startPolling, stopPolling]);

  const toggleLive = () => {
    if (live) stopPolling();
    else startPolling();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-0">
          <div className="grid flex-1 grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
          <div className="hidden lg:mx-4 lg:block lg:w-px lg:bg-border" />
          <div className="grid flex-1 grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (indices.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Marchés</span>
          {live && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatTimestamp(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={toggleLive}
            className={`flex items-center gap-1 rounded-md p-1 text-[10px] transition-colors ${
              live
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={live ? "Désactiver le temps réel" : "Activer le temps réel (30s)"}
          >
            {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Indices — pleine largeur */}
      {indexItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">Indices</span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {indexItems.map((idx) => (
              <MarketCard key={idx.symbol} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* ETFs PEA + Devises — côte à côte sur desktop, empilés sur mobile */}
      {(etfItems.length > 0 || currencyItems.length > 0) && (
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-0">
          {etfItems.length > 0 && (
            <MarketSection type="etf" items={etfItems} className="lg:flex-1" />
          )}
          {etfItems.length > 0 && currencyItems.length > 0 && (
            <div className="hidden lg:mx-4 lg:block lg:w-px lg:self-stretch lg:bg-border" />
          )}
          {currencyItems.length > 0 && (
            <MarketSection type="currency" items={currencyItems} className="lg:flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
