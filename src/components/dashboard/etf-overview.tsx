import type { EtfRankedEntry } from "@/types/etf";
import { CATEGORY_LABELS } from "@/lib/constants";
import Link from "next/link";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(2)}%`;
}

function fmtAum(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)} Md€`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Md€`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} M€`;
  return `${Math.round(v)} €`;
}

interface CategoryStat {
  category: string;
  label: string;
  count: number;
  avg1y: number | null;
  avgSharpe: number | null;
  totalAum: number;
}

export function EtfOverview({ etfs }: { etfs: EtfRankedEntry[] }) {
  const valid = etfs.filter((e) => e.return1y !== null);
  const totalAum = etfs.reduce((s, e) => s + (e.aum ?? 0), 0);
  const avgTer = (etfs.reduce((s, e) => s + e.ter, 0) / etfs.length) * 100;
  const positiveCount = valid.filter((e) => (e.return1y ?? 0) > 0).length;

  // Stats par catégorie
  const cats = [...new Set(etfs.map((e) => e.category))];
  const categoryStats: CategoryStat[] = cats.map((cat) => {
    const group = etfs.filter((e) => e.category === cat);
    const validGroup = group.filter((e) => e.return1y !== null);
    const avg1y =
      validGroup.length > 0
        ? validGroup.reduce((s, e) => s + (e.return1y ?? 0), 0) / validGroup.length
        : null;
    const sharpGroup = group.filter((e) => e.sharpeRatio !== null);
    const avgSharpe =
      sharpGroup.length > 0
        ? sharpGroup.reduce((s, e) => s + (e.sharpeRatio ?? 0), 0) / sharpGroup.length
        : null;
    const totalAumCat = group.reduce((s, e) => s + (e.aum ?? 0), 0);
    return {
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      count: group.length,
      avg1y,
      avgSharpe,
      totalAum: totalAumCat,
    };
  });
  categoryStats.sort((a, b) => (b.avg1y ?? -99) - (a.avg1y ?? -99));

  // Top & Flop 5 sur 1 an
  const top5 = [...valid]
    .sort((a, b) => (b.return1y ?? -99) - (a.return1y ?? -99))
    .slice(0, 5);
  const flop5 = [...valid]
    .sort((a, b) => (a.return1y ?? 99) - (b.return1y ?? 99))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">ETF suivis</div>
            <div className="mt-1 text-2xl font-bold">{etfs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">AUM total catalogué</div>
            <div className="mt-1 text-2xl font-bold">{fmtAum(totalAum)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">TER moyen</div>
            <div className="mt-1 text-2xl font-bold">{avgTer.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Hausse sur 1 an</div>
            <div className="mt-1 text-2xl font-bold">
              {valid.length > 0 ? (
                <>
                  <span className="text-emerald-600">{positiveCount}</span>
                  <span className="text-base font-normal text-muted-foreground">
                    /{valid.length} ETF
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performances par catégorie + Top/Flop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Performance 1 an par catégorie</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Catégorie</th>
                  <th className="px-4 py-2 text-right font-medium">ETF</th>
                  <th className="px-4 py-2 text-right font-medium">Moy. 1an</th>
                  <th className="px-4 py-2 text-right font-medium">AUM</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((c) => (
                  <tr key={c.category} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{c.label}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{c.count}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono font-medium ${
                        c.avg1y === null
                          ? "text-muted-foreground"
                          : c.avg1y >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {fmtPct(c.avg1y)}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {c.totalAum > 0 ? fmtAum(c.totalAum) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Top 5 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-sm">Top 5 — Meilleurs 1 an</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {top5.map((e, i) => (
                <Link
                  key={e.isin}
                  href={`/etf/${e.isin}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="text-sm font-medium">{e.ticker}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {e.shortName}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-600">
                    {fmtPct(e.return1y)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Flop 5 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm">Flop 5 — Moins bons 1 an</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {flop5.map((e, i) => (
                <Link
                  key={e.isin}
                  href={`/etf/${e.isin}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="text-sm font-medium">{e.ticker}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {e.shortName}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-red-600">
                    {fmtPct(e.return1y)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
