export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Carte de profil */}
      <div className="rounded-lg border bg-muted h-24" />

      {/* Cartes résumé */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-muted" />
        ))}
      </div>

      {/* Métriques avancées */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-muted" />
        ))}
      </div>

      {/* Graphique */}
      <div className="h-96 rounded-lg border bg-muted" />

      {/* Tableau */}
      <div className="rounded-lg border overflow-hidden">
        <div className="h-11 border-b bg-muted/30" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 border-b last:border-0 bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
