# Audit approfondi — Mars 2026

Audit complet de l'application PEA ETF couvrant : pipeline de donnees, scoring,
API, UI, portfolio. Date : 03/03/2026.

---

## Synthese

| Severite | Nombre | Exemples cles |
|----------|--------|---------------|
| Critique | 4 | Division par zero scoring, Yahoo TER casse, score badge dark mode, aumFloorPenalty manquant |
| Moyen | 7 | Boursobank non connecte, `/api/refresh` non authentifie, duplication scoring, return 10y mort |
| Mineur | 7 | Constante inutilisee, format AUM inconsistant, rate limiting absent |

---

## 1. Bugs critiques

### 1.1 Division par zero dans `normalize()` → NaN

**Fichier** : `src/lib/scoring.ts:37`

```typescript
const score = ((clamped - worst) / (best - worst)) * 100;
```

Si `best === worst` (P10 = P90 pour une metrique, possible si beaucoup d'ETFs ont
la meme valeur), le denominateur vaut 0 → score = `NaN` → `Math.min(100, NaN)` = `NaN`
→ le score composite entier devient `NaN`.

**Impact** : Score affiches "NaN" ou crash silencieux. Probabilite faible avec 128 ETFs
diversifies, mais non nulle (drawdown ou Sharpe pourraient converger).

**Correction** : Ajouter un guard `if (best === worst) return value === best ? 50 : 30;`

---

### 1.2 Conversion Yahoo TER cassee — fallback mort

**Fichier** : `src/lib/data-resolver.ts:58-63`

```typescript
const converted = yahooTerRaw / 100;
```

Le commentaire (ligne 39) dit "Yahoo netExpenseRatio brut (en pourcentage, ex: 0.20
pour 0.20 %)". Mais `yahoo-finance2` retourne deja une fraction decimale : `0.002`
pour 0.20%. La division par 100 donne `0.00002`, qui echoue systematiquement
`isValidTer()` (seuil >= 0.0001).

**Impact** : Le fallback Yahoo pour le TER ne fonctionne jamais. En pratique, JustETF
couvre la majorite des ETFs, mais si JustETF est down, le TER tombe sur le catalogue
(potentiellement obsolete) au lieu de Yahoo.

**Correction** : Supprimer la division par 100, passer directement `yahooTerRaw` a
`isValidTer()`.

---

### 1.3 Score badge sans variantes dark mode

**Fichier** : `src/components/dashboard/etf-score-badge.tsx:6-9`

```typescript
if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-200";
if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
if (score >= 45) return "bg-amber-100 text-amber-800 border-amber-200";
return "bg-red-100 text-red-800 border-red-200";
```

Pas de variantes `dark:`. En dark mode, les fonds clairs (`bg-emerald-100`) cassent
le theme. Tous les autres badges (category, source, broker deals) ont des variantes
dark avec `dark:bg-transparent dark:border-xxx dark:text-xxx`.

**Impact** : Badges de score visuellement casses en dark mode (fond clair sur fond sombre).

---

### 1.4 Custom score omet `aumFloorPenalty`

**Fichier** : `src/components/dashboard/etf-ranking-table.tsx:82-103`

Le recalcul client des scores avec poids personnalises applique `leveragePenalty`
mais PAS `aumFloorPenalty` (<20M: x0.85, <50M: x0.93). Le scoring serveur
(`scoring.ts:127-130`) applique les deux.

**Impact** : Avec des poids custom, les ETFs avec petit encours sont surclasses.
Le ranking client diverge du ranking serveur.

---

## 2. Problemes moyens

### 2.1 Boursobank scraper non connecte au pipeline

**Fichiers** : `src/lib/boursobank.ts`, `src/lib/data-resolver.ts`

Le scraper Boursobank existe et fonctionne via `/api/bourso/[ticker]`, mais n'est
jamais appele depuis `data-resolver.ts` ni `etf-data.ts`. Le type `DataSourceName`
inclut `"boursorama"`, le compteur `sourceStats.boursorama` (data-resolver.ts:113)
vaudra toujours 0, et le badge source "Boursorama" dans la page detail ne s'affichera
jamais.

**Status** : Code mort/feature prevue non integree. A connecter ou a supprimer.

---

### 2.2 `/api/refresh` non authentifie

**Fichier** : `src/app/api/refresh/route.ts`

L'endpoint declenche un scraping complet (Yahoo + JustETF pour 128 ETFs). Il est
accessible en GET (pour Vercel Cron) sans aucune verification de `CRON_SECRET`.
N'importe qui peut visiter `/api/refresh` et declencher un refresh.

De plus, le handler GET (ligne 37-39) appelle directement POST, ce qui expose
l'endpoint admin comme une simple URL navigable.

**Impact** : Abus potentiel (scraping repete, surcharge des APIs externes).

---

### 2.3 Duplication du code de construction des entries

**Fichiers** : `src/app/api/etfs/stream/route.ts` (`buildPartialEntry()`) vs
`src/lib/etf-data.ts` (`refreshAllEtfs()`)

