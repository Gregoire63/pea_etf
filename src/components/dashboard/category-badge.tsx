"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import type { EtfCategory } from "@/types/etf";

export function CategoryBadge({ category }: { category: EtfCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium",
        CATEGORY_COLORS[category] || "bg-gray-100 text-gray-800 dark:bg-transparent dark:border-gray-500/60 dark:text-gray-400"
      )}
    >
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}
