"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, RefreshCw, AlertCircle, Loader2, Gift } from "lucide-react";
import type { BoursobankData } from "@/lib/boursobank";
import { getBoursoUrl } from "@/lib/boursobank";
import type { BrokerDealInfo } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// URL builders for each broker
// ─────────────────────────────────────────────────────────────────────────────

const BROKERS = [
  {
    name: "Boursobank",
    getUrl: (ticker: string, _isin: string) => getBoursoUrl(ticker),
    description: "Cotation + spread temps réel",
  },
  {
    name: "Euronext Live",
    getUrl: (_ticker: string, isin: string) =>
      `https://live.euronext.com/en/product/etfs/${isin}-XPAR`,
    description: "Carnet d'ordres officiel",
  },
  {
    name: "justETF",
    getUrl: (_ticker: string, isin: string) =>
      `https://www.justetf.com/fr/etf-profile.html?isin=${isin}`,
    description: "Fiche complète & comparatif",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for Boursobank live data display
// ─────────────────────────────────────────────────────────────────────────────

function fmt(v: number | undefined, decimals = 2, suffix = "") {
  if (v === undefined) return "—";
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const DEAL_TYPE_COLORS: Record<BrokerDealInfo["dealType"], string> = {
  free: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  capped: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reimbursed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface BrokerLinksPanelProps {
  ticker: string;
  isin: string;
  issuer?: string;
  brokerDeals?: BrokerDealInfo[];
}

export function BrokerLinksPanel({ ticker, isin, issuer, brokerDeals }: BrokerLinksPanelProps) {
  const [data, setData] = useState<BoursobankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bourso/${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setUpdatedAt(
          new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        );
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Où acheter cet ETF</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Offres partenaires ──────────────────────────────────────── */}
        {brokerDeals && brokerDeals.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Gift className="h-3 w-3" />
              Offres partenaires{issuer ? ` (${issuer})` : ""}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {brokerDeals.map((deal) => (
                <div
                  key={deal.brokerId}
                  className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{deal.brokerName}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${DEAL_TYPE_COLORS[deal.dealType]}`}>
                      {deal.badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{deal.description}</p>
                  {deal.conditions && (
                    <p className="text-[10px] text-muted-foreground/70">Conditions : {deal.conditions}</p>
                  )}
                  {deal.validUntil && (
                    <p className="text-[10px] text-muted-foreground/70">
                      Valable jusqu&apos;au {new Date(deal.validUntil).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Broker links grid ─────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BROKERS.map((broker) => (
            <a
              key={broker.name}
              href={broker.getUrl(ticker, isin)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-1 rounded-lg border bg-muted/30 px-4 py-3 hover:border-primary/50 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold group-hover:text-primary">
                  {broker.name}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{broker.description}</span>
            </a>
          ))}
        </div>

        {/* ── Boursobank live data ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              Cotation Boursobank
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </h3>
            {updatedAt && (
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                {updatedAt}
              </button>
            )}
          </div>

          {/* Erreur scraping */}
          {!loading && (!data?.quote) && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Les données en temps réel ne sont pas disponibles (protection anti-bot).
                Utilisez les liens ci-dessus pour accéder directement aux plateformes.
              </span>
            </div>
          )}

          {/* Cotation */}
          {data?.quote && (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MetricCell label="Prix" value={fmt(data.quote.price, 2, " €")} />
              <MetricCell label="Bid" value={fmt(data.quote.bid, 2, " €")} />
              <MetricCell label="Ask" value={fmt(data.quote.ask, 2, " €")} />
              <MetricCell
                label="Spread"
                value={
                  data.quote.spreadPercent !== undefined
                    ? fmt(data.quote.spreadPercent, 3, "%")
                    : "—"
                }
                highlight={
                  data.quote.spreadPercent !== undefined
                    ? data.quote.spreadPercent > 0.5
                      ? "bad"
                      : "good"
                    : undefined
                }
              />
              <MetricCell label="Variation" value={fmt(data.quote.change1dPercent, 2, "%")} />
              <MetricCell
                label="Volume"
                value={
                  data.quote.volume !== undefined
                    ? data.quote.volume.toLocaleString("fr-FR")
                    : "—"
                }
              />
            </div>
          )}

          {/* Composition */}
          {data?.holdings && data.holdings.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Composition — Top {data.holdings.length} positions
              </h3>
              <div className="space-y-1.5">
                {data.holdings.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 text-right text-xs text-muted-foreground">{i + 1}.</div>
                    <div className="flex-1 text-sm truncate">{h.name}</div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground w-16">
                      {fmt(h.weight, 2, "%")}
                    </div>
                    <div className="shrink-0 w-24">
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.min(h.weight, 30) * (100 / 30)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skeleton loading */}
          {loading && !data && (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "good" | "bad";
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold font-mono ${
          highlight === "good"
            ? "text-emerald-600"
            : highlight === "bad"
            ? "text-red-600"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
