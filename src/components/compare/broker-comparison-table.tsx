"use client";

import { useState, useMemo, useEffect } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BROKER_TYPE_LABELS,
  type PeaBroker,
  type FeeRange,
} from "@/data/pea-brokers";
import { ALL_BROKERS, estimateTradeFee, hasManagedOption, estimateManagedFeeRate } from "@/lib/brokers";
import {
  Building2,
  Briefcase,
  Check,
  X,
  ArrowUpDown,
  ExternalLink,
  Gift,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Smartphone,
  Globe,
  BarChart3,
  Wifi,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Formatage
// ─────────────────────────────────────────────────────────────────────────────

function fmtEur(v: number): string {
  if (v === 0) return "0 €";
  return (
    v.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function fmtFeeRange(broker: PeaBroker): string {
  const fee = broker.fees.orderEuronext;
  if (fee.min === 0 && fee.max === 0) return "Gratuit";
  return fee.detail;
}

function fmtFee(fee: FeeRange): string {
  if (fee.min === 0 && fee.max === 0) return "Gratuit";
  return fee.detail;
}

const FEE_SHORT_MAX = 40;

function fmtFeeShort(fee: FeeRange): string {
  if (fee.min === 0 && fee.max === 0) return "Gratuit";
  if (fee.detail.length <= FEE_SHORT_MAX) return fee.detail;
  if (fee.unit === "EUR") {
    if (fee.min === fee.max) return `${fmtEur(fee.min)} fixe`;
    return `${fmtEur(fee.min)} – ${fmtEur(fee.max)}`;
  }
  if (fee.min === fee.max) return `${fee.min} %`;
  return `${fee.min} % – ${fee.max} %`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bool icon
// ─────────────────────────────────────────────────────────────────────────────

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
}

function BoolLabel({ value, labelTrue, labelFalse }: { value: boolean; labelTrue?: string; labelFalse?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <Check className="h-3.5 w-3.5" />
      {labelTrue ?? "Oui"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground/60">
      <X className="h-3.5 w-3.5" />
      {labelFalse ?? "Non"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tri
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = "name" | "fee" | "etfCount" | "type";

function sortBrokers(
  brokers: PeaBroker[],
  key: SortKey,
  amount: number,
  asc: boolean,
): PeaBroker[] {
  const sorted = [...brokers].sort((a, b) => {
    switch (key) {
      case "name":
        return a.name.localeCompare(b.name);
      case "fee":
        return estimateTradeFee(a, amount) - estimateTradeFee(b, amount);
      case "etfCount":
        return (a.features.etfCount ?? 0) - (b.features.etfCount ?? 0);
      case "type":
        return a.type.localeCompare(b.type);
    }
  });
  return asc ? sorted : sorted.reverse();
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function BrokerComparisonTable() {
  const [amount, setAmount] = useState(500);
  const [sortKey, setSortKey] = useState<SortKey>("fee");
  const [asc, setAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveBrokers, setLiveBrokers] = useState<PeaBroker[]>(ALL_BROKERS);
  const [isLive, setIsLive] = useState(false);
  const [overridesApplied, setOverridesApplied] = useState(0);

  // Fetch live broker data in background (triggers scraper + fee extraction)
  useEffect(() => {
    fetch("/api/brokers")
      .then((r) => r.json())
      .then((data) => {
        if (data.brokers?.length > 0) {
          setLiveBrokers(data.brokers);
          setIsLive(true);
          setOverridesApplied(data.overridesApplied ?? 0);
        }
      })
      .catch(() => {}); // Fallback silencieux sur ALL_BROKERS
  }, []);

  const brokers = useMemo(
    () => sortBrokers(liveBrokers, sortKey, amount, asc),
    [liveBrokers, sortKey, amount, asc],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  }

  function SortableHead({
    label,
    sortId,
    className,
  }: {
    label: string;
    sortId: SortKey;
    className?: string;
  }) {
    return (
      <TableHead className={className}>
        <button
          onClick={() => handleSort(sortId)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          <ArrowUpDown
            className={`h-3 w-3 ${
              sortKey === sortId
                ? "text-primary"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      </TableHead>
    );
  }

  // Trouver le courtier le moins cher pour highlight
  const cheapestFee = Math.min(
    ...brokers.map((b) => estimateTradeFee(b, amount)),
  );

  // Count total columns for colSpan
  const totalColumns = 11;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Comparatif courtiers PEA</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="order-amount"
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              Montant d&apos;ordre :
            </label>
            <div className="relative">
              <input
                id="order-amount"
                type="number"
                min={10}
                max={100000}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Math.max(10, Number(e.target.value)))}
                className="h-8 w-24 rounded-md border border-input bg-background px-2 pr-6 text-sm text-right font-mono"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                €
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Données mises à jour le{" "}
          {new Date(liveBrokers[0].lastChecked).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {isLive && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Wifi className="h-2.5 w-2.5" />
              Live
              {overridesApplied > 0 && ` · ${overridesApplied} màj`}
            </span>
          )}
          . Les frais sont calculés dynamiquement selon le montant d&apos;ordre
          saisi. Cliquez sur un courtier pour voir le détail.
        </p>
      </CardHeader>

      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Courtier" sortId="name" className="whitespace-normal" />
              <SortableHead
                label="Type"
                sortId="type"
                className="hidden lg:table-cell"
              />
              <SortableHead label={`Frais (${fmtEur(amount)})`} sortId="fee" className="whitespace-normal" />
              <TableHead className="hidden sm:table-cell">Garde</TableHead>
              <TableHead className="text-center hidden md:table-cell">
                DCA gratuit
              </TableHead>
              <TableHead className="text-center hidden md:table-cell">
                PEA Jeune
              </TableHead>
              <SortableHead
                label="ETFs"
                sortId="etfCount"
                className="hidden sm:table-cell"
              />
              <TableHead className="hidden lg:table-cell">Transfert in</TableHead>
              <TableHead className="text-center hidden md:table-cell">Gestion profilée</TableHead>
              <TableHead className="hidden xl:table-cell">Promo</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {brokers.map((broker) => {
              const fee = estimateTradeFee(broker, amount);
              const isCheapest = fee === cheapestFee;
              const hasPromo =
                broker.promotions.length > 0 &&
                broker.promotions.some(
                  (p) => !p.validUntil || new Date(p.validUntil) >= new Date(),
                );
              const isExpanded = expandedId === broker.id;

              return (
                <BrokerRow
                  key={broker.id}
                  broker={broker}
                  fee={fee}
                  isCheapest={isCheapest}
                  hasPromo={hasPromo}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : broker.id)}
                  totalColumns={totalColumns}
                />
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ligne courtier + expansion
// ─────────────────────────────────────────────────────────────────────────────

function BrokerRow({
  broker,
  fee,
  isCheapest,
  hasPromo,
  isExpanded,
  onToggle,
  totalColumns,
}: {
  broker: PeaBroker;
  fee: number;
  isCheapest: boolean;
  hasPromo: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  totalColumns: number;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        {/* Courtier */}
        <TableCell className="whitespace-normal">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{broker.name}</span>
              <span className="text-[10px] text-muted-foreground lg:hidden">
                {BROKER_TYPE_LABELS[broker.type]}
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </TableCell>

        {/* Type */}
        <TableCell className="hidden lg:table-cell">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
            {BROKER_TYPE_LABELS[broker.type]}
          </span>
        </TableCell>

        {/* Frais */}
        <TableCell className="whitespace-normal">
          <div className="flex flex-col">
            <span
              className={`font-mono text-sm font-semibold ${
                isCheapest
                  ? "text-emerald-600 dark:text-emerald-400"
                  : ""
              }`}
            >
              {fee === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Gratuit
                </span>
              ) : (
                fmtEur(fee)
              )}
            </span>
            <span className="text-[10px] text-muted-foreground max-w-[120px] sm:max-w-[180px] truncate">
              {fmtFeeRange(broker)}
            </span>
          </div>
        </TableCell>

        {/* Garde */}
        <TableCell className="hidden sm:table-cell">
          <span
            className={`text-xs ${
              broker.fees.custody.min === 0 &&
              broker.fees.custody.max === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {broker.fees.custody.min === 0 &&
            broker.fees.custody.max === 0
              ? "Gratuit"
              : broker.fees.custody.detail}
          </span>
        </TableCell>

        {/* DCA gratuit */}
        <TableCell className="hidden md:table-cell">
          <BoolIcon value={broker.features.freeSavingsPlan} />
        </TableCell>

        {/* PEA Jeune */}
        <TableCell className="hidden md:table-cell">
          <BoolIcon value={broker.features.peaJeune} />
        </TableCell>

        {/* ETFs */}
        <TableCell className="hidden sm:table-cell">
          <span className="text-xs font-mono">
            {broker.features.etfCount?.toLocaleString("fr-FR") ?? "—"}
          </span>
        </TableCell>

        {/* Transfert in */}
        <TableCell className="hidden lg:table-cell">
          <BoolIcon value={broker.features.transferIn} />
        </TableCell>

        {/* Gestion profilée */}
        <TableCell className="hidden md:table-cell">
          {hasManagedOption(broker) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
              <Briefcase className="h-2.5 w-2.5" />
              Oui
            </span>
          ) : (
            <span className="text-center block text-muted-foreground/40 text-[10px]">—</span>
          )}
        </TableCell>

        {/* Promo */}
        <TableCell className="hidden xl:table-cell">
          {hasPromo ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Gift className="h-3 w-3" />
              Offre
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/40">
              —
            </span>
          )}
        </TableCell>

        {/* Lien */}
        <TableCell>
          <a
            href={broker.peaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={`Voir ${broker.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </TableCell>
      </TableRow>

      {/* ── Expansion detail ─────────────────────────────────────────────── */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={totalColumns} className="p-0 whitespace-normal">
            <BrokerDetailPanel broker={broker} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panneau de détails courtier
// ─────────────────────────────────────────────────────────────────────────────

function BrokerDetailPanel({ broker }: { broker: PeaBroker }) {
  const activePromos = broker.promotions.filter(
    (p) => !p.validUntil || new Date(p.validUntil) >= new Date(),
  );

  return (
    <div className="border-t bg-muted/20 px-2 py-3 sm:px-4 sm:py-4 dark:bg-muted/10">
      {/* Promo banner */}
      {activePromos.length > 0 && (
        <div className="mb-4 space-y-2">
          {activePromos.map((promo, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800/40 dark:bg-amber-950/20"
            >
              <Gift className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  {promo.description}
                </p>
                {promo.conditions && (
                  <p className="text-muted-foreground">{promo.conditions}</p>
                )}
                {promo.validUntil && (
                  <p className="text-muted-foreground">
                    Valable jusqu&apos;au{" "}
                    {new Date(promo.validUntil).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid 3 colonnes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ── Colonne 1 : Frais détaillés ────────────────────────────────── */}
        <div className="min-w-0 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Frais détaillés
          </h4>
          <div className="space-y-1.5 text-xs">
            <FeeRow label="Ouverture" fee={broker.fees.opening} />
            <FeeRow label="Garde / an" fee={broker.fees.custody} />
            <FeeRow label="Courtage Euronext" fee={broker.fees.orderEuronext} />
            {broker.fees.orderOtherEU && (
              <FeeRow label="Courtage hors Euronext" fee={broker.fees.orderOtherEU} />
            )}
            <FeeRow label="Inactivité" fee={broker.fees.inactivity} />
            <FeeRow label="Transfert sortant" fee={broker.fees.transferOut} />
            {broker.fees.currencyFee && (
              <FeeRow label="Change devises" fee={broker.fees.currencyFee} />
            )}
            {broker.fees.managementFee && (
              <FeeRow label="Gestion pilotée / an" fee={broker.fees.managementFee} />
            )}
          </div>
        </div>

        {/* ── Colonne 2 : Fonctionnalités ────────────────────────────────── */}
        <div className="min-w-0 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fonctionnalités
          </h4>
          <div className="space-y-1.5 text-xs">
            <FeatureRow label="DCA gratuit" value={broker.features.freeSavingsPlan} />
            <FeatureRow label="Fractions d'actions" value={broker.features.fractionalShares} />
            <FeatureRow label="PEA Jeune" value={broker.features.peaJeune} />
            <FeatureRow label="PEA-PME" value={broker.features.peaPme} />
            <FeatureRow label="Transfert entrant" value={broker.features.transferIn} />
            {broker.features.etfCount !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ETFs éligibles</span>
                <span className="font-mono font-medium">
                  {broker.features.etfCount.toLocaleString("fr-FR")}
                </span>
              </div>
            )}
            {broker.features.stockCount !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actions éligibles</span>
                <span className="font-mono font-medium">
                  {broker.features.stockCount.toLocaleString("fr-FR")}
                </span>
              </div>
            )}
            {broker.features.cashInterestRate !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rémunération espèces</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {(broker.features.cashInterestRate * 100).toFixed(1)} %
                </span>
              </div>
            )}
            {broker.features.etfPartnerships && (
              <div className="pt-1 border-t border-muted">
                <span className="text-muted-foreground">Partenariats :</span>
                <p className="mt-0.5 text-[11px]">{broker.features.etfPartnerships}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1 border-t border-muted">
              {broker.features.mobileApp && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Smartphone className="h-3 w-3" /> App mobile
                </span>
              )}
              {broker.features.webPlatform && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Globe className="h-3 w-3" /> Web
                </span>
              )}
              {broker.features.advancedTools && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <BarChart3 className="h-3 w-3" /> Outils avancés
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Colonne 3 : Avantages / Inconvénients ──────────────────────── */}
        <div className="min-w-0 space-y-3">
          {broker.pros.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <ThumbsUp className="h-3 w-3" /> Avantages
              </h4>
              <ul className="space-y-1">
                {broker.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <Check className="h-3 w-3 shrink-0 mt-0.5 text-emerald-500" />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {broker.cons.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
                <ThumbsDown className="h-3 w-3" /> Inconvénients
              </h4>
              <ul className="space-y-1">
                {broker.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <X className="h-3 w-3 shrink-0 mt-0.5 text-red-400" />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Gestion profilée (si disponible) ──────────────────────────── */}
      {broker.managedOption && (
        <div className="mt-4 space-y-2 border-t border-muted pt-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            <Briefcase className="h-3 w-3" /> Gestion profilée optionnelle
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gestionnaire</span>
                <span className="font-medium">{broker.managedOption.gestionnaire}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investissement min.</span>
                <span className="font-medium">{broker.managedOption.minInvestment.toLocaleString("fr-FR")} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais annuels</span>
                <span className="font-medium">
                  {broker.managedOption.annualFee
                    ? broker.managedOption.annualFee.detail
                    : broker.managedOption.performanceFee
                      ? `${(broker.managedOption.performanceFee * 100).toFixed(0)} % perf.`
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mixte libre + profilée</span>
                <BoolLabel value={broker.managedOption.canMixWithLibre} />
              </div>
            </div>
            <div className="space-y-1.5 text-xs sm:col-span-1 lg:col-span-2">
              <span className="text-muted-foreground">Profils disponibles :</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {broker.managedOption.profiles.map((p) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">(risque {p.risk}/7)</span>
                    {p.perf2024 !== null && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{(p.perf2024 * 100).toFixed(1)} %
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{broker.managedOption.detail}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sources */}
      {broker.sources.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-[10px] text-muted-foreground">
            <span className="font-medium">Sources :</span>{" "}
            {broker.sources.join(" · ")}
          </p>
          <div className="mt-1 flex gap-2">
            <a
              href={broker.peaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Page PEA
            </a>
            {broker.tariffUrl && (
              <a
                href={broker.tariffUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" /> Tarifs
              </a>
            )}
            <a
              href={broker.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Site officiel
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers detail panel
// ─────────────────────────────────────────────────────────────────────────────

function FeeRow({ label, fee }: { label: string; fee: FeeRange }) {
  const isFree = fee.min === 0 && fee.max === 0;
  const short = fmtFeeShort(fee);
  const full = fmtFee(fee);
  const needsTooltip = short !== full;

  const valueEl = (
    <span
      className={`text-right font-medium ${
        isFree
          ? "text-emerald-600 dark:text-emerald-400"
          : ""
      } ${needsTooltip ? "underline decoration-dotted underline-offset-2 cursor-help" : ""}`}
    >
      {isFree ? "Gratuit" : short}
    </span>
  );

  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {needsTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{valueEl}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {full}
          </TooltipContent>
        </Tooltip>
      ) : (
        valueEl
      )}
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <BoolLabel value={value} />
    </div>
  );
}
