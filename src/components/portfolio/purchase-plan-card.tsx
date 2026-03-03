"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchasePlanResult, MonthlyPlan, StrategyEtfStatus } from "@/types/broker";
import type { Envelope } from "@/lib/constants";
import { getEffectiveMinOrder } from "@/lib/brokers";
import {
  ShoppingCart,
  CalendarDays,
  Info,
  ArrowRight,
  Repeat,
  Check,
  TrendingDown,
  Lightbulb,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Formatage
// ─────────────────────────────────────────────────────────────────────────────

function fmtEur(v: number): string {
  return v.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function PurchasePlanCard({
  plan,
  monthlyBudget,
  envelope = "pea",
}: {
  plan: PurchasePlanResult;
  monthlyBudget: number;
  envelope?: Envelope;
}) {
  const currentMonth = plan.months.find((m) => m.isCurrent);
  const futureMonths = plan.months.filter((m) => !m.isCurrent);
  const isPea = envelope === "pea";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <CardTitle>Plan d&apos;achat mensuel</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {plan.broker.name}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isPea
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
            }`}>
              {isPea ? "PEA" : "CTO"}
            </span>
            {plan.strategyType === "rotation" && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <Repeat className="h-3 w-3" />
                Rotation {plan.rotationCycleLength} mois
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Section DCA / Stratégie ─────────────────────────────────────── */}
        <DcaInfoSection plan={plan} envelope={envelope} />

        {/* ── Section "Ce mois-ci" ─────────────────────────────────────────── */}
        {currentMonth && (
          <CurrentMonthSection
            month={currentMonth}
            monthlyBudget={monthlyBudget}
            strategyEtfs={plan.strategyEtfs}
            envelope={envelope}
            brokerName={plan.broker.name}
            minOrder={getEffectiveMinOrder(plan.broker)}
          />
        )}

        {/* ── Timeline des mois suivants ────────────────────────────────────── */}
        {futureMonths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Prochains mois</span>
            </div>
            <div className="space-y-1.5">
              {futureMonths.map((month) => (
                <FutureMonthRow key={month.monthLabel} month={month} />
              ))}
            </div>
          </div>
        )}

        {/* ── Résumé des frais ──────────────────────────────────────────────── */}
        <FeesSummary plan={plan} />

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Prix indicatifs basés sur le cours actuel. Le montant réel peut varier
          à l&apos;exécution de l&apos;ordre. Parts entières uniquement{isPea ? " (PEA : pas de fractions)" : ""}.
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section DCA / Explication de la stratégie
// ─────────────────────────────────────────────────────────────────────────────

function DcaInfoSection({ plan, envelope }: { plan: PurchasePlanResult; envelope: Envelope }) {
  const isTR = plan.broker.id === "trade-republic";
  const isRotation = plan.strategyType === "rotation";
  const isPea = envelope === "pea";
  const minOrder = getEffectiveMinOrder(plan.broker);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-950/20">
      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
      <div className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
        {isRotation ? (
          <p>
            <strong>Rotation intelligente</strong> — Votre budget ne permet pas
            d&apos;acheter tous les ETFs chaque mois (parts entières{isPea ? " sur PEA" : ""}
            {minOrder > 1 && <>, minimum {minOrder} € par ordre chez {plan.broker.name}</>}).
            L&apos;algorithme accumule un budget virtuel par ETF et déclenche
            l&apos;achat quand le seuil est atteint. Le surplus est réinvesti dans
            d&apos;autres ETFs de la stratégie pour maximiser l&apos;investissement.
          </p>
        ) : (
          <p>
            <strong>DCA (Dollar Cost Averaging)</strong> — Investir un montant
            fixe chaque mois lisse automatiquement votre prix d&apos;achat moyen
            et réduit l&apos;impact de la volatilité sur le long terme.
            L&apos;algorithme rééquilibre à chaque achat pour maintenir les poids cibles de la stratégie.
          </p>
        )}
        {isTR && (
          <p>
            Trade Republic permet un <strong>DCA automatique et gratuit</strong>{" "}
            via ses plans d&apos;investissement programmés — vous pouvez
            automatiser ces achats sans frais.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section mois courant
// ─────────────────────────────────────────────────────────────────────────────

function CurrentMonthSection({
  month,
  monthlyBudget,
  strategyEtfs,
  envelope,
  brokerName,
  minOrder,
}: {
  month: MonthlyPlan;
  monthlyBudget: number;
  strategyEtfs: StrategyEtfStatus[];
  envelope: Envelope;
  brokerName: string;
  minOrder: number;
}) {
  const isPea = envelope === "pea";
  if (month.purchases.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-muted p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun achat ce mois-ci — le budget s&apos;accumule pour le mois prochain.
        </p>
      </div>
    );
  }

  const budgetUsedPct = monthlyBudget > 0
    ? Math.round((month.totalInvested / monthlyBudget) * 100)
    : 0;

  const boughtIsins = new Set(month.purchases.map((p) => p.isin));
  const deferredEtfs = strategyEtfs.filter((e) => !boughtIsins.has(e.isin));

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
          Ce mois-ci, achetez :
        </span>
      </div>

      {/* ── ETFs à acheter ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        {month.purchases.map((p) => (
          <div
            key={p.isin}
            className="rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                  {p.shares}×
                </span>
                <div>
                  <span className="text-sm font-medium">{p.shortName}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                    {p.ticker}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{fmtEur(p.totalCost)} €</div>
                {p.estimatedFee > 0 ? (
                  <div className="text-[10px] text-muted-foreground">
                    +{fmtEur(p.estimatedFee)} € de frais
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Gratuit
                  </div>
                )}
              </div>
            </div>
            {p.reason && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                {p.reason.includes("baisse") ? (
                  <TrendingDown className="h-3 w-3 shrink-0 text-blue-500" />
                ) : (
                  <ArrowRight className="h-3 w-3 shrink-0" />
                )}
                {p.reason}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── ETFs reportés (rotation) ─────────────────────────────────────── */}
      {deferredEtfs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Reportés aux prochains mois :</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {deferredEtfs.map((etf) => (
              <span
                key={etf.isin}
                className="rounded-full border border-dashed border-muted-foreground/30 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {etf.shortName}{" "}
                <span className="font-mono">({etf.weight} %)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget bar + total ──────────────────────────────────────────── */}
      <div className="mt-3 space-y-2 border-t border-emerald-200/50 pt-2 dark:border-emerald-800/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total investissement</span>
          <span className="text-sm font-bold">
            {fmtEur(month.totalInvested)} €
            {month.totalFees > 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (+{fmtEur(month.totalFees)} € frais)
              </span>
            )}
          </span>
        </div>

        {/* Budget utilization bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {fmtEur(month.totalInvested)} € sur {fmtEur(monthlyBudget)} €
            </span>
            <span className={`font-medium ${budgetUsedPct >= 85 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {budgetUsedPct} %
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${budgetUsedPct >= 85 ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
            />
          </div>
        </div>

        {month.remainingCash > 1 && (
          <p className="text-[11px] text-muted-foreground">
            Reste non investi : {fmtEur(month.remainingCash)} € — parts entières
            {minOrder > 1 && ` + minimum ${minOrder} € par ordre (${brokerName})`}
            {isPea ? ", pas de fractions sur PEA" : ""}.
            Ce montant est reporté et investi les mois suivants.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ligne mois futur
// ─────────────────────────────────────────────────────────────────────────────

function FutureMonthRow({ month }: { month: MonthlyPlan }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="min-w-[5rem] text-xs font-medium text-muted-foreground sm:min-w-[7rem]">
        {month.monthLabel}
      </span>
      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      {month.purchases.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {month.purchases.map((p) => (
            <span
              key={p.isin}
              className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
            >
              {p.shortName}{" "}
              <span className="text-muted-foreground">
                ({p.shares}× · {fmtEur(p.totalCost)} €)
              </span>
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          Accumulation — pas d&apos;achat
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Résumé frais
// ─────────────────────────────────────────────────────────────────────────────

function FeesSummary({ plan }: { plan: PurchasePlanResult }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
        <div className="text-[10px] text-muted-foreground">Frais / mois</div>
        <div className="text-sm font-bold">
          {plan.averageMonthlyFee === 0 ? (
            <span className="text-emerald-600">0 €</span>
          ) : (
            `${fmtEur(plan.averageMonthlyFee)} €`
          )}
        </div>
      </div>
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
        <div className="text-[10px] text-muted-foreground">Frais / an</div>
        <div className="text-sm font-bold">
          {plan.annualFees === 0 ? (
            <span className="text-emerald-600">0 €</span>
          ) : (
            `${fmtEur(plan.annualFees)} €`
          )}
        </div>
      </div>
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
        <div className="text-[10px] text-muted-foreground">Ratio frais</div>
        <div className="text-sm font-bold">
          {plan.feeRatio === 0 ? (
            <span className="text-emerald-600">0%</span>
          ) : (
            <span className={plan.feeRatio > 0.5 ? "text-amber-600" : ""}>
              {plan.feeRatio}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