Deux implementations independantes construisent les `EtfRankedEntry`. Elles utilisent
les memes fonctions de scoring (`computeScore`, `computeDynamicBenchmarks`) mais
assemblent les donnees brutes differemment. Si l'une est modifiee sans l'autre, les
scores divergent.

En plus, `buildPartialEntry()` est appele deux fois par ETF dans le stream (lignes
200-205 et 247), ce qui double les calculs (annualizedReturn, maxDrawdown, volatility,
Sharpe) inutilement.

---

### 2.4 Page detail declenche le pipeline complet

**Fichier** : `src/app/api/etf/[isin]/route.ts:12`

`getAllEtfsRanked()` charge les 128 ETFs pour en retourner un seul. Sur cache froid,
le premier visiteur d'une page detail attend 30-60s.

**Impact** : UX tres degradee sur premiere visite post-deploy.

---

### 2.5 Rendements non colores sur la page detail

**Fichier** : `src/app/etf/[isin]/etf-detail-live.tsx:183-189`

Les rendements (YTD, 1 an, 3 ans, 5 ans, 10 ans) sont affiches en texte brut, sans
vert (positif) / rouge (negatif). Inconsistant avec le tableau de classement et
l'overview qui colorent les rendements.

---

### 2.6 Return 10 ans toujours null dans le classement

**Fichier** : `src/lib/etf-data.ts:85`

Les prix historiques sont fetches sur 5 ans (`fetchAllHistoricalPrices(tickers, 5)`)
mais `annualizedReturn(prices, 10)` est appele (ligne 139). La fonction retourne
`null` car les donnees ne remontent pas assez loin. Le champ `return10y` dans le
type `EtfLiveData` existe mais vaut toujours `null`.

Note : la page detail individuelle (`/api/etf/[isin]`) fetche bien 10 ans, donc le
graphique y est correct. Mais le champ `return10y` dans le classement est mort.

---

### 2.7 Caches inconsistants (3 patterns differents)

| Pattern | Fichiers | Comportement HMR |
|---------|----------|-------------------|
| `globalThis` | cache.ts, etf-data.ts, justetf.ts | Survit |
| Module-level `let` | market, discover, brokers/check | Perdu |
| Module-level `Map` non borne | bourso/[ticker], etf-data.ts priceCache | Fuite memoire potentielle |

---

## 3. Problemes mineurs

### 3.1 `DEFAULT_LEVERAGE_PENALTY` constante inutilisee

**Fichier** : `src/lib/constants.ts:13` exporte `30`, mais `scoring.ts:124` hardcode
`0.70`. Modifier la constante ne change pas le scoring.

### 3.2 Format AUM inconsistant

| Composant | Format |
|-----------|--------|
| Tableau classement | `X Md` / `X M` (sans devise) |
| Page detail | `X Md EUR` / `X M EUR` |
| Overview | `X Md€` / `X M€` |

### 3.3 Detection distribution JustETF trop large

**Fichier** : `src/lib/justetf.ts:155-158` — Cherche "Accumulating"/"Distributing"
dans tout le HTML de la page au lieu d'un parsing cible.

### 3.4 Score breakdown avec poids hardcodes en page detail

**Fichier** : `src/app/etf/[isin]/etf-detail-live.tsx:237-241` — Les poids affiches
(20%, 30%, 15%, 20%, 15%) sont hardcodes. Si l'utilisateur personnalise ses poids,
la page detail montre les poids par defaut.

### 3.5 Pas de rate limiting sur les API

Aucun des 12 endpoints n'a de rate limiting. `/api/refresh`, `/api/search`,
`/api/etfs/stream` et `/api/etfs/discover` sont les plus sensibles.

### 3.6 Erreurs SSE/discover exposent des details internes

**Fichiers** : `stream/route.ts:289`, `discover/route.ts:78` — `String(err)` envoie
potentiellement des stack traces au client.

### 3.7 Sharpe Ratio risk-free rate hardcode a 3%

**Fichier** : `src/lib/calculations.ts:73` — Peut devenir inexact si les taux BCE
changent. Devrait etre une constante configurable dans `constants.ts`.

---

## 4. Ce qui fonctionne correctement

- **Scoring mathematique** : Normalisation, poids (somme = 1.0), benchmarks P10/P90,
  polarite de chaque metrique — tout correct
- **Pipeline de donnees** : Flux catalog → JustETF → Yahoo → data-resolver → scoring
  solide avec fallbacks propres
- **Dedup des refreshes** : Guard `__pendingRefresh` dans etf-data.ts empeche les
  refreshes multiples en parallele
- **Validation des metriques** : Clamping ranges (returns -90%/+200%, drawdown
  -100%/0%, volatilite 0%/200%, Sharpe -5/+5) raisonnables
- **Calculs portfolio** : Projections, fiscalite (PEA 18.6%, CTO 31.4%), regle des
  4%, plafond PEA 150k€ — tout correct
- **Formats d'affichage** : TER (decimal → %), returns (decimal → %), conversions
  correctes partout sauf AUM (3 formats)
- **Tri du tableau** : Null values poussees en bas avec `?? -Infinity`, direction de
  tri correcte par colonne
- **Loading progressif** : Skeletons, fade-in, SSE streaming bien implementes
- **Types TypeScript** : Complets et coherents entre les modules
