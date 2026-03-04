"use client";

import { use, useEffect, useMemo, useState, Suspense } from "react";
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
  type StrategyEtf,
} from "@/lib/portfolio-strategy";
import { useUserProfile, type UserProfile } from "@/hooks/use-user-profile";
import { useBroker } from "@/hooks/use-broker";
import { useEnvelope } from "@/hooks/use-envelope";
import { EtfScoreBadge } from "@/components/dashboard/etf-score-badge";
import { BrokerSelector } from "@/components/portfolio/broker-selector";
import { EnvelopeToggle } from "@/components/portfolio/envelope-toggle";
import { PurchasePlanCard } from "@/components/portfolio/purchase-plan-card";
import { computePurchasePlan, type EtfPriceInfo } from "@/lib/purchase-planner";
import { getBrokerById, isSelfDirected, estimateAnnualFeeRate, estimateTradeFee, hasManagedOption, estimateManagedFeeRate } from "@/lib/brokers";
import { PEA_PLAFOND, PEA_TAX_RATE, CTO_TAX_RATE, getTaxRate, type Envelope } from "@/lib/constants";
import type { BrokerId } from "@/types/broker";
import type { EtfRankedEntry } from "@/types/etf";
import { useManagementMode, type ManagementMode } from "@/hooks/use-management-mode";
import { ManagementModeToggle } from "@/components/portfolio/management-mode-toggle";
import { ManagedProfileCard } from "@/components/portfolio/managed-profile-card";
import Link from "next/link";
import { User, RotateCcw, Pencil, Save, Info, TrendingUp, ShieldCheck, Flame, AlertTriangle, Zap } from "lucide-react";

