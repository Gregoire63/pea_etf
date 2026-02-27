"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { computeProjection } from "@/lib/portfolio";
import {
  computePortfolioStrategy,
  computeRiskProfile,
  type PortfolioStrategy,
  type RiskProfile,
} from "@/lib/portfolio-strategy";
import { useUserProfile, type UserProfile } from "@/hooks/use-user-profile";
import { EtfScoreBadge } from "@/components/dashboard/etf-score-badge";
import type { EtfRankedEntry } from "@/types/etf";
import Link from "next/link";
import { User, RotateCcw, Pencil, Save, Info, TrendingUp, ShieldCheck, Flame } from "lucide-react";

const RATES = [0.06, 0.08, 0.10];
const RATE_COLORS: Record<string, string> = {
  "6%": "#94a3b8",
  "8%": "#2563eb",
  "10%": "#16a34a",
};
const PEA_PLAFOND = 150_000;
const CURRENT_YEAR = new Date().getFullYear();

function formatEur(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M€`;
  if (v >= 1_000) return `${Math.round(v / 1000)} k€`;
  return `${Math.round(v)} €`;
}

function fmtAumShort(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} M`;
  return `${v.toLocaleString("fr-FR")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile form
// ─────────────────────────────────────────────────────────────────────────────

type FormValues = {
  birthYear: string;
  currentPeaCapital: string;
  monthlyInvestment: string;
  retirementAge: string;
};

const EMPTY_FORM: FormValues = {
  birthYear: "",
  currentPeaCapital: "",
  monthlyInvestment: "",
  retirementAge: "",
};

function profileToForm(p: UserProfile): FormValues {
  return {
    birthYear: String(p.birthYear),
    currentPeaCapital: String(p.currentPeaCapital),
    monthlyInvestment: String(p.monthlyInvestment),
    retirementAge: String(p.retirementAge),
  };
}

function formToProfile(f: FormValues): UserProfile | null {
  const birthYear = parseInt(f.birthYear);
  const currentPeaCapital = parseFloat(f.currentPeaCapital);
  const monthlyInvestment = parseFloat(f.monthlyInvestment);
  const retirementAge = parseInt(f.retirementAge);
  if (
    isNaN(birthYear) || birthYear < 1930 || birthYear > CURRENT_YEAR - 18 ||
    isNaN(currentPeaCapital) || currentPeaCapital < 0 ||
    isNaN(monthlyInvestment) || monthlyInvestment <= 0 ||
    isNaN(retirementAge) || retirementAge < 50 || retirementAge > 75
  ) return null;
  return { birthYear, currentPeaCapital, monthlyInvestment, retirementAge };
}

function ProfileForm({
  initial,
  onSave,
  onCancel,
  showCancel,
}: {
  initial: FormValues;
  onSave: (p: UserProfile) => void;
  onCancel?: () => void;
  showCancel: boolean;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormValues, v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleSave = () => {
    const profile = formToProfile(values);
    if (!profile) {
      setError("Veuillez remplir tous les champs correctement.");
      return;
    }
    setError(null);
    onSave(profile);
  };

  const currentAge = parseInt(values.birthYear)
    ? CURRENT_YEAR - parseInt(values.birthYear)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Année de naissance
          </label>
          <input
            type="number"
            placeholder="ex. 1990"
            value={values.birthYear}
            min={1930}
            max={CURRENT_YEAR - 18}
            onChange={(e) => set("birthYear", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          {currentAge !== null && currentAge > 0 && (
            <p className="text-xs text-muted-foreground">Âge actuel : {currentAge} ans</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Épargne PEA actuelle
          </label>
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
            <input
              type="number"
              placeholder="ex. 5000"
              value={values.currentPeaCapital}
              min={0}
              max={PEA_PLAFOND}
              onChange={(e) => set("currentPeaCapital", e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-muted-foreground shrink-0">€</span>
          </div>
          <p className="text-xs text-muted-foreground">Plafond : 150 000 €</p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Versement mensuel
          </label>
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
            <input
              type="number"
              placeholder="ex. 300"
              value={values.monthlyInvestment}
              min={1}
              onChange={(e) => set("monthlyInvestment", e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-muted-foreground shrink-0">€/mois</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Âge de retraite visé
          </label>
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
            <input
              type="number"
              placeholder="ex. 62"
              value={values.retirementAge}
              min={50}
              max={75}
              onChange={(e) => set("retirementAge", e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-muted-foreground shrink-0">ans</span>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Save className="h-3.5 w-3.5" />
          Enregistrer mon profil
        </button>
        {showCancel && onCancel && (
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Annuler
          </button>
        )}
      </div>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3 w-3 shrink-0" />
        Données sauvegardées uniquement dans la session de votre navigateur.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ETF strategy section
// ─────────────────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<
  RiskProfile,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    Icon: React.ElementType;
    returnMin: number;
    returnMax: number;
    desc: string;
  }
> = {
  agressif:  { label: "Agressif",  color: "text-emerald-700", bgColor: "bg-emerald-50",  borderColor: "border-emerald-300", Icon: Flame,       returnMin: 8, returnMax: 10, desc: "Long horizon, croissance maximale"  },
  équilibré: { label: "Équilibré", color: "text-blue-700",    bgColor: "bg-blue-50",     borderColor: "border-blue-300",    Icon: TrendingUp,  returnMin: 7, returnMax: 8,  desc: "Équilibre performance / risque"    },
  défensif:  { label: "Défensif",  color: "text-amber-700",   bgColor: "bg-amber-50",    borderColor: "border-amber-300",   Icon: ShieldCheck, returnMin: 5, returnMax: 6,  desc: "Préservation du capital"           },
};

const ROLE_COLORS = {
  "Cœur":       "bg-primary/10 text-primary",
  "Complément": "bg-blue-100 text-blue-700",
  "Satellite":  "bg-muted text-muted-foreground",
};

const BAR_COLORS  = ["bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-400"];
const TEXT_COLORS = ["text-primary", "text-blue-600", "text-emerald-600", "text-amber-500"];

function EtfStrategySection({
  strategy,
  rankedEtfs,
  selectedProfile,
  onProfileChange,
}: {
  strategy: PortfolioStrategy;
  rankedEtfs: EtfRankedEntry[];
  selectedProfile: RiskProfile;
  onProfileChange: (p: RiskProfile) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Stratégie ETF recommandée</CardTitle>

        {/* ── Sélecteur de profil ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {(["agressif", "équilibré", "défensif"] as RiskProfile[]).map((p) => {
            const c = RISK_CONFIG[p];
            const isSelected = selectedProfile === p;
            const isComputed = strategy.computedProfile === p;
            return (
              <button
                key={p}
                onClick={() => onProfileChange(p)}
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                  isSelected
                    ? `${c.bgColor} ${c.borderColor} ${c.color}`
                    : "border-muted bg-muted/20 text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/40"
                }`}
              >
                {isComputed && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground whitespace-nowrap">
                    Recommandé
                  </span>
                )}
                <c.Icon className="h-5 w-5" />
                <span className="text-sm font-semibold">{c.label}</span>
                <span className="text-xs opacity-80">{c.returnMin}–{c.returnMax}%/an</span>
                <span className="text-[10px] opacity-60">{c.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Rationale */}
        <p className="text-sm text-muted-foreground pt-2">{strategy.rationale}</p>

        {strategy.simplify && (
          <p className="text-xs text-amber-600 font-medium">
            Version simplifiée — versement &lt; 200 €/mois : moins d&apos;ETFs pour réduire les frais de courtage et maximiser la régularité.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Barre d'allocation visuelle ─────────────────────────────────── */}
        <div>
          <div className="flex h-5 w-full overflow-hidden rounded-full border">
            {strategy.etfs.map((etf, i) => (
              <div
                key={etf.isin}
                className={`${BAR_COLORS[i % BAR_COLORS.length]} flex items-center justify-center transition-all`}
                style={{ width: `${etf.weight}%` }}
                title={`${etf.shortName} — ${etf.weight}%`}
              >
                {etf.weight >= 15 && (
                  <span className="text-[10px] font-semibold text-white">{etf.weight}%</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {strategy.etfs.map((etf, i) => (
              <div key={etf.isin} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-2.5 w-2.5 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                {etf.shortName} ({etf.weight}%)
              </div>
            ))}
          </div>
        </div>

        {/* ── ETF cards ─────────────────────────────────────────────────── */}
        <div className="divide-y rounded-lg border">
          {strategy.etfs.map((etf, i) => {
            const live = rankedEtfs.find((r) => r.isin === etf.isin);
            return (
              <div key={etf.isin} className="flex gap-4 p-4 hover:bg-muted/20 transition-colors">
                {/* Poids */}
                <div className="flex w-12 shrink-0 flex-col items-center justify-start pt-1">
                  <div className={`text-xl font-bold ${TEXT_COLORS[i % TEXT_COLORS.length]}`}>
                    {etf.weight}%
                  </div>
                  <div className={`mt-1 h-1 w-8 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Nom + badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[etf.role]}`}>
                      {etf.role}
                    </span>
                    <Link
                      href={`/etf/${etf.isin}`}
                      className="text-sm font-semibold hover:text-primary hover:underline"
                    >
                      {etf.shortName}
                    </Link>
                    <span className="text-xs text-muted-foreground font-mono">{etf.ticker}</span>
                  </div>

                  {/* Indice */}
                  <div className="text-xs text-muted-foreground">{etf.index}</div>

                  {/* Données live du classement */}
                  {live && (
                    <div className="flex flex-wrap items-center gap-3">
                      <EtfScoreBadge score={live.score} />
                      <span className="text-xs text-muted-foreground">
                        TER{" "}
                        <span className="font-medium text-foreground">
                          {(live.ter * 100).toFixed(2)}%
                        </span>
                      </span>
                      {live.return1y !== null && (
                        <span
                          className={`text-xs font-medium ${
                            live.return1y >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          1 an : {live.return1y >= 0 ? "+" : ""}
                          {(live.return1y * 100).toFixed(1)}%
                        </span>
                      )}
                      {live.return3y !== null && (
                        <span
                          className={`text-xs font-medium ${
                            live.return3y >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          3 ans : {live.return3y >= 0 ? "+" : ""}
                          {(live.return3y * 100).toFixed(1)}%
                        </span>
                      )}
                      {live.aum !== null && (
                        <span className="text-xs text-muted-foreground">
                          Encours{" "}
                          <span className="font-medium text-foreground">
                            {fmtAumShort(live.aum)}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Raison */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{etf.reason}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Recommandation indicative basée sur votre profil déclaré — pas un conseil en investissement.
          Les performances et données financières proviennent de Yahoo Finance et sont mises à jour en temps réel.
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Projection dashboard
// ─────────────────────────────────────────────────────────────────────────────

function ProjectionDashboard({
  profile,
  rankedEtfs,
}: {
  profile: UserProfile;
  rankedEtfs: EtfRankedEntry[];
}) {
  const [rate, setRate] = useState(0.08);
  const currentAge = CURRENT_YEAR - profile.birthYear;

  // Profil calculé automatiquement — se reset si le profil utilisateur change
  const computedProfile = useMemo(() => computeRiskProfile(profile), [profile]);
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<RiskProfile>(computedProfile);
  useEffect(() => {
    setSelectedRiskProfile(computedProfile);
  }, [computedProfile]);

  const strategy = useMemo(
    () => computePortfolioStrategy(profile, selectedRiskProfile),
    [profile, selectedRiskProfile]
  );

  const baseConfig = {
    holdings: [],
    monthlyTotal: profile.monthlyInvestment,
    startYear: CURRENT_YEAR,
    birthYear: profile.birthYear,
    retirementAge: profile.retirementAge,
    initialCapital: profile.currentPeaCapital,
  };

  const projection = useMemo(
    () => computeProjection({ ...baseConfig, expectedAnnualReturn: rate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, rate]
  );

  const allProjections = useMemo(
    () =>
      RATES.map((r) => ({
        rate: r,
        label: `${Math.round(r * 100)}%`,
        data: computeProjection({ ...baseConfig, expectedAnnualReturn: r }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile]
  );

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
  const plafondPoint = projection.find((p) => p.totalInvested >= PEA_PLAFOND);

  const monthlyRetirementIncome = retirementPoint
    ? Math.round((retirementPoint.projectedValue * 0.04) / 12)
    : null;

  const retirementGains = retirementPoint
    ? retirementPoint.projectedValue - retirementPoint.totalInvested
    : 0;
  const taxSavings = Math.round(retirementGains * (0.30 - 0.172));

  const yearsUntilRetirement = profile.retirementAge - currentAge;

  return (
    <div className="space-y-6">
      {/* ── 1. Stratégie ETF (en premier) ───────────────────────────────── */}
      <EtfStrategySection
        strategy={strategy}
        rankedEtfs={rankedEtfs}
        selectedProfile={selectedRiskProfile}
        onProfileChange={setSelectedRiskProfile}
      />

      {/* ── 2. Résumé chiffré ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Versement mensuel</div>
            <div className="mt-1 text-2xl font-bold">
              {profile.monthlyInvestment.toLocaleString("fr-FR")} €
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {(profile.monthlyInvestment * 12).toLocaleString("fr-FR")} €/an ·{" "}
              {yearsUntilRetirement} ans restants
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Plafond PEA (150 k€)</div>
            <div className="mt-1 text-2xl font-bold">
              {profile.currentPeaCapital >= PEA_PLAFOND
                ? "Déjà atteint"
                : plafondPoint
                ? `${plafondPoint.age} ans (${plafondPoint.year})`
                : "Non atteint"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Versements cumulés limités à 150 000 €
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Millionnaire (scénario {Math.round(rate * 100)}%)
            </div>
            <div className="mt-1 text-2xl font-bold">
              {millionPoint ? `${millionPoint.age} ans (${millionPoint.year})` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Patrimoine à {profile.retirementAge} ans
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">
              {retirementPoint ? formatEur(retirementPoint.projectedValue) : "—"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Scénario {Math.round(rate * 100)}%/an
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Métriques avancées ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Revenu mensuel à la retraite</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">
              {monthlyRetirementIncome
                ? `${monthlyRetirementIncome.toLocaleString("fr-FR")} €/mois`
                : "—"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Règle des 4% · retrait annuel durable
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Économie fiscale PEA vs CTO</div>
            <div className="mt-1 text-xl font-bold text-blue-600">
              {taxSavings > 0 ? `+${formatEur(taxSavings)}` : "—"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              PEA : 17,2% PS · CTO : 30% PFU sur plus-values
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Plus-value estimée</div>
            <div className="mt-1 text-xl font-bold">
              {retirementPoint ? formatEur(retirementGains) : "—"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Valeur portefeuille − total versé
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Graphique ─────────────────────────────────────────────────── */}
      <Card>
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
          <ResponsiveContainer width="100%" height={420}>
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
                  `${Math.round(Number(value)).toLocaleString("fr-FR")} €`,
                  String(name) === "invested" ? "Total versé" : `Scénario ${name}`,
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
                label={{ value: "1 000 000 €", position: "right", fontSize: 11 }}
              />
              {plafondPoint && (
                <ReferenceLine
                  x={plafondPoint.age}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  label={{ value: "Plafond PEA", position: "insideTopLeft", fontSize: 10 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 5. Tableau détaillé ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Projection détaillée ({Math.round(rate * 100)}%/an)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Âge</TableHead>
                <TableHead>Année</TableHead>
                <TableHead className="text-right">Total versé</TableHead>
                <TableHead className="text-right">Valeur projetée</TableHead>
                <TableHead className="text-right">Plus-value</TableHead>
                <TableHead className="text-right">Revenu/mois (4%)</TableHead>
                <TableHead>Jalon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection
                .filter((_, i) => i % 5 === 0 || i === projection.length - 1)
                .map((p) => {
                  const gains = p.projectedValue - p.totalInvested;
                  const monthlyIncome = Math.round((p.projectedValue * 0.04) / 12);
                  return (
                    <TableRow
                      key={p.year}
                      className={p.label ? "bg-primary/5 font-medium" : ""}
                    >
                      <TableCell>{p.age} ans</TableCell>
                      <TableCell>{p.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {p.totalInvested.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {p.projectedValue.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-600">
                        +{gains.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {monthlyIncome.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell>
                        {p.label ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {p.label}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 6. Notes fiscales ────────────────────────────────────────────── */}
      <Card className="bg-muted/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>Plafond PEA :</strong> 150 000 € de versements maximum. Les plus-values
                et dividendes peuvent faire dépasser ce montant sans problème.
              </p>
              <p>
                <strong>Fiscalité PEA (après 5 ans) :</strong> Pas d&apos;impôt sur le revenu ;
                seulement 17,2% de prélèvements sociaux sur les gains lors du retrait.
              </p>
              <p>
                <strong>Règle des 4% :</strong> Retrait de 4% de la valeur du portefeuille par an,
                permettant de vivre de son capital sans l&apos;épuiser sur ~30 ans.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root client component
// ─────────────────────────────────────────────────────────────────────────────

export function PortfolioClient({ etfs }: { etfs: EtfRankedEntry[] }) {
  const { profile, saveProfile, resetProfile, initialized } = useUserProfile();
  const [editing, setEditing] = useState(false);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Configurez votre profil</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Renseignez vos informations pour obtenir une stratégie ETF et une projection personnalisées.
          </p>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={EMPTY_FORM}
            onSave={(p) => saveProfile(p)}
            showCancel={false}
          />
        </CardContent>
      </Card>
    );
  }

  const currentAge = CURRENT_YEAR - profile.birthYear;

  return (
    <div className="space-y-6">
      {/* Barre de profil */}
      {editing ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Modifier mon profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ProfileForm
              initial={profileToForm(profile)}
              onSave={(p) => {
                saveProfile(p);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
              showCancel={true}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                <span>
                  <span className="text-muted-foreground">Âge : </span>
                  <strong>{currentAge} ans</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">PEA actuel : </span>
                  <strong>{profile.currentPeaCapital.toLocaleString("fr-FR")} €</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Versement : </span>
                  <strong>{profile.monthlyInvestment.toLocaleString("fr-FR")} €/mois</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Retraite visée : </span>
                  <strong>{profile.retirementAge} ans</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </button>
              <button
                onClick={resetProfile}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                title="Réinitialiser le profil"
              >
                <RotateCcw className="h-3 w-3" />
                Réinitialiser
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {!editing && <ProjectionDashboard profile={profile} rankedEtfs={etfs} />}
    </div>
  );
}
