"use client";

import type { ManagementMode } from "@/hooks/use-management-mode";
import type { PeaBroker } from "@/data/pea-brokers";
import { estimateAnnualFeeRate, estimateManagedFeeRate } from "@/lib/brokers";
import { User, Briefcase } from "lucide-react";

const OPTIONS: {
  value: ManagementMode;
  label: string;
  icon: typeof User;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "libre",
    label: "Gestion libre",
    icon: User,
    color: "text-blue-700 dark:text-blue-400",
    activeColor: "bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-600",
  },
  {
    value: "profilee",
    label: "Gestion profilée",
    icon: Briefcase,
    color: "text-violet-700 dark:text-violet-400",
    activeColor: "bg-violet-50 border-violet-300 dark:bg-violet-950/40 dark:border-violet-600",
  },
];

function formatFeeLabel(rate: number): string {
  if (rate === 0) return "0 €/an";
  return `${(rate * 100).toFixed(2).replace(".", ",")} %/an`;
}

export function ManagementModeToggle({
  value,
  onChange,
  broker,
}: {
  value: ManagementMode;
  onChange: (m: ManagementMode) => void;
  broker: PeaBroker;
}) {
  const libreFee = estimateAnnualFeeRate(broker);
  const profileeFee = estimateManagedFeeRate(broker);

  return (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground">Mode de gestion</span>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          const Icon = opt.icon;
          const fee = opt.value === "libre" ? libreFee : profileeFee;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-left transition-all ${
                isActive
                  ? `${opt.activeColor} ${opt.color}`
                  : "border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                <span className="text-xs font-semibold">{opt.label}</span>
              </div>
              <div className="text-[10px] opacity-80">{formatFeeLabel(fee)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
