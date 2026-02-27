"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EtfScoreBadge } from "@/components/dashboard/etf-score-badge";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { PerformanceLineChart } from "@/components/charts/performance-line-chart";
import type { EtfRankedEntry, PricePoint } from "@/types/etf";

function fmt(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

function fmtAum(val: number | null): string {
  if (val === null) return "—";
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Md`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} M`;
  return `${val.toLocaleString("fr-FR")}`;
}

function bestOf(vals: (number | null)[], mode: "max" | "min"): number | null {
  const nums = vals.filter((v) => v !== null) as number[];
  if (nums.length === 0) return null;
  return mode === "max" ? Math.max(...nums) : Math.min(...nums);
}

interface Props {
  allEtfs: EtfRankedEntry[];
}

export function CompareClient({ allEtfs }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [historicalData, setHistoricalData] = useState<Record<string, PricePoint[]>>({});

  const selectedEtfs = selected
    .map((isin) => allEtfs.find((e) => e.isin === isin))
    .filter(Boolean) as EtfRankedEntry[];

  useEffect(() => {
    if (selected.length < 2) return;
    fetch(`/api/compare?isins=${selected.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.historicalPrices) setHistoricalData(data.historicalPrices);
      })
      .catch(console.error);
  }, [selected]);

  const filteredEtfs = search
    ? allEtfs.filter(
        (e) =>
          e.shortName.toLowerCase().includes(search.toLowerCase()) ||
          e.ticker.toLowerCase().includes(search.toLowerCase()) ||
          e.isin.toLowerCase().includes(search.toLowerCase())
      )
    : allEtfs;

  function toggle(isin: string) {
    setSelected((prev) => {
      if (prev.includes(isin)) return prev.filter((i) => i !== isin);
      if (prev.length >= 3) return prev;
      return [...prev, isin];
    });
  }

  const rows: { label: string; values: (string | number | null)[]; highlight?: "max" | "min" }[] =
    selectedEtfs.length > 0
      ? [
          { label: "Score", values: selectedEtfs.map((e) => e.score), highlight: "max" },
          { label: "Rang", values: selectedEtfs.map((e) => `#${e.rank}`) },
          { label: "TER", values: selectedEtfs.map((e) => `${(e.ter * 100).toFixed(2)}%`), highlight: "min" },
          { label: "Encours", values: selectedEtfs.map((e) => fmtAum(e.aum)) },
          { label: "Distribution", values: selectedEtfs.map((e) => e.distribution) },
          { label: "Replication", values: selectedEtfs.map((e) => e.replication) },
          { label: "1 an", values: selectedEtfs.map((e) => fmt(e.return1y)), highlight: "max" },
          { label: "3 ans", values: selectedEtfs.map((e) => fmt(e.return3y)), highlight: "max" },
          { label: "5 ans", values: selectedEtfs.map((e) => fmt(e.return5y)), highlight: "max" },
          { label: "Max Drawdown", values: selectedEtfs.map((e) => fmt(e.maxDrawdown)), highlight: "max" },
          { label: "Sharpe", values: selectedEtfs.map((e) => e.sharpeRatio?.toFixed(2) ?? "—"), highlight: "max" },
        ]
      : [];

  const chartLabels: Record<string, string> = {};
  for (const isin of selected) {
    const etf = allEtfs.find((e) => e.isin === isin);
    if (etf) chartLabels[isin] = etf.ticker;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selectionner les ETF ({selected.length}/3)</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            placeholder="Rechercher un ETF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedEtfs.map((e) => (
              <button
                key={e.isin}
                onClick={() => toggle(e.isin)}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              >
                {e.ticker} &times;
              </button>
            ))}
          </div>
          <div className="max-h-60 overflow-y-auto rounded border">
            {filteredEtfs.slice(0, 20).map((etf) => (
              <button
                key={etf.isin}
                onClick={() => toggle(etf.isin)}
                disabled={selected.length >= 3 && !selected.includes(etf.isin)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-40 ${
                  selected.includes(etf.isin) ? "bg-primary/10" : ""
                }`}
              >
                <div>
                  <span className="font-medium">{etf.ticker}</span>{" "}
                  <span className="text-muted-foreground">{etf.shortName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={etf.category} />
                  <EtfScoreBadge score={etf.score} />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedEtfs.length >= 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Comparaison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metrique</TableHead>
                    {selectedEtfs.map((e) => (
                      <TableHead key={e.isin} className="text-center">
                        {e.ticker}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      {row.values.map((val, i) => (
                        <TableCell key={i} className="text-center font-mono">
                          {String(val ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {Object.keys(historicalData).length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance comparee (base 100)</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceLineChart
                  data={historicalData}
                  labels={chartLabels}
                  normalize={true}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
