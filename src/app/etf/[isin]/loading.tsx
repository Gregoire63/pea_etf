export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Lien retour */}
      <div className="h-4 w-32 rounded-md bg-muted" />

      {/* En-tête ETF — calqué sur la structure réelle */}
      <div className="space-y-1.5">
        {/* Titre + rang */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-7 w-48 rounded-md bg-muted sm:h-8 sm:w-64" />
          <div className="shrink-0 space-y-1 text-right">
            <div className="ml-auto h-3 w-8 rounded-md bg-muted" />
            <div className="ml-auto h-7 w-10 rounded-md bg-muted" />
          </div>
        </div>
        {/* Badges */}
        <div className="flex gap-2">
          <div className="h-6 w-14 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
        {/* Métadonnées */}
        <div className="h-3.5 w-48 rounded-md bg-muted sm:w-64" />
      </div>

      {/* Grille de métriques — 2 cols mobile, 4 cols lg */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border bg-muted sm:h-20" />
        ))}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-muted" />

      {/* Détail du score */}
      <div className="h-48 rounded-lg border bg-muted" />

      {/* Graphique historique */}
      <div className="h-72 rounded-lg border bg-muted" />

      {/* Panel broker */}
      <div className="h-32 rounded-lg border bg-muted" />
    </div>
  );
}
