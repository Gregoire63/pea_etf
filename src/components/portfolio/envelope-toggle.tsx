"use client";

import type { Envelope } from "@/lib/constants";
import { PEA_TAX_RATE, CTO_TAX_RATE } from "@/lib/constants";

const OPTIONS: { value: Envelope; label: string; tax: string; color: string; activeColor: string }[] = [
  {
    value: "pea",
    label: "PEA",
    tax: `${(PEA_TAX_RATE * 100).toFixed(1).replace(".", ",")} % PS`,
    color: "text-emerald-700 dark:text-emerald-400",
    activeColor: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-600",
  },
  {
    value: "cto",
    label: "CTO",
    tax: `${(CTO_TAX_RATE * 100).toFixed(1).replace(".", ",")} % flat tax`,
    color: "text-orange-700 dark:text-orange-400",
    activeColor: "bg-orange-50 border-orange-300 dark:bg-orange-950/40 dark:border-orange-600",
  },
];

export function EnvelopeToggle({
  value,
  onChange,
}: {
  value: Envelope;
  onChange: (e: Envelope) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground">Enveloppe fiscale</span>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value;
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
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-[10px] opacity-80">{opt.tax}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
