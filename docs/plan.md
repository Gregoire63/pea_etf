# Plan de correction — Audit Mars 2026

Ref : `docs/audit-mars-2026.md`

---

## Phase 1 — Bugs critiques (scoring + affichage)

### 1.1 Guard division par zero dans `normalize()`

**Fichier** : `src/lib/scoring.ts`

Ligne 32-38 : ajouter un guard quand `best === worst`.

```typescript
function normalize(value: number | null, best: number, worst: number): number {
  if (value === null) return 30;
  if (best === worst) return 50; // ← AJOUT : evite NaN
  const min = Math.min(best, worst);
  const max = Math.max(best, worst);
  const clamped = Math.max(min, Math.min(max, value));
  const score = ((clamped - worst) / (best - worst)) * 100;
  return Math.max(0, Math.min(100, score));
}
```

### 1.2 Corriger conversion Yahoo TER

**Fichier** : `src/lib/data-resolver.ts`

Lignes 57-64 : `yahoo-finance2` retourne `netExpenseRatio` en fraction (0.002 pour
0.20%), pas en pourcentage. Supprimer la division par 100.

```typescript
// Avant :
const converted = yahooTerRaw / 100;
if (isValidTer(converted)) { ... }

// Apres :
if (isValidTer(yahooTerRaw)) {
  ter = yahooTerRaw;
  terSource = "yahoo";
}
```

Mettre a jour le commentaire ligne 39-40 :
```typescript
/** Yahoo netExpenseRatio brut (fraction decimale, ex: 0.0020 pour 0.20 %) */
```

### 1.3 Ajouter variantes dark mode au score badge

**Fichier** : `src/components/dashboard/etf-score-badge.tsx`

Aligner avec le pattern des `CATEGORY_COLORS` dans `constants.ts` :

```typescript
function getScoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-transparent dark:border-emerald-500/60 dark:text-emerald-400";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-transparent dark:border-blue-500/60 dark:text-blue-400";
  if (score >= 45) return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-transparent dark:border-amber-500/60 dark:text-amber-400";
  return "bg-red-100 text-red-800 border-red-200 dark:bg-transparent dark:border-red-500/60 dark:text-red-400";
}
```

### 1.4 Ajouter `aumFloorPenalty` au recalcul client

**Fichier** : `src/components/dashboard/etf-ranking-table.tsx`

Dans `etfsWithCustomScores` (lignes 82-103), appliquer le meme `aumFloorPenalty` que
`scoring.ts:127-130` :

```typescript
const etfsWithCustomScores = useMemo(() => {
  const leverageMultiplier = (100 - weights.leveragePenalty) / 100;
  const scored = etfs.map((etf) => {
    const { terScore, performanceScore, aumScore, sharpeScore, drawdownScore } =
      etf.scoreBreakdown;
    const penalty = etf.leveraged ? leverageMultiplier : 1.0;
    // ← AJOUT : aumFloorPenalty
    const aumFloorPenalty =
      etf.aum !== null && etf.aum < 20_000_000 ? 0.85
      : etf.aum !== null && etf.aum < 50_000_000 ? 0.93
      : 1.0;
    const customScore =
      Math.round(
        (normalizedWeights.ter * terScore +
          normalizedWeights.performance * performanceScore +
          normalizedWeights.aum * aumScore +
          normalizedWeights.sharpe * sharpeScore +
          normalizedWeights.drawdown * drawdownScore) *
          penalty *
          aumFloorPenalty * // ← AJOUT
          10
      ) / 10;
    return { ...etf, score: customScore };
  });
  // ...
}, [etfs, normalizedWeights, weights.leveragePenalty]);
```

---

## Phase 2 — Coherence scoring + donnees

### 2.1 Utiliser `DEFAULT_LEVERAGE_PENALTY` dans `scoring.ts`

**Fichier** : `src/lib/scoring.ts`

Ligne 124 : remplacer le hardcode `0.70` par la constante.

```typescript
import { DEFAULT_LEVERAGE_PENALTY } from "./constants";
// ...
const leveragePenalty = etf.leveraged ? (100 - DEFAULT_LEVERAGE_PENALTY) / 100 : 1.0;
```

### 2.2 Corriger le commentaire stale dans `use-score-weights.ts`

**Fichier** : `src/hooks/use-score-weights.ts`

Ligne 26 : le commentaire `// 15` est faux, `DEFAULT_LEVERAGE_PENALTY` vaut 30.
Supprimer le commentaire inline (la valeur est deja documentee dans `constants.ts`).

```typescript
leveragePenalty: DEFAULT_LEVERAGE_PENALTY,
```

### 2.3 Supprimer `return10y` du classement (toujours null)

**Fichier** : `src/lib/etf-data.ts`

Ligne 139 : le calcul `annualizedReturn(prices, 10)` retourne toujours `null` car
les prix sont fetches sur 5 ans seulement. Forcer explicitement a `null` :

```typescript
const r10y = null; // Nécessite des prix sur 10 ans — sera disponible via /api/etf/[isin]
```

Note : la page detail individuelle fetche 10 ans via `getHistoricalPricesForIsin(isin, 10)`,
donc le graphique de la page detail reste correct.

---

## Phase 3 — UI consistance

### 3.1 Color-coding des rendements sur la page detail

**Fichier** : `src/app/etf/[isin]/etf-detail-live.tsx`

Modifier la fonction `fmt()` ou ajouter une version avec couleur.
Pour les metriques YTD, 1 an, 3 ans, 5 ans, 10 ans (lignes 183-189), utiliser
le meme pattern que le tableau de classement :

