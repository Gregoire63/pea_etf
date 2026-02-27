export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
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
  );
}