const RATES = [0.06, 0.08, 0.10];
const RATE_COLORS: Record<string, string> = {
  "6%": "#94a3b8",
  "8%": "#2563eb",
  "10%": "#16a34a",
};
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
    isNaN(birthYear) || birthYear < CURRENT_YEAR - 100 || birthYear > CURRENT_YEAR - 18 ||
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
  envelope = "pea",
}: {
  initial: FormValues;
  onSave: (p: UserProfile) => void;
  onCancel?: () => void;
  showCancel: boolean;
  envelope?: Envelope;
}) {
  const isPea = envelope === "pea";
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
    <form
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            Année de naissance
          </label>
          <input
            type="number"
            placeholder="ex. 1990"
            value={values.birthYear}
            min={CURRENT_YEAR - 100}
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
            {isPea ? "Épargne PEA actuelle" : "Capital CTO actuel"}
          </label>
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
            <input
              type="number"
              placeholder="ex. 5000"
              value={values.currentPeaCapital}
              min={0}
              max={isPea ? PEA_PLAFOND : undefined}
              onChange={(e) => set("currentPeaCapital", e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-muted-foreground shrink-0">€</span>
          </div>
          {isPea && <p className="text-xs text-muted-foreground">Plafond versements : 150 000 €</p>}
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
          type="submit"
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Save className="h-3.5 w-3.5" />
          Enregistrer mon profil
        </button>
        {showCancel && onCancel && (
          <button
            type="button"
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
    </form>
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

const BAR_COLORS      = ["bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-400"];
const BAR_TEXT_COLORS = ["text-primary-foreground", "text-white", "text-white", "text-white"];
const TEXT_COLORS = ["text-primary", "text-blue-600", "text-emerald-600", "text-amber-500"];

// ─────────────────────────────────────────────────────────────────────────────
// Market timing signals — analyse des conditions d'entrée
// ─────────────────────────────────────────────────────────────────────────────

interface MarketSignal {
  label: string;
  className: string;
  type: "opportunity" | "neutral" | "caution";
  score: number;
}

function getMarketSignals(live: EtfRankedEntry): MarketSignal[] {
  const signals: MarketSignal[] = [];

  // YTD
  if (live.ytdReturn !== null) {
    if (live.ytdReturn <= -0.10) {
      signals.push({
        label: `${(live.ytdReturn * 100).toFixed(1)}% YTD`,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        type: "opportunity",
        score: 10,
      });
    } else if (live.ytdReturn <= -0.05) {
      signals.push({
        label: `${(live.ytdReturn * 100).toFixed(1)}% YTD`,
        className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        type: "opportunity",
        score: 5,
      });
    } else if (live.ytdReturn <= -0.03) {
      signals.push({
        label: `${(live.ytdReturn * 100).toFixed(1)}% YTD`,
        className: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
        type: "opportunity",
        score: 3,
      });
    } else if (live.ytdReturn >= 0.15) {
      signals.push({
        label: `+${(live.ytdReturn * 100).toFixed(1)}% YTD`,
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        type: "neutral",
        score: 0,
      });
    }
  }

  // 52-week high proximity
  if (live.currentPrice !== null && live.fiftyTwoWeekHigh !== null) {
    const fromHigh = ((live.currentPrice - live.fiftyTwoWeekHigh) / live.fiftyTwoWeekHigh) * 100;
    if (fromHigh > -3) {
      signals.push({
        label: "Proche du pic annuel",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        type: "caution",
        score: -5,
      });
    } else if (fromHigh < -15) {
      signals.push({
        label: `${fromHigh.toFixed(0)}% vs pic annuel`,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        type: "opportunity",
        score: 10,
      });
    } else if (fromHigh < -10) {
      signals.push({
        label: `${fromHigh.toFixed(0)}% vs pic annuel`,
        className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        type: "opportunity",
        score: 5,
      });
    } else if (fromHigh < -5) {
      signals.push({
        label: `${fromHigh.toFixed(0)}% vs pic annuel`,
        className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        type: "neutral",
        score: 3,
      });
    }
  }

  return signals;
}

interface MarketOpportunity {
  etf: StrategyEtf;
  live: EtfRankedEntry;
  signals: MarketSignal[];
  score: number;
  reason: string;
}

function findBestOpportunity(
  strategyEtfs: StrategyEtf[],
  rankedEtfs: EtfRankedEntry[],
): MarketOpportunity | null {
  let best: MarketOpportunity | null = null;

  for (const etf of strategyEtfs) {
    const live = rankedEtfs.find((r) => r.isin === etf.isin);
    if (!live || !live.currentPrice) continue;

    const signals = getMarketSignals(live);
    const score = signals.reduce((sum, s) => sum + s.score, 0);

    if (!best || score > best.score) {
      const reasons: string[] = [];
      if (live.ytdReturn !== null && live.ytdReturn < -0.03) {
        reasons.push(`en baisse de ${(live.ytdReturn * 100).toFixed(1)}% depuis le début d'année`);
      }
      if (live.currentPrice && live.fiftyTwoWeekHigh) {
        const fromHigh = ((live.currentPrice - live.fiftyTwoWeekHigh) / live.fiftyTwoWeekHigh) * 100;
        if (fromHigh < -5) {
          reasons.push(`à ${fromHigh.toFixed(0)}% de son plus haut annuel`);
        }
      }

      const reason = reasons.length > 0
        ? `${etf.shortName} est ${reasons.join(" et ")} — point d'entrée favorable pour renforcer cette ligne.`
        : `${etf.shortName} présente les meilleures conditions parmi vos ETFs.`;

      best = { etf, live, signals, score, reason };
    }
  }

  return best && best.score > 3 ? best : null;
}

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
  const opportunity = useMemo(
    () => findBestOpportunity(strategy.etfs, rankedEtfs),
    [strategy.etfs, rankedEtfs]
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Stratégie ETF recommandée</CardTitle>

        {/* ── Sélecteur de profil ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 pt-1 sm:gap-3">
          {(["agressif", "équilibré", "défensif"] as RiskProfile[]).map((p) => {
            const c = RISK_CONFIG[p];
            const isSelected = selectedProfile === p;
            const isComputed = strategy.computedProfile === p;
            return (
              <button
                key={p}
                onClick={() => onProfileChange(p)}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl border-2 px-1.5 py-2 text-center transition-all sm:gap-1 sm:px-3 sm:py-3 ${
                  isSelected
                    ? `${c.bgColor} ${c.borderColor} ${c.color}`
                    : "border-muted bg-muted/20 text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/40"
                }`}
              >
                {isComputed && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground whitespace-nowrap sm:px-2 sm:text-[10px]">
                    Recommandé
                  </span>
                )}
                <c.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[11px] font-semibold sm:text-sm">{c.label}</span>
                <span className="text-[9px] opacity-80 sm:text-xs">
                  {isSelected
                    ? `${Math.round(strategy.expectedReturnMin * 100)}–${Math.round(strategy.expectedReturnMax * 100)}%/an`
                    : `${c.returnMin}–${c.returnMax}%/an`}
                </span>
                <span className="hidden text-[10px] opacity-60 sm:block">{c.desc}</span>
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
                  <span className={`text-[10px] font-semibold ${BAR_TEXT_COLORS[i % BAR_TEXT_COLORS.length]}`}>{etf.weight}%</span>
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

        {/* ── Opportunité du mois ───────────────────────────────────────── */}
        {opportunity && (
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Opportunité du mois
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
              {opportunity.reason}
            </p>
            {opportunity.signals.filter((s) => s.type === "opportunity").length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {opportunity.signals
                  .filter((s) => s.type === "opportunity")
                  .map((s) => (
                    <span key={s.label} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── ETF cards ─────────────────────────────────────────────────── */}
        <div className="divide-y rounded-lg border">
          {strategy.etfs.map((etf, i) => {
            const live = rankedEtfs.find((r) => r.isin === etf.isin);
            return (
              <div key={etf.isin} className="p-3 hover:bg-muted/20 transition-colors sm:p-4">
                {/* Ligne du haut : pourcentage + badges + nom */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-base font-bold shrink-0 sm:text-xl ${TEXT_COLORS[i % TEXT_COLORS.length]}`}>
                    {etf.weight}%
                  </span>
                  <div className={`h-1 w-5 rounded-full shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${ROLE_COLORS[etf.role]}`}>
                    {etf.role}
                  </span>
                  <Link
                    href={`/etf/${etf.isin}`}
                    className="min-w-0 truncate text-xs font-semibold hover:text-primary hover:underline sm:text-sm"
                  >
                    {etf.shortName}
                  </Link>
                  <span className="hidden text-xs text-muted-foreground font-mono sm:inline">{etf.ticker}</span>
                </div>

                {/* Indice */}
                <div className="text-[11px] text-muted-foreground mb-1 sm:text-xs">{etf.index}</div>

                {/* Données live */}
                {live && (
                  <div className="flex flex-wrap items-center gap-2 mb-1 sm:gap-3">
                    <EtfScoreBadge score={live.score} />
                    <span className="text-[11px] text-muted-foreground sm:text-xs">
                      TER <span className="font-medium text-foreground">{(live.ter * 100).toFixed(2)}%</span>
                    </span>
                    {live.return1y !== null && (
                      <span className={`text-[11px] font-medium sm:text-xs ${live.return1y >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        1an {live.return1y >= 0 ? "+" : ""}{(live.return1y * 100).toFixed(1)}%
                      </span>
                    )}
                    {live.return3y !== null && (
                      <span className={`hidden text-xs font-medium sm:inline ${live.return3y >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        3ans {live.return3y >= 0 ? "+" : ""}{(live.return3y * 100).toFixed(1)}%
                      </span>
                    )}
                    {getMarketSignals(live).map((s) => (
                      <span key={s.label} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Raison */}
                <p className="text-[11px] text-muted-foreground leading-relaxed sm:text-sm">{etf.reason}</p>
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

// Charge les données ETF via use() — suspend jusqu'à résolution.
// Calcule la stratégie ICI avec les données live pour une sélection dynamique.
function EtfStrategyLoader({
  etfsPromise,
  profile,
  selectedProfile,
  onProfileChange,
}: {
  etfsPromise: Promise<EtfRankedEntry[]>;
  profile: UserProfile;
  selectedProfile: RiskProfile;
  onProfileChange: (p: RiskProfile) => void;
}) {
  const etfs = use(etfsPromise);
  const strategy = useMemo(
    () => computePortfolioStrategy(profile, selectedProfile, etfs),
    [profile, selectedProfile, etfs]
  );
  return (
    <EtfStrategySection
      strategy={strategy}
      rankedEtfs={etfs}
      selectedProfile={selectedProfile}
      onProfileChange={onProfileChange}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase plan loader — suspend avec les mêmes données ETF
// ─────────────────────────────────────────────────────────────────────────────

function PurchasePlanLoader({
  etfsPromise,
  profile,
  selectedProfile,
  brokerId,
  envelope,
}: {
  etfsPromise: Promise<EtfRankedEntry[]>;
  profile: UserProfile;
  selectedProfile: RiskProfile;
  brokerId: BrokerId;
  envelope: Envelope;
}) {
  const broker = getBrokerById(brokerId);

  // Gestion pilotée : pas de plan d'achat individuel
  if (!isSelfDirected(broker)) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">{broker.name} — Gestion pilotée</p>
              <p className="text-muted-foreground">
                Avec {broker.name}, votre portefeuille est géré automatiquement par des experts.
                Vous n&apos;avez pas besoin de passer d&apos;ordres vous-même.
                {broker.fees.managementFee && (
                  <> Frais de gestion : {broker.fees.managementFee.detail}.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const etfs = use(etfsPromise);
  const strategy = useMemo(
    () => computePortfolioStrategy(profile, selectedProfile, etfs),
    [profile, selectedProfile, etfs]
  );

  const plan = useMemo(() => {
    const prices: EtfPriceInfo[] = strategy.etfs
      .map((se) => {
        const live = etfs.find((e) => e.isin === se.isin);
        if (!live || !live.currentPrice) return null;
        return {
          isin: se.isin,
          ticker: se.ticker,
          shortName: se.shortName,
          currentPrice: live.currentPrice,
          ytdReturn: live.ytdReturn ?? null,
          return1y: live.return1y ?? null,
          fiftyTwoWeekHigh: live.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: live.fiftyTwoWeekLow ?? null,
        };
      })
      .filter((p): p is EtfPriceInfo => p !== null);

    return computePurchasePlan({
      monthlyBudget: profile.monthlyInvestment,
      strategyEtfs: strategy.etfs,
      prices,
      broker,
    });
  }, [strategy, etfs, broker, profile.monthlyInvestment]);

  return <PurchasePlanCard plan={plan} monthlyBudget={profile.monthlyInvestment} envelope={envelope} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projection dashboard
// ─────────────────────────────────────────────────────────────────────────────

function ProjectionDashboard({
  profile,
  etfsPromise,
  brokerId,
  envelope,
  managementMode,
}: {
  profile: UserProfile;
  etfsPromise: Promise<EtfRankedEntry[]>;
  brokerId: BrokerId | null;
  envelope: Envelope;
  managementMode: ManagementMode;
}) {
  const isPea = envelope === "pea";
  const taxRate = getTaxRate(envelope);
  const [rate, setRate] = useState(0.08);
  const [mounted, setMounted] = useState(false);
  const currentAge = CURRENT_YEAR - profile.birthYear;
  useEffect(() => { setMounted(true); }, []);

  const computedProfile = useMemo(() => computeRiskProfile(profile), [profile]);
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<RiskProfile>(computedProfile);
  useEffect(() => {
    setSelectedRiskProfile(computedProfile);
  }, [computedProfile]);

  const broker = brokerId ? getBrokerById(brokerId) : null;
  const isProfileeMode = managementMode === "profilee" && broker && hasManagedOption(broker);
  const brokerFeeRate = isProfileeMode ? estimateManagedFeeRate(broker) : (broker ? estimateAnnualFeeRate(broker) : 0);

  // Frais de courtage mensuels estimés (basé sur le montant d'investissement mensuel)
  const monthlyTradeFee = useMemo(() => {
    if (!broker || !isSelfDirected(broker)) return 0;
    // Estimer les frais pour un ordre mensuel du montant total
    return estimateTradeFee(broker, profile.monthlyInvestment);
  }, [broker, profile.monthlyInvestment]);

  // Profil sélectionné pour la gestion profilée
  const [selectedManagedProfile, setSelectedManagedProfile] = useState<string | null>(null);

  const baseConfig = {
    holdings: [],
    monthlyTotal: profile.monthlyInvestment,
    startYear: CURRENT_YEAR,
    birthYear: profile.birthYear,
    retirementAge: profile.retirementAge,
    initialCapital: profile.currentPeaCapital,
    annualFeeRate: brokerFeeRate,
    monthlyTradeFee,
    envelope,
  };

  const projection = useMemo(
    () => computeProjection({ ...baseConfig, expectedAnnualReturn: rate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, rate, envelope, brokerFeeRate, monthlyTradeFee]
  );

  const allProjections = useMemo(
    () =>
      RATES.map((r) => ({
        rate: r,
        label: `${Math.round(r * 100)}%`,
        data: computeProjection({ ...baseConfig, expectedAnnualReturn: r }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, envelope, brokerFeeRate, monthlyTradeFee]
  );

  const chartData = useMemo(() => {
    // Utiliser la projection du taux sélectionné pour les frais cumulés
    const selectedProj = allProjections.find((p) => p.rate === rate) ?? allProjections[0];
    const base = allProjections[0].data;
    return base.map((p, i) => {
      const point: Record<string, number | string> = {
        age: p.age,
        year: p.year,
        invested: p.totalInvested,
        fees: selectedProj.data[i]?.cumulativeFees ?? 0,
      };
      for (const proj of allProjections) {
        point[proj.label] = proj.data[i]?.projectedValue ?? 0;
      }
      return point;
    });
  }, [allProjections, rate]);

  const millionPoint = projection.find((p) => p.projectedValue >= 1_000_000);
  const retirementPoint = projection[projection.length - 1];
  const plafondPoint = isPea ? projection.find((p) => p.totalInvested >= PEA_PLAFOND) : null;

  // Manque à gagner : différence entre projection sans frais et avec frais
  const feeCost = useMemo(() => {
    if (!broker || (brokerFeeRate === 0 && monthlyTradeFee === 0)) return 0;
    const noFee = computeProjection({ ...baseConfig, expectedAnnualReturn: rate, annualFeeRate: 0, monthlyTradeFee: 0 });
    const noFeeRetirement = noFee[noFee.length - 1]?.projectedValue ?? 0;
    return noFeeRetirement - (retirementPoint?.projectedValue ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, rate, envelope, brokerFeeRate, monthlyTradeFee]);

  // Revenu mensuel basé sur la valeur APRÈS impôts (plus réaliste)
  const monthlyRetirementIncome = retirementPoint
    ? Math.round((retirementPoint.afterTaxValue * 0.04) / 12)
    : null;

  const retirementGains = retirementPoint
    ? retirementPoint.projectedValue - retirementPoint.totalInvested
    : 0;
  const retirementTax = Math.round(Math.max(0, retirementGains) * taxRate);

  // Économie fiscale : différence PEA vs CTO (ou inverse si en CTO)
  const otherTaxRate = isPea ? CTO_TAX_RATE : PEA_TAX_RATE;
  const taxDifference = Math.round(Math.max(0, retirementGains) * Math.abs(taxRate - otherTaxRate));

  const yearsUntilRetirement = profile.retirementAge - currentAge;

  return (
    <div className="space-y-6">
      {/* ── 1. Stratégie ETF + Plan d'achat ──────────────────────────────── */}
      {broker && !isSelfDirected(broker) ? (
        /* Gestion pilotée : pas de stratégie ni de plan d'achat */
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  {broker.name} — Gestion pilotée
                </p>
                <p className="text-muted-foreground">
                  Avec la gestion pilotée, vos ETF sont choisis et gérés automatiquement par {broker.name}.
                  Vous n&apos;avez pas besoin de choisir une stratégie ni de passer d&apos;ordres.
                  {broker.fees.managementFee && (
                    <> Frais de gestion : <strong>{broker.fees.managementFee.detail}</strong> — déduits de la projection ci-dessous.</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isProfileeMode && broker ? (
        /* Gestion profilée optionnelle — carte de profils */
        <ManagedProfileCard
          broker={broker}
          selectedProfile={selectedManagedProfile}
          onSelectProfile={setSelectedManagedProfile}
        />
      ) : (
        <>
          {/* Stratégie ETF — skeleton pendant le chargement des données */}
          <Suspense
            fallback={
              <Card>
                <CardHeader className="pb-4">
                  <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-[9dvh] animate-pulse rounded-xl bg-muted sm:h-24" />
                    ))}
                  </div>
                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[8dvh] animate-pulse rounded-lg bg-muted sm:h-20" />
                  ))}
                </CardContent>
              </Card>
            }
          >
            <EtfStrategyLoader
              etfsPromise={etfsPromise}
              profile={profile}
              selectedProfile={selectedRiskProfile}
              onProfileChange={setSelectedRiskProfile}
            />
          </Suspense>

          {/* Plan d'achat mensuel — si courtier sélectionné */}
          {brokerId && (
            <Suspense
              fallback={
                <Card>
                  <CardHeader className="pb-3">
                    <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-32 animate-pulse rounded-xl bg-muted" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  </CardContent>
                </Card>
              }
            >
              <PurchasePlanLoader
                etfsPromise={etfsPromise}
                profile={profile}
                selectedProfile={selectedRiskProfile}
                brokerId={brokerId}
                envelope={envelope}
              />
            </Suspense>
          )}
        </>
      )}

      {/* ── 2. Résumé chiffré — immédiat ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">Versement mensuel</div>
            <div className="mt-0.5 text-lg font-bold sm:mt-1 sm:text-2xl">
              {profile.monthlyInvestment.toLocaleString("fr-FR")} €
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              {(profile.monthlyInvestment * 12).toLocaleString("fr-FR")} €/an ·{" "}
              {yearsUntilRetirement} ans restants
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            {isPea ? (
              <>
                <div className="text-[11px] text-muted-foreground sm:text-xs">Plafond PEA (150 k€)</div>
                <div className="mt-0.5 text-lg font-bold sm:mt-1 sm:text-2xl">
                  {profile.currentPeaCapital >= PEA_PLAFOND
                    ? "Déjà atteint"
                    : plafondPoint
                    ? `${plafondPoint.age} ans (${plafondPoint.year})`
                    : "Non atteint"}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                  Versements cumulés limités à 150 000 €
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-muted-foreground sm:text-xs">Total investi à la retraite</div>
                <div className="mt-0.5 text-lg font-bold sm:mt-1 sm:text-2xl">
                  {retirementPoint ? formatEur(retirementPoint.totalInvested) : "—"}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                  CTO : pas de plafond de versement
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">
              Millionnaire (scénario {Math.round(rate * 100)}%)
            </div>
            <div className="mt-0.5 text-lg font-bold sm:mt-1 sm:text-2xl">
              {millionPoint ? `${millionPoint.age} ans (${millionPoint.year})` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">
              Patrimoine net à {profile.retirementAge} ans
            </div>
            <div className="mt-0.5 text-lg font-bold text-emerald-600 sm:mt-1 sm:text-2xl">
              {retirementPoint ? formatEur(retirementPoint.afterTaxValue) : "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              Après {isPea ? "PS 18,6 %" : "flat tax 31,4 %"} · scénario {Math.round(rate * 100)}%/an
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Métriques avancées — immédiat ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">Revenu mensuel à la retraite</div>
            <div className="mt-0.5 text-base font-bold text-emerald-600 sm:mt-1 sm:text-xl">
              {monthlyRetirementIncome
                ? `${monthlyRetirementIncome.toLocaleString("fr-FR")} €/mois`
                : "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              Règle des 4% · net après {isPea ? "PS" : "flat tax"}
            </div>
          </CardContent>
        </Card>
        <Card className={
          feeCost >= 20_000
            ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
            : feeCost >= 5_000
              ? "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30"
              : feeCost > 0
                ? "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20"
                : ""
        }>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">
              Coût des frais courtier
            </div>
            <div className={`mt-0.5 text-base font-bold sm:mt-1 sm:text-xl ${
              feeCost >= 20_000
                ? "text-red-600 dark:text-red-400"
                : feeCost >= 5_000
                  ? "text-orange-600 dark:text-orange-400"
                  : feeCost > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {feeCost > 0
                ? `-${formatEur(feeCost)}`
                : broker ? "0 €" : "—"}
            </div>
            {broker && feeCost > 0 && retirementPoint ? (
              <div className="mt-1 space-y-0.5 text-[10px] sm:text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Frais payés</span>
                  <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
                    {formatEur(retirementPoint.cumulativeFees)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Rendements perdus</span>
                  <span className="font-mono font-medium text-red-600 dark:text-red-400">
                    {formatEur(feeCost - retirementPoint.cumulativeFees)}
                  </span>
                </div>
                {broker.fees.custody.max > 0 && (
                  <p className="mt-1.5 text-[9px] leading-snug text-muted-foreground/70 sm:text-[10px]">
                    {broker.fees.custody.detail} — réduisent vos rendements de{" "}
                    {(brokerFeeRate * 100).toFixed(2).replace(".", ",")} %/an
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                {broker
                  ? "Aucun frais récurrents"
                  : "Sélectionnez un courtier"}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">
              {isPea ? "Économie fiscale PEA vs CTO" : "Surcoût fiscal CTO vs PEA"}
            </div>
            <div className={`mt-0.5 text-base font-bold sm:mt-1 sm:text-xl ${isPea ? "text-blue-600" : "text-red-600"}`}>
              {taxDifference > 0
                ? isPea ? `+${formatEur(taxDifference)}` : `-${formatEur(taxDifference)}`
                : "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              PEA : 18,6 % PS · CTO : 31,4 % flat tax
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[11px] text-muted-foreground sm:text-xs">Impôt estimé à la retraite</div>
            <div className="mt-0.5 text-base font-bold sm:mt-1 sm:text-xl">
              {retirementTax > 0 ? formatEur(retirementTax) : "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              {isPea ? "18,6 % PS" : "31,4 % flat tax"} sur {retirementGains > 0 ? formatEur(retirementGains) : "—"} de plus-values
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Graphique — immédiat ────────────────────────────────────────── */}
      <Card className="py-3 gap-2 sm:py-6 sm:gap-6">
        <CardHeader className="px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle>Projection {isPea ? "PEA" : "CTO"}</CardTitle>
            <div className="flex gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-3 ${
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
        <CardContent className="px-2 sm:px-6">
          {mounted ? <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
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
                formatter={(value, name) => {
                  const n = String(name);
                  const label = n === "invested" ? "Total versé" : n === "fees" ? "Frais cumulés" : `Scénario ${n}`;
                  return [`${Math.round(Number(value)).toLocaleString("fr-FR")} €`, label];
                }}
                labelFormatter={(age) => `${age} ans`}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--card-foreground)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--card-foreground)", fontWeight: 600 }}
                itemStyle={{ color: "var(--muted-foreground)" }}
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
          </ResponsiveContainer> : <div className="h-[300px] animate-pulse rounded-lg bg-muted" />}
        </CardContent>
      </Card>

      {/* ── 5. Tableau détaillé — immédiat ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Projection détaillée ({Math.round(rate * 100)}%/an)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Âge</TableHead>
                <TableHead>Année</TableHead>
                <TableHead className="text-right">Total versé</TableHead>
                <TableHead className="text-right">Valeur brute</TableHead>
                <TableHead className="text-right">Après impôts</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Frais cumulés</TableHead>
                <TableHead className="text-right">Revenu/mois (4%)</TableHead>
                <TableHead>Jalon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection
                .filter((_, i) => i % 5 === 0 || i === projection.length - 1)
                .map((p) => {
                  const monthlyIncome = Math.round((p.afterTaxValue * 0.04) / 12);
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
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {p.projectedValue.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {p.afterTaxValue.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600 hidden sm:table-cell">
                        {p.cumulativeFees > 0 ? `${p.cumulativeFees.toLocaleString("fr-FR")} €` : "—"}
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
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Notes fiscales — immédiat ──────────────────────────────────── */}
      <Card className="bg-muted/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-xs text-muted-foreground">
              {isPea ? (
                <>
                  <p>
                    <strong>Plafond PEA :</strong> 150 000 € de versements maximum. Les plus-values
                    et dividendes peuvent faire dépasser ce montant sans problème.
                  </p>
                  <p>
                    <strong>Fiscalité PEA (après 5 ans) :</strong> Pas d&apos;impôt sur le revenu ;
                    seulement 18,6 % de prélèvements sociaux sur les gains lors du retrait (taux 2026, hausse CSG).
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Compte-Titres Ordinaire (CTO) :</strong> Pas de plafond de versement.
                    Les plus-values et dividendes sont imposés à 31,4 % (12,8 % IR + 18,6 % PS) — flat tax 2026.
                  </p>
                  <p>
                    <strong>Comparaison :</strong> le PEA bénéficie d&apos;une fiscalité plus avantageuse
                    (18,6 % PS uniquement après 5 ans) mais limite les versements à 150 000 €.
                  </p>
                </>
              )}
              <p>
                <strong>Règle des 4 % :</strong> Retrait de 4 % de la valeur du portefeuille par an,
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

export function PortfolioClient({ etfsPromise }: { etfsPromise: Promise<EtfRankedEntry[]> }) {
  const { profile, saveProfile, resetProfile, initialized } = useUserProfile();
  const { envelope, saveEnvelope, initialized: envelopeInit } = useEnvelope();
  const { mode: managementMode, saveMode: saveManagementMode, initialized: modeInit } = useManagementMode();
  const { brokerId, saveBroker, initialized: brokerInit } = useBroker();
  const [editing, setEditing] = useState(false);

  // Reset management mode to "libre" when switching to a broker without managed option
  const broker = brokerId ? getBrokerById(brokerId) : null;
  const showModeToggle = broker && hasManagedOption(broker);
  const effectiveMode: ManagementMode = showModeToggle ? managementMode : "libre";

  if (!initialized || !brokerInit || !envelopeInit || !modeInit) {
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
            envelope={envelope}
          />
        </CardContent>
      </Card>
    );
  }

  const currentAge = CURRENT_YEAR - profile.birthYear;

  return (
    <div className="space-y-6">
      {/* Carte de profil — bascule entre affichage et édition sans masquer le dashboard */}
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
              envelope={envelope}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {/* Header row: label + action buttons */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Mon profil</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" />
                  Modifier
                </button>
                <button
                  onClick={resetProfile}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  title="Réinitialiser le profil"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {/* Stat chips: 2×2 on mobile, 4 cols on sm+ */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[10px] text-muted-foreground">Âge</div>
                <div className="text-sm font-bold">{currentAge} ans</div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[10px] text-muted-foreground">{envelope === "pea" ? "PEA actuel" : "Capital CTO"}</div>
                <div className="text-sm font-bold">{profile.currentPeaCapital.toLocaleString("fr-FR")} €</div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[10px] text-muted-foreground">Versement</div>
                <div className="text-sm font-bold">{profile.monthlyInvestment.toLocaleString("fr-FR")} €<span className="text-xs font-normal text-muted-foreground">/mois</span></div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[10px] text-muted-foreground">Retraite visée</div>
                <div className="text-sm font-bold">{profile.retirementAge} ans</div>
              </div>
            </div>
            {/* ── Sélecteur courtier ─────────────────────────────────────── */}
            {/* ── Sélecteur courtier + enveloppe ──────────────────────────── */}
            <div className="mt-3 pt-3 border-t space-y-3">
              <BrokerSelector value={brokerId} onChange={saveBroker} />
              <EnvelopeToggle value={envelope} onChange={saveEnvelope} />
              {showModeToggle && broker && (
                <ManagementModeToggle value={managementMode} onChange={saveManagementMode} broker={broker} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projection — toujours visible, même en mode édition */}
      <ProjectionDashboard profile={profile} etfsPromise={etfsPromise} brokerId={brokerId} envelope={envelope} managementMode={effectiveMode} />
    </div>
  );
}
