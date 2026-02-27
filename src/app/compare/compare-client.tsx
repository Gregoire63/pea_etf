"use client";

import { useState, useEffect } from "react";
import type React from "react";
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
import { HintTooltip } from "@/components/ui/hint-tooltip";
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

  function hint(text: string, tooltip: string): React.ReactNode {
    return (
      <span className="inline-flex items-center">
        {text}
        <HintTooltip content={tooltip} />
      </span>
    );
  }

  const rows: { key: string; label: React.ReactNode; values: (string | number | null)[]; highlight?: "max" | "min" }[] =
    selectedEtfs.length > 0
      ? [
          { key: "score",      label: hint("Score",        "Score composite sur 100 calculé à partir du TER (20%), des performances (30%), de l'encours (15%), du ratio de Sharpe (20%) et du drawdown maximum (15%)."), values: selectedEtfs.map((e) => e.score),                         highlight: "max" },
          { key: "rang",       label: "Rang",                                                                                                                                                                             values: selectedEtfs.map((e) => `#${e.rank}`)                                    },
          { key: "ter",        label: hint("TER",          "Total Expense Ratio — frais annuels de gestion déduits automatiquement de la valeur de l'ETF. Plus c'est bas, mieux c'est."),                                values: selectedEtfs.map((e) => `${(e.ter * 100).toFixed(2)}%`),          highlight: "min" },
          { key: "encours",    label: hint("Encours",      "Actifs sous gestion (AUM). Un encours élevé garantit une meilleure liquidité et des spreads bid/ask plus faibles."),                                          values: selectedEtfs.map((e) => fmtAum(e.aum))                                    },
          { key: "distrib",    label: hint("Distribution", "ACC (Capitalisant) : les dividendes sont réinvestis automatiquement. DIST (Distribuant) : les dividendes vous sont versés."),                                 values: selectedEtfs.map((e) => e.distribution)                                   },
          { key: "replic",     label: hint("Réplication",  "Physique : l'ETF achète directement les actions de l'indice. Synthétique (Swap) : réplication via des contrats dérivés — nécessaire pour l'éligibilité PEA des indices non-européens."), values: selectedEtfs.map((e) => e.replication) },
          { key: "r1y",        label: hint("1 an",         "Performance annualisée sur les 12 derniers mois, calculée à partir des prix de clôture hebdomadaires."),                                                      values: selectedEtfs.map((e) => fmt(e.return1y)),                          highlight: "max" },
          { key: "r3y",        label: hint("3 ans (ann.)", "Performance annualisée sur 3 ans — correspond au taux de croissance annuel composé (TCAC) sur la période."),                                                   values: selectedEtfs.map((e) => fmt(e.return3y)),                          highlight: "max" },
          { key: "r5y",        label: hint("5 ans (ann.)", "Performance annualisée sur 5 ans — correspond au taux de croissance annuel composé (TCAC) sur la période."),                                                   values: selectedEtfs.map((e) => fmt(e.return5y)),                          highlight: "max" },
          { key: "drawdown",   label: hint("Max Drawdown", "Pire baisse enregistrée depuis un pic historique jusqu'au creux suivant. Mesure le risque maximal de perte en capital."),                                     values: selectedEtfs.map((e) => fmt(e.maxDrawdown)),                       highlight: "max" },
          { key: "sharpe",     label: hint("Sharpe",       "Ratio de Sharpe = rendement / volatilité. Mesure la performance ajustée au risque. Un ratio > 1 est considéré bon ; > 2 est excellent."),                    values: selectedEtfs.map((e) => e.sharpeRatio?.toFixed(2) ?? "—"),        highlight: "max" },
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
          <CardTitle>Sélectionner les ETF ({selected.length}/3)</CardTitle>
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
                    <TableHead>Métrique</TableHead>
                    {selectedEtfs.map((e) => (
                      <TableHead key={e.isin} className="text-center">
                        {e.ticker}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key}>
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
                <CardTitle>Performance comparée (base 100)</CardTitle>
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
