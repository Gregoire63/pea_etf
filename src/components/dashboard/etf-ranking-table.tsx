"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { EtfScoreBadge } from "./etf-score-badge";
import { CategoryBadge } from "./category-badge";
import { EtfFilters } from "./etf-filters";
import { ScoreWeightsConfigurator } from "./score-weights-configurator";
import { useScoreWeights } from "@/hooks/use-score-weights";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import type { EtfRankedEntry } from "@/types/etf";

function fmt(val: number | null, suffix = "%", decimals = 2): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(decimals)}${suffix}`;
}

function fmtAum(val: number | null): string {
  if (val === null) return "—";
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Md`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} M`;
  return `${val.toLocaleString("fr-FR")}`;
}

type SortKey =
  | "rank"
  | "score"
  | "ter"
  | "aum"
  | "return1y"
  | "return3y"
  | "return5y"
  | "maxDrawdown"
  | "sharpeRatio";

interface Props {
  etfs: EtfRankedEntry[];
}

const TOOLTIPS = {
  ter: "Total Expense Ratio — frais annuels de gestion déduits automatiquement (en % de la valeur). Plus c'est bas, mieux c'est.",
  aum: "Actifs sous gestion (AUM). Un encours élevé garantit une meilleure liquidité et un spread bid/ask plus faible.",
  perf: (p: string) =>
    `Performance annualisée sur ${p}, calculée à partir des prix de clôture hebdomadaires (source : Yahoo Finance).`,
  maxDD:
    "Drawdown maximum — pire baisse enregistrée depuis un pic historique jusqu'au creux suivant. Mesure le risque de perte en capital.",
  sharpe:
    "Ratio de Sharpe — rendement moyen divisé par la volatilité. Mesure la performance ajustée au risque. Un ratio > 1 est considéré bon.",
};

export function EtfRankingTable({ etfs }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    distribution: "",
  });
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const { weights, normalizedWeights, isCustom, updateWeights, resetWeights } =
    useScoreWeights();

  // Recompute composite scores and ranks using custom weights
  const etfsWithCustomScores = useMemo(() => {
    const scored = etfs.map((etf) => {
      const { terScore, performanceScore, aumScore, sharpeScore, drawdownScore } =
        etf.scoreBreakdown;
      const leveragePenalty = etf.leveraged ? 0.85 : 1.0;
      const customScore =
        Math.round(
          (normalizedWeights.ter * terScore +
            normalizedWeights.performance * performanceScore +
            normalizedWeights.aum * aumScore +
            normalizedWeights.sharpe * sharpeScore +
            normalizedWeights.drawdown * drawdownScore) *
            leveragePenalty *
            10
        ) / 10;
      return { ...etf, score: customScore };
    });

    // Re-rank by custom score descending
    const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
    return sortedByScore.map((etf, i) => ({ ...etf, rank: i + 1 }));
  }, [etfs, normalizedWeights]);

  // Dynamic score tooltip reflecting current weights
  const scoreTooltip = useMemo(() => {
    const total =
      weights.ter + weights.performance + weights.aum + weights.sharpe + weights.drawdown;
    if (total === 0) return "Note composite (0–100).";
    const pct = (v: number) => Math.round((v / total) * 100);
    return `Note composite (0–100) pondérant : TER ${pct(weights.ter)} %, performance ${pct(weights.performance)} %, encours ${pct(weights.aum)} %, Sharpe ${pct(weights.sharpe)} %, drawdown ${pct(weights.drawdown)} %. Les ETF à levier reçoivent un malus de 15 %.`;
  }, [weights]);

  const filtered = useMemo(() => {
    let result = etfsWithCustomScores;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.ticker.toLowerCase().includes(q) ||
          e.isin.toLowerCase().includes(q) ||
          e.shortName.toLowerCase().includes(q)
      );
    }
    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters.distribution) {
      result = result.filter((e) => e.distribution === filters.distribution);
    }

    const sorted = [...result].sort((a, b) => {
      const aVal = a[sortKey] ?? -Infinity;
      const bVal = b[sortKey] ?? -Infinity;
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [etfsWithCustomScores, filters, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "rank" || key === "ter");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortAsc ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  function handleRowClick(isin: string, e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    setNavigatingTo(isin);
    router.push(`/etf/${isin}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters + score configurator */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <EtfFilters filters={filters} onChange={setFilters} />
        <div className="shrink-0">
          <ScoreWeightsConfigurator
            weights={weights}
            onChange={updateWeights}
            onReset={resetWeights}
            isCustom={isCustom}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 cursor-pointer" onClick={() => toggleSort("rank")}>
                # <SortIcon col="rank" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("score")}>
                Score{" "}
                <HintTooltip content={scoreTooltip} maxWidth={320} />
                <SortIcon col="score" />
              </TableHead>
              <TableHead>ETF</TableHead>
              <TableHead>Cat.</TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("ter")}
              >
                TER <HintTooltip content={TOOLTIPS.ter} />
                <SortIcon col="ter" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("aum")}
              >
                Encours <HintTooltip content={TOOLTIPS.aum} />
                <SortIcon col="aum" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("return1y")}
              >
                1 an <HintTooltip content={TOOLTIPS.perf("1 an")} />
                <SortIcon col="return1y" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("return3y")}
              >
                3 ans <HintTooltip content={TOOLTIPS.perf("3 ans")} />
                <SortIcon col="return3y" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("return5y")}
              >
                5 ans <HintTooltip content={TOOLTIPS.perf("5 ans")} />
                <SortIcon col="return5y" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("maxDrawdown")}
              >
                Max DD <HintTooltip content={TOOLTIPS.maxDD} />
                <SortIcon col="maxDrawdown" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => toggleSort("sharpeRatio")}
              >
                Sharpe <HintTooltip content={TOOLTIPS.sharpe} />
                <SortIcon col="sharpeRatio" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((etf) => {
              const isNavigating = navigatingTo === etf.isin;
              return (
                <TableRow
                  key={etf.isin}
                  className={`cursor-pointer transition-opacity hover:bg-muted/50 ${
                    isNavigating ? "opacity-50" : ""
                  }`}
                  onClick={(e) => handleRowClick(etf.isin, e)}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {etf.rank}
                  </TableCell>
                  <TableCell>
                    {isNavigating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <EtfScoreBadge score={etf.score} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/etf/${etf.isin}`}
                      className="group block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-medium group-hover:text-primary group-hover:underline">
                        {etf.shortName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {etf.ticker} &middot; {etf.isin}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={etf.category} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(etf.ter * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmtAum(etf.aum)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm ${
                      (etf.return1y ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {fmt(etf.return1y)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm ${
                      (etf.return3y ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {fmt(etf.return3y)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm ${
                      (etf.return5y ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {fmt(etf.return5y)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-600">
                    {fmt(etf.maxDrawdown)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {etf.sharpeRatio !== null ? etf.sharpeRatio.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  Aucun ETF ne correspond aux filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} ETF affiche{filtered.length > 1 ? "s" : ""} sur{" "}
        {etfs.length}
      </p>
    </div>
  );
}
