"use client";

import type { PeaBroker, ManagedProfile } from "@/data/pea-brokers";
import { estimateManagedFeeRate } from "@/lib/brokers";
import { Briefcase, ArrowUpRight, Info, Shuffle } from "lucide-react";

function RiskBadge({ risk }: { risk: number }) {
  const colors =
    risk <= 3
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : risk <= 5
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors}`}>
      Risque {risk}/7
    </span>
  );
}

function ProfileCard({
  profile,
  isSelected,
  onSelect,
}: {
  profile: ManagedProfile;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-violet-300 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40"
          : "border-muted bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{profile.name}</span>
        <RiskBadge risk={profile.risk} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Horizon min. {profile.minHorizon} ans
      </div>
      {profile.perf2024 !== null && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <ArrowUpRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-400">
            +{(profile.perf2024 * 100).toFixed(1).replace(".", ",")} % en 2024
          </span>
        </div>
      )}
    </button>
  );
}

export function ManagedProfileCard({
  broker,
  selectedProfile,
  onSelectProfile,
}: {
  broker: PeaBroker;
  selectedProfile: string | null;
  onSelectProfile: (name: string) => void;
}) {
  const opt = broker.managedOption;
  if (!opt) return null;

  const feeRate = estimateManagedFeeRate(broker);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      {/* En-tête */}
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-violet-100 p-1.5 dark:bg-violet-900/40">
          <Briefcase className="h-4 w-4 text-violet-700 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">
            {broker.name} — Gestion profilée
          </h3>
          <p className="text-xs text-muted-foreground">
            par {opt.gestionnaire}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {opt.canMixWithLibre && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <Shuffle className="h-2.5 w-2.5" />
            Mixte libre + profilée
          </span>
        )}
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
          {(feeRate * 100).toFixed(2).replace(".", ",")} %/an
        </span>
        {opt.minInvestment > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Min. {opt.minInvestment.toLocaleString("fr-FR")} €
          </span>
        )}
      </div>

      {/* Sélecteur de profils */}
      <div className="mt-4">
        <span className="text-xs font-medium text-muted-foreground">
          Choisir un profil
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {opt.profiles.map((p) => (
            <ProfileCard
              key={p.name}
              profile={p}
              isSelected={selectedProfile === p.name}
              onSelect={() => onSelectProfile(p.name)}
            />
          ))}
        </div>
      </div>

      {/* Détail frais */}
      <div className="mt-4 rounded-lg bg-muted/30 p-3">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <p>{opt.detail}</p>
            {opt.feeType === "hybrid" && opt.performanceFee && (
              <p className="mt-1">
                Commission de surperformance : {(opt.performanceFee * 100).toFixed(0)} %
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
