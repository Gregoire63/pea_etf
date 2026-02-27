"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

interface MarketIndex {
  symbol: string;
  label: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

function MarketCard({ index }: { index: MarketIndex }) {
  const isPositive = (index.changePercent ?? 0) > 0;
  const isNegative = (index.changePercent ?? 0) < 0;
  const isNull = index.price === null;

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <div>
        <div className="text-xs font-medium text-muted-foreground">{index.label}</div>
        <div className="mt-0.5 text-sm font-semibold font-mono">
          {isNull ? "—" : index.price!.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
          {!isNull && (
            <span className="ml-1 text-xs text-muted-foreground">{index.currency}</span>
          )}
        </div>
      </div>
      {!isNull && index.changePercent !== null && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-muted-foreground"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : isNegative ? (
            <TrendingDown className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
          {isPositive ? "+" : ""}
          {index.changePercent.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export function MarketSummary() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market");
      if (res.ok) {
        const data = await res.json();
        setIndices(data);
        setUpdatedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
    );
  }

  if (indices.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Marchés en temps réel (Yahoo Finance)</span>
        <button
          onClick={fetchData}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          {updatedAt ? `Mis à jour ${updatedAt}` : "Actualiser"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {indices.map((idx) => (
          <MarketCard key={idx.symbol} index={idx} />
        ))}
      </div>
    </div>
  );
}
