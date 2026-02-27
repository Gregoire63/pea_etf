"use client";

import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { EtfCategory } from "@/types/etf";

interface FiltersState {
  search: string;
  category: string;
  distribution: string;
}

interface EtfFiltersProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
}

const categories = ["", ...Object.keys(CATEGORY_LABELS)] as const;
const distributions = ["", "ACC", "DIST"] as const;

export function EtfFilters({ filters, onChange }: EtfFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        placeholder="Rechercher (nom, ticker, ISIN)..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-full sm:w-64"
      />
      <select
        value={filters.category}
        onChange={(e) => onChange({ ...filters, category: e.target.value })}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
      >
        <option value="">Toutes categories</option>
        {categories
          .filter((c) => c !== "")
          .map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat as EtfCategory]}
            </option>
          ))}
      </select>
      <select
        value={filters.distribution}
        onChange={(e) => onChange({ ...filters, distribution: e.target.value })}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
      >
        <option value="">ACC & DIST</option>
        {distributions
          .filter((d) => d !== "")
          .map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
      </select>
    </div>
  );
}