```typescript
function fmtReturn(val: number | null, decimals = 2): { text: string; className: string } {
  if (val === null) return { text: "—", className: "" };
  return {
    text: `${(val * 100).toFixed(decimals)}%`,
    className: val >= 0 ? "text-emerald-600" : "text-red-600",
  };
}
```

Appliquer aux cards de rendement dans la liste `metrics` : rendre la `value` un
`ReactNode` avec le `className` de couleur.

### 3.2 Harmoniser le format AUM

Choisir un format unique : `X M€` / `X Md€` (compact + devise).

**Fichiers a modifier** :
- `src/components/dashboard/etf-ranking-table.tsx` : `fmtAum` → ajouter `€`
- `src/app/etf/[isin]/etf-detail-live.tsx` : `fmtAum` → changer `EUR` en `€`
- `src/components/dashboard/etf-overview.tsx` : deja `€`, OK

Format cible unifie :
```typescript
function fmtAum(val: number | null): string {
  if (val === null) return "—";
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Md€`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} M€`;
  return `${val.toLocaleString("fr-FR")} €`;
}
```

---

## Phase 4 — Securite + robustesse API

### 4.1 Authentifier `/api/refresh`

**Fichier** : `src/app/api/refresh/route.ts`

Ajouter une verification du header `Authorization` avec `CRON_SECRET` :

```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... reste du code
}
```

### 4.2 Sanitiser les erreurs SSE

**Fichiers** :
- `src/app/api/etfs/stream/route.ts:289` : remplacer `String(err)` par un message generique
- `src/app/api/etfs/discover/route.ts:78` : idem

```typescript
// Avant :
await send({ type: "error", message: String(err) });
// Apres :
console.error("[etfs/stream] Error:", err);
await send({ type: "error", message: "Erreur lors du chargement des données." });
```

### 4.3 Extraire le risk-free rate en constante

**Fichier** : `src/lib/constants.ts` — ajouter :
```typescript
/** Taux sans risque annualisé pour le calcul du Sharpe Ratio.
 *  Basé sur le taux de dépôt BCE. À mettre à jour si les taux changent. */
export const RISK_FREE_RATE = 0.03;
```

**Fichier** : `src/lib/calculations.ts:73` — importer et utiliser :
```typescript
import { RISK_FREE_RATE } from "./constants";
export function sharpeRatio(
  annualReturn: number | null,
  annualVolatility: number | null,
  riskFreeRate: number = RISK_FREE_RATE
): number | null { ... }
```

---

## Phase 5 — Nettoyage code mort

### 5.1 Supprimer `"boursorama"` du compteur data-resolver

**Fichier** : `src/lib/data-resolver.ts:113`

Retirer `boursorama: 0` du `sourceStats` puisque Boursobank n'est pas connecte.

### 5.2 Decider du sort de `boursobank.ts`

Deux options :
- **Option A** : Supprimer le scraper et l'API `/api/bourso/[ticker]` (code mort)
- **Option B** : Integrer dans `data-resolver.ts` comme source de prix temps reel

Decision recommandee : garder le fichier mais ne pas le connecter tant qu'il n'y a
pas de besoin identifie. Supprimer `"boursorama"` du type `DataSourceName` et du
compteur `sourceStats`.

### 5.3 Supprimer les parametres morts de `computeScore`

**Fichier** : `src/lib/scoring.ts`

`distribution` et `volatility1y` sont acceptes mais jamais utilises dans `ScoringInput`.
Les retirer du type pour eviter la confusion :

```typescript
export type ScoringInput = {
  ter: number;
  return5y: number | null;
  return3y: number | null;
  return1y: number | null;
  aum: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  leveraged: boolean;
};
```

Mettre a jour les appelants (`etf-data.ts` et `stream/route.ts`) pour ne plus
passer `distribution` ni `volatility1y`.

---

## Phase 6 — Verification

1. `npx tsc --noEmit` — zero erreur
2. `npx next build` — build reussi avec 128 pages
3. Verifier en dark mode : score badge correctement stylise
4. Verifier avec poids custom : aumFloorPenalty applique
5. Verifier la page detail : rendements colores vert/rouge
6. Verifier `/api/refresh` : retourne 401 sans auth

---

## Resume des fichiers impactes

| Fichier | Phase | Modifications |
|---------|-------|---------------|
| `src/lib/scoring.ts` | 1.1, 2.1, 5.3 | Guard NaN, leverage constant, supprimer params morts |
| `src/lib/data-resolver.ts` | 1.2, 5.1 | Fix Yahoo TER, nettoyer boursorama |
| `src/components/dashboard/etf-score-badge.tsx` | 1.3 | Dark mode |
| `src/components/dashboard/etf-ranking-table.tsx` | 1.4 | aumFloorPenalty |
| `src/lib/constants.ts` | 4.3 | RISK_FREE_RATE |
| `src/lib/calculations.ts` | 4.3 | Importer constante |
| `src/hooks/use-score-weights.ts` | 2.2 | Supprimer commentaire stale |
| `src/lib/etf-data.ts` | 2.3, 5.3 | return10y=null, supprimer params |
| `src/app/etf/[isin]/etf-detail-live.tsx` | 3.1, 3.2 | Color-coding, format AUM |
| `src/components/dashboard/etf-ranking-table.tsx` | 3.2 | Format AUM |
| `src/components/dashboard/etf-overview.tsx` | 3.2 | Format AUM (verifier) |
| `src/app/api/refresh/route.ts` | 4.1 | Auth CRON_SECRET |
| `src/app/api/etfs/stream/route.ts` | 4.2, 5.3 | Sanitiser erreur, supprimer params |
| `src/app/api/etfs/discover/route.ts` | 4.2 | Sanitiser erreur |
