"use client";

import { cn } from "@/lib/utils";

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 45) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function EtfScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums",
        getScoreColor(score)
      )}
    >
      {score.toFixed(1)}
    </span>
  );
}
