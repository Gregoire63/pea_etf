export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Lien retour */}
      <div className="h-4 w-40 rounded-md bg-muted" />

      {/* En-tête ETF */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 rounded-md bg-muted" />
            <div className="h-7 w-14 rounded-full bg-muted" />
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-80 rounded-md bg-muted" />
        </div>
        <div className="space-y-1 text-right">
          <div className="ml-auto h-4 w-10 rounded-md bg-muted" />
          <div className="ml-auto h-10 w-14 rounded-md bg-muted" />
        </div>
      </div>

      {/* Grille de métriques */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border bg-muted" />
        ))}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-muted" />

      {/* Détail du score */}
      <div className="h-48 rounded-lg border bg-muted" />

      {/* Graphique historique */}
      <div className="h-80 rounded-lg border bg-muted" />

      {/* Panel Boursobank */}
      <div className="h-40 rounded-lg border bg-muted" />
    </div>
  );
}
