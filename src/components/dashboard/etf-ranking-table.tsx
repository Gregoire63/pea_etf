"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EtfScoreBadge } from "./etf-score-badge";
import { CategoryBadge } from "./category-badge";
import { EtfFilters } from "./etf-filters";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

export function EtfRankingTable({ etfs }: Props) {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    distribution: "",
  });
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let result = etfs;
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
  }, [etfs, filters, sortKey, sortAsc]);

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

  return (
    <div className="space-y-4">
      <EtfFilters filters={filters} onChange={setFilters} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 cursor-pointer" onClick={() => toggleSort("rank")}>
                # <SortIcon col="rank" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("score")}>
                Score <SortIcon col="score" />
              </TableHead>
              <TableHead>ETF</TableHead>
              <TableHead>Cat.</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("ter")}>
                TER <SortIcon col="ter" />
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("aum")}>
                Encours <SortIcon col="aum" />
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("return1y")}>
                1 an <SortIcon col="return1y" />
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("return3y")}>
                3 ans <SortIcon col="return3y" />
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("return5y")}>
                5 ans <SortIcon col="return5y" />
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("maxDrawdown")}>
                Max DD <SortIcon col="maxDrawdown" />
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("sharpeRatio")}>
                Sharpe <SortIcon col="sharpeRatio" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((etf) => (
              <TableRow key={etf.isin} className="hover:bg-muted/50">
                <TableCell className="font-mono text-muted-foreground">
                  {etf.rank}
                </TableCell>
                <TableCell>
                  <EtfScoreBadge score={etf.score} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/etf/${etf.isin}`}
                    className="group block"
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
            ))}
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
