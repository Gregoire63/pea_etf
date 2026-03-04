import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="relative">
      {/* Overlay message */}
      <div className="absolute inset-0 z-10 flex items-start justify-center pt-32">
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card/95 px-8 py-6 shadow-lg backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            Récupération des données en cours
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Les cours, historiques et métadonnées de chaque ETF éligible PEA
            sont mis à jour pour vous fournir des informations à jour.
          </p>
        </div>
      </div>

      {/* Skeleton en arrière-plan */}
      <div className="space-y-8 animate-pulse opacity-40">
        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-md bg-muted" />
            <div className="h-4 w-44 rounded-md bg-muted" />
          </div>
          <div className="h-10 w-72 rounded-md bg-muted" />
        </div>

        {/* Résumé marchés */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-muted" />
          ))}
        </div>

        {/* Aperçu PEA */}
        <div className="space-y-3">
          <div className="h-5 w-48 rounded-md bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg border bg-muted" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 rounded-lg border bg-muted" />
            <div className="h-64 rounded-lg border bg-muted" />
          </div>
        </div>

        {/* Tableau */}
        <div className="space-y-3">
          <div className="h-5 w-32 rounded-md bg-muted" />
          <div className="h-12 rounded-md border bg-muted/40" />
          <div className="rounded-lg border overflow-hidden">
            <div className="h-11 border-b bg-muted/30" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 border-b last:border-0 bg-muted/20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
