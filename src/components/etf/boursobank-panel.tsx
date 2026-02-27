"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import type { BoursobankData } from "@/lib/boursobank";
import { getBoursoUrl } from "@/lib/boursobank";

function fmt(v: number | undefined, decimals = 2, suffix = "") {
  if (v === undefined) return "—";
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

export function BoursobankPanel({ ticker }: { ticker: string }) {
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

  const boursoUrl = getBoursoUrl(ticker);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Données Boursobank</CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-3">
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
            <a
              href={boursoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Voir sur Boursobank
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Erreur scraping */}
        {!loading && data?.error && !data.quote && !data.holdings && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Les données en temps réel ne sont pas disponibles (contenu dynamique ou protection
              anti-bot). Consultez directement la page Boursobank via le bouton ci-dessus.
            </span>
          </div>
        )}

        {/* Cotation */}
        {data?.quote && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cotation temps réel
            </h3>
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
              <MetricCell label="Variation jour" value={fmt(data.quote.change1dPercent, 2, "%")} />
              <MetricCell
                label="Volume"
                value={
                  data.quote.volume !== undefined
                    ? data.quote.volume.toLocaleString("fr-FR")
                    : "—"
                }
              />
            </div>
          </div>
        )}

        {/* Composition */}
        {data?.holdings && data.holdings.length > 0 && (
          <div>
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

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        )}
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
