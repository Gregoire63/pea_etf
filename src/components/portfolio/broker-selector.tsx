"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_BROKERS,
  getBrokerFeeLabel,
  estimateAnnualFeeRate,
} from "@/lib/brokers";
import { BROKER_TYPE_LABELS, type PeaBroker } from "@/data/pea-brokers";
import type { BrokerId } from "@/types/broker";
import { Building2 } from "lucide-react";

const GROUPS = [
  { type: "neocourtier" as const, brokers: ALL_BROKERS.filter((b) => b.type === "neocourtier") },
  { type: "courtier" as const, brokers: ALL_BROKERS.filter((b) => b.type === "courtier") },
  { type: "banque_en_ligne" as const, brokers: ALL_BROKERS.filter((b) => b.type === "banque_en_ligne") },
  { type: "gestion_pilotee" as const, brokers: ALL_BROKERS.filter((b) => b.type === "gestion_pilotee") },
].filter((g) => g.brokers.length > 0);

function BrokerBadges({ broker }: { broker: PeaBroker }) {
  const badges: { label: string; color: string }[] = [];

  if (broker.type === "gestion_pilotee") {
    badges.push({ label: "Pas de choix ETF", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" });
  }

  const feeRate = estimateAnnualFeeRate(broker);
  if (feeRate >= 0.01) {
    badges.push({ label: `${(feeRate * 100).toFixed(1).replace(".", ",")} %/an`, color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" });
  } else if (feeRate > 0) {
    badges.push({ label: `${(feeRate * 100).toFixed(2).replace(".", ",")} %/an`, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" });
  }

  if (broker.features.minOrderAmount && broker.features.minOrderAmount >= 1000) {
    badges.push({ label: `Min ${(broker.features.minOrderAmount).toLocaleString("fr-FR")} €`, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" });
  }


  if (badges.length === 0) return null;

  return (
    <span className="ml-1 inline-flex gap-1">
      {badges.map((b) => (
        <span key={b.label} className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none ${b.color}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

export function BrokerSelector({
  value,
  onChange,
}: {
  value: BrokerId | null;
  onChange: (id: BrokerId) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Courtier</span>
      </div>
      <Select
        value={value ?? ""}
        onValueChange={(v) => onChange(v as BrokerId)}
      >
        <SelectTrigger className="w-full text-sm">
          <SelectValue placeholder="Choisir un courtier" />
        </SelectTrigger>
        <SelectContent>
          {GROUPS.map((group, gi) => (
            <SelectGroup key={group.type}>
              {gi > 0 && <SelectSeparator />}
              <SelectLabel>{BROKER_TYPE_LABELS[group.type]}</SelectLabel>
              {group.brokers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getBrokerFeeLabel(b)}
                    </span>
                    <BrokerBadges broker={b} />
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
