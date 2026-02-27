"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DEFAULT_PORTFOLIO } from "@/lib/constants";
import { computeProjection } from "@/lib/portfolio";

const PIE_COLORS = ["#2563eb", "#16a34a", "#dc2626"];
const RATES = [0.06, 0.08, 0.10];
const RATE_COLORS: Record<string, string> = {
  "6%": "#94a3b8",
  "8%": "#2563eb",
  "10%": "#16a34a",
};

export function PortfolioClient() {
  const [rate, setRate] = useState(0.08);

  const config = {
    ...DEFAULT_PORTFOLIO,
    expectedAnnualReturn: rate,
    holdings: DEFAULT_PORTFOLIO.holdings.map((h) => ({
      ...h,
      currentValue: Math.round(DEFAULT_PORTFOLIO.initialCapital * h.allocation),
    })),
  };

  const projection = useMemo(() => computeProjection(config), [rate]);

  const allProjections = useMemo(() => {
    return RATES.map((r) => ({
      rate: r,
      label: `${Math.round(r * 100)}%`,
      data: computeProjection({
        ...config,
        expectedAnnualReturn: r,
      }),
    }));
  }, []);

  // Build merged chart data
  const chartData = useMemo(() => {
    const base = allProjections[0].data;
    return base.map((p, i) => {
      const point: Record<string, number | string> = {
        age: p.age,
        year: p.year,
        invested: p.totalInvested,
      };
      for (const proj of allProjections) {
        point[proj.label] = proj.data[i]?.projectedValue ?? 0;
      }
      return point;
    });
  }, [allProjections]);

  const millionPoint = projection.find((p) => p.projectedValue >= 1_000_000);
  const retirementPoint = projection[projection.length - 1];

  const pieData = DEFAULT_PORTFOLIO.holdings.map((h) => ({
    name: h.ticker,
    value: h.allocation * 100,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Investissement mensuel</div>
            <div className="mt-1 text-2xl font-bold">{DEFAULT_PORTFOLIO.monthlyTotal} EUR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Millionnaire a</div>
            <div className="mt-1 text-2xl font-bold">
              {millionPoint ? `${millionPoint.age} ans (${millionPoint.year})` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Patrimoine retraite (64 ans)</div>
            <div className="mt-1 text-2xl font-bold">
              {retirementPoint
                ? `${Math.round(retirementPoint.projectedValue / 1000)} k EUR`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ETF</TableHead>
                  <TableHead className="text-right">Alloc.</TableHead>
                  <TableHead className="text-right">EUR/mois</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEFAULT_PORTFOLIO.holdings.map((h) => (
                  <TableRow key={h.isin}>
                    <TableCell className="font-medium">{h.ticker}</TableCell>
                    <TableCell className="text-right">{Math.round(h.allocation * 100)}%</TableCell>
                    <TableCell className="text-right">{h.monthlyInvestment} EUR</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Projection PEA</CardTitle>
              <div className="flex gap-1">
                {RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRate(r)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      rate === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {Math.round(r * 100)}%/an
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(age: number) => `${age} ans`}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : `${Math.round(v / 1000)}k`
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${Math.round(Number(value)).toLocaleString("fr-FR")} EUR`,
                    String(name) === "invested" ? "Investi" : `Scenario ${name}`,
                  ]}
                  labelFormatter={(age) => `${age} ans`}
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.1}
                  strokeDasharray="5 5"
                />
                {allProjections.map((proj) => (
                  <Area
                    key={proj.label}
                    type="monotone"
                    dataKey={proj.label}
                    stroke={RATE_COLORS[proj.label]}
                    fill={RATE_COLORS[proj.label]}
                    fillOpacity={rate === proj.rate ? 0.15 : 0.03}
                    strokeWidth={rate === proj.rate ? 2.5 : 1}
                  />
                ))}
                <ReferenceLine
                  y={1_000_000}
                  stroke="#dc2626"
                  strokeDasharray="8 4"
                  label={{ value: "1 000 000 EUR", position: "right", fontSize: 11 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projection detaillee ({Math.round(rate * 100)}%/an)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Age</TableHead>
                <TableHead>Annee</TableHead>
                <TableHead className="text-right">Total investi</TableHead>
                <TableHead className="text-right">Valeur projetee</TableHead>
                <TableHead className="text-right">Plus-value</TableHead>
                <TableHead>Jalon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection
                .filter((_, i) => i % 5 === 0 || i === projection.length - 1)
                .map((p) => (
                  <TableRow key={p.year} className={p.label ? "bg-primary/5 font-medium" : ""}>
                    <TableCell>{p.age} ans</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell className="text-right font-mono">
                      {p.totalInvested.toLocaleString("fr-FR")} EUR
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">
                      {p.projectedValue.toLocaleString("fr-FR")} EUR
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(p.projectedValue - p.totalInvested).toLocaleString("fr-FR")} EUR
                    </TableCell>
                    <TableCell>{p.label || ""}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
