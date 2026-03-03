"use client";

import { cn } from "@/lib/utils";

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-transparent dark:border-emerald-500/60 dark:text-emerald-400";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-transparent dark:border-blue-500/60 dark:text-blue-400";
  if (score >= 45) return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-transparent dark:border-amber-500/60 dark:text-amber-400";
  return "bg-red-100 text-red-800 border-red-200 dark:bg-transparent dark:border-red-500/60 dark:text-red-400";
}

export function EtfScoreBadge({ score }: { score: number }) {
  if (score === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-muted px-2.5 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">
        —
      </span>
    );
  }
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
