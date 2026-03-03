# Etude : Strategie d'Investissement ETF PEA — Diversification, Analyse et Dynamisation

**Date** : Mars 2026
**Objectif** : Concevoir une strategie ETF PEA robuste, fondee sur la diversification geographique et sectorielle, avec une selection dynamique qui s'adapte aux donnees de marche reelles.

---

## 1. Pourquoi la diversification est le pilier n°1

### 1.1 Le principe fondamental : ne pas mettre tous ses oeufs dans le meme panier

La diversification est le **seul "repas gratuit" en finance** (Harry Markowitz, prix Nobel 1990). En combinant des actifs faiblement correles, on reduit le risque global du portefeuille SANS sacrifier le rendement attendu.

**Concretement pour un PEA :**
- Si la tech US s'effondre de 40% (comme en 2022), un portefeuille 100% Nasdaq perd 40%
- Un portefeuille diversifie (World 55% + Europe 20% + Emergents 15% + Sante 10%) ne perd que ~20%
- Sur le long terme, les deux convergent vers des rendements similaires, mais le second offre un **trajet beaucoup moins volatil**

### 1.2 Les 4 axes de diversification dans un PEA

```
Diversification
├── 1. GEOGRAPHIQUE — Ne pas dependre d'un seul pays/continent
│   ├── Amerique du Nord (~60% du MSCI World)
│   ├── Europe (~20%)
│   ├── Japon + Pacifique (~10%)
│   └── Marches emergents (hors MSCI World)
│
├── 2. SECTORIELLE — Ne pas dependre d'une seule industrie
│   ├── Technologie, Sante, Finance, Industrie, Consommation
│   ├── Energie, Utilities, Immobilier, Materiaux
│   └── Le MSCI World couvre ~11 secteurs GICS
│
├── 3. TAILLE D'ENTREPRISE — Capter la croissance a tous les niveaux
│   ├── Large caps (MSCI World, S&P 500) — stabilite
│   ├── Mid caps (STOXX Europe 600, Russell 2000) — croissance
│   └── Small caps (tres peu accessible en PEA)
│
└── 4. STYLE — Equilibrer croissance et valeur
    ├── Growth (Nasdaq-100, Tech) — rendement eleve, volatilite elevee
    └── Value (Europe, Dividendes) — rendement stable, volatilite moindre
```

### 1.3 Analyse de correlation entre zones geographiques

Les actifs faiblement correles se compensent mutuellement en cas de choc.

| Paire | Correlation approx. | Interet diversification |
|-------|--------------------|-----------------------|
| US / Europe | 0.75–0.85 | Modere — meme cycle economique occidental |
| US / Emergents | 0.55–0.70 | **Bon** — cycles economiques differents |
| Europe / Emergents | 0.50–0.65 | **Bon** — moteurs economiques distincts |
| US / Japon | 0.45–0.60 | **Tres bon** — politique monetaire decorrelée |
| World / Sante | 0.70 | **Bon** — secteur defensif |
| World / Energy | 0.50 | **Tres bon** — contracyclique |

**Conclusion** : Combiner des ETFs de zones geographiques differentes reduit significativement la volatilite du portefeuille.

---

## 2. Cartographie de la diversification par ETF du catalogue PEA

### 2.1 Couverture geographique

| ETF / Indice | Amerique Nord | Europe | Japon/Pac | Emergents | Nb secteurs | Nb entreprises |
|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| **MSCI World** (WPEA, CW8, DCAM, LCWD) | ~70% | ~20% | ~10% | 0% | 11 | 1 500+ |
| **S&P 500** (PSP5, ESE) | 100% | 0% | 0% | 0% | 11 | 500 |
| **Nasdaq-100** (PUST) | ~98% | ~2% | 0% | 0% | 7 | 100 |
| **STOXX Europe 600** (ETZ) | 0% | 100% | 0% | 0% | 11 | 600 |
| **EURO STOXX 50** (MEUD, CEU) | 0% | 100% | 0% | 0% | 9 | 50 |
| **CAC 40** (CACC, C50) | 0% | 100% (FR) | 0% | 0% | 10 | 40 |
| **MSCI EM** (PAEEM, CEMU) | 0% | 0% | ~30% | 70% | 11 | 1 400+ |
| **MSCI EM Asia** (PAASI) | 0% | 0% | ~45% | 55% | 11 | 1 100+ |
| **MSCI India** (PINR) | 0% | 0% | 0% | 100% (IN) | 10 | 130+ |
| **TOPIX** (TPXE) | 0% | 0% | 100% (JP) | 0% | 11 | 2 100+ |
| **Russell 2000** (RS2K) | 100% (small US) | 0% | 0% | 0% | 11 | 2 000 |

### 2.2 Probleme identifie : le piege de l'overlap MSCI World + US

Un portefeuille WPEA 60% + PSP5 25% + PUST 15% semble diversifie (3 ETFs!) mais :

```
Exposition reelle US :
  WPEA  : 60% × 70% US  = 42% du portefeuille
  PSP5  : 25% × 100% US = 25% du portefeuille
  PUST  : 15% × 98% US  = 15% du portefeuille
  ──────────────────────────────────────────────
  TOTAL US              = 82% du portefeuille (!!)
  TOTAL Europe          = 60% × 20% = 12%
  TOTAL Japon/Pac       = 60% × 10% = 6%
  TOTAL Emergents       = 0%
```

**Ce portefeuille n'est PAS diversifie.** Il est ultra-concentre sur les US et completement absent des emergents. Si les US sous-performent (comme en 2000-2010), le portefeuille souffre enormement.

### 2.3 Portefeuille reellement diversifie : la regle d'or

Un portefeuille diversifie doit couvrir :
- **Au minimum 3 zones geographiques distinctes** (US, Europe, Emergents/Asie)
- **Le complement de l'overlap** : si le core est World (70% US), ajouter Europe et Emergents, PAS plus d'US
- **Idealement un secteur defensif** pour les profils equilibres/defensifs (Sante, Utilities)

---

## 3. Strategie recommandee par profil

### 3.1 Profil Agressif (horizon >= 20 ans, age <= 50)

**Objectif** : Maximiser la croissance long terme en couvrant le maximum de marches.

| Slot | Role | Poids standard | Poids simplifie | Pourquoi ce slot |
|------|------|:-:|:-:|------|
| Core World (MSCI World) | Coeur | 50% | 80% | Base mondiale : 1 500 entreprises, 23 pays developpes, 11 secteurs. Deja diversifie en soi. |
| Marches Emergents (MSCI EM) | Complement | 20% | 20% | ~40% du PIB mondial mais <15% du MSCI World. Chine, Inde, Bresil = moteurs de croissance du 21e siecle. Correlation modere avec les marches developpes. |
| Europe Large (STOXX 600) | Complement | 15% | — | Renforce l'Europe sous-representee dans le World. 600 entreprises, valorisations plus attractives que le US (P/E ~14 vs ~22). Exposure devise EUR directe. |
| Asie-Pacifique ou Japon | Satellite | 10% | — | Japon (TOPIX) : 2e economie developpee, correlation faible avec US. Ou Asie EM pour capter l'Inde/Coree/Taiwan. |
| Sectoriel defensif (Sante) | Satellite | 5% | — | Secteur defensif par excellence : la sante resiste aux recessions. Decorrelation partielle avec la tech. |

**Exposition geographique resultante** :
```
Amerique Nord : 50% × 70% + 0% + 0% + 0% = 35%
Europe        : 50% × 20% + 15% + 0%     = 25%
Emergents     : 20%                        = 20%
Japon/Asie    : 50% × 10% + 10%           = 15%
Sectoriel     : 5%                         = 5%
```
→ **Repartition equilibree, aucune zone > 35%**

### 3.2 Profil Equilibre (horizon >= 10 ans)

**Objectif** : Croissance reguliere avec protection contre les chocs regionaux.

| Slot | Role | Poids standard | Poids simplifie |
|------|------|:-:|:-:|
| Core World | Coeur | 50% | 100% |
| Europe Large (STOXX 600) | Complement | 20% | — |
| Marches Emergents | Complement | 15% | — |
| France / Zone Euro dividendes | Satellite | 10% | — |
| Sectoriel defensif (Sante ou Utilities) | Satellite | 5% | — |

**Pourquoi cette allocation** :
- Le World est deja diversifie — en mode simplifie, un seul ETF World suffit (c'est le meilleur compromis cout/diversification)
- Europe 20% : reduit la dependance aux US, valorisations attractives, dividendes plus eleves
- Emergents 15% : diversification geographique, potentiel de croissance, decorrelation
- Zone Euro/France 10% : ancrage local, avantages liés au PEA, dividendes
- Sectoriel 5% : protection contre les baisses cycliques

### 3.3 Profil Defensif (horizon < 10 ans)

**Objectif** : Preserver le capital, reduire la volatilite, preparer le decaissement.

| Slot | Role | Poids standard | Poids simplifie |
|------|------|:-:|:-:|
| Core World | Coeur | 40% | 60% |
| Europe Large (STOXX 600) | Complement | 20% | — |
| Zone Euro Dividendes (DIST) | Complement | 20% | 40% |
| Sectoriel defensif (Sante ou Utilities) | Complement | 10% | — |
| Emergents | Satellite | 10% | — |

**Pourquoi des ETFs distribuants** :
- Les ETFs DIST versent les dividendes en cash trimestriellement
- Prepare naturellement la phase de rente (retraite)
- Le MEUD (EURO STOXX 50 DIST) a un TER de seulement 0.07% — le moins cher du PEA
- Les dividendes europeens sont historiquement plus stables que les US

**Pourquoi encore des emergents a 10%** :
- Meme a 5-10 ans de la retraite, un minimum d'emergents protege contre l'inflation
- Les emergents representent la croissance mondiale — ne pas s'en couper completement
- 10% est une position modeste qui n'ajoute pas de volatilite significative au portefeuille global

---

## 4. Le role de chaque categorie d'ETF dans la diversification

### 4.1 ETFs Monde (World) — Le socle universel

| ETF | ISIN | TER | Indice | Interet |
|-----|------|-----|--------|---------|
| WPEA | IE0002XZSHO1 | 0.20% | MSCI World | TER competitif, recent, iShares |
| DCAM | FR001400U5Q4 | 0.20% | MSCI World | Alternative recente Amundi |
| CW8 | LU1681043599 | 0.38% | MSCI World | L'historique, gros encours, TER plus eleve |
| LCWD | LU1781541179 | 0.12% | MSCI World | TER le plus bas (!), mais encours a verifier |

**Verdict** : Un ETF World est **incontournable** comme coeur. LCWD a le TER le plus bas mais il faut verifier son encours. WPEA est le meilleur compromis TER/liquidite. Le moteur de scoring choisit automatiquement.

### 4.2 ETFs Emergents — Le complement indispensable

| ETF | ISIN | TER | Indice | Interet |
|-----|------|-----|--------|---------|
| PAEEM | FR0013412020 | 0.30% | MSCI EM | Large, 1 400+ entreprises |
| CEMU | LU1681044480 | 0.20% | MSCI EM | TER plus bas, meme indice |
| PLEM | FR0011869296 | 0.20% | MSCI EM Latam | Niche Amerique Latine |
| PAASI | FR0013412012 | 0.30% | MSCI EM Asia | Focus Asie emergente |
| PINR | FR0011869320 | 0.85% | MSCI India | Pur play Inde, TER eleve |

**Pourquoi les emergents sont essentiels** :
- Les pays emergents representent **~58% de la population mondiale** et **~40% du PIB**
- Mais seulement **~12% du MSCI World** → ils sont largement sous-representes
- L'Inde devrait devenir la 3e economie mondiale d'ici 2030
- La Chine reste un geant malgre les tensions geopolitiques
- La **correlation avec les marches developpes est moderee** (~0.60) → excellent pour la diversification

### 4.3 ETFs Europe — L'ancrage de proximite

| ETF | ISIN | TER | Indice | Interet |
|-----|------|-----|--------|---------|
| ETZ | FR0011550193 | 0.19% | STOXX Europe 600 | Le plus large : 600 entreprises, 17 pays |
| MEUD | FR0007054358 | 0.07% | EURO STOXX 50 | DIST, TER ultra-bas, mais seulement 50 titres |
| CEU | LU1681040223 | 0.20% | EURO STOXX 50 | ACC, meme indice que MEUD |

**Pourquoi l'Europe est complementaire** :
- Valorisations plus attractives que les US (P/E moyen ~14 vs ~22)
- Dividendes plus eleves en moyenne (~3% vs ~1.5%)
- Exposition a des secteurs forts en Europe : luxe (LVMH), pharma (Novo Nordisk), industrie (Siemens)
- Le STOXX Europe 600 (ETZ) est preferable car beaucoup plus diversifie que l'EURO STOXX 50

### 4.4 ETFs Asie / Japon — La decorrelation

| ETF | ISIN | TER | Indice | Interet |
|-----|------|-----|--------|---------|
| TPXE | FR0011411980 | 0.20% | TOPIX | 2 100 entreprises japonaises, faible correlation avec US |
| CP9 | LU1681043086 | 0.45% | MSCI Pacific ex Japan | Australie, Hong Kong, Singapour |
| PKRW | FR0011869312 | 0.20% | MSCI Korea | Pure play Coree du Sud (Samsung, SK Hynix) |

**Le cas japonais** : Le Japon est la 4e economie mondiale. Le TOPIX a une correlation faible avec le S&P 500 (~0.50) ce qui en fait un excellent diversificateur. De plus, les reformes de gouvernance d'entreprise au Japon depuis 2023 (Tokyo Stock Exchange) dopent les rendements.

### 4.5 ETFs Sectoriels — La touche satellite

| ETF | ISIN | TER | Secteur | Role diversification |
|-----|------|-----|---------|---------------------|
| HLT | LU1834986900 | 0.30% | Sante Europe | **Defensif** : resiste aux recessions |
| CU2 | LU1834988088 | 0.30% | Utilities Europe | **Tres defensif** : services essentiels |
| C6E | LU1834988161 | 0.30% | Energie Europe | **Contracyclique** : monte quand la tech baisse |
| CD8 | LU1834988351 | 0.30% | Banques Europe | **Cyclique** : profite des hausses de taux |
| GOAI | LU2572257124 | 0.40% | IA/Robotique | **Thematique croissance** : tendance long terme |
| PANX | FR0013412269 | 0.30% | Tech US ESG | **Croissance** : overlap avec Nasdaq |

**Recommandation** : Privilegier la Sante (HLT) ou les Utilities (CU2) comme sectoriels satellites car ils ont une **faible correlation avec les indices larges** et offrent une **protection naturelle en periode de recession**.

---

## 5. Audit de la strategie actuelle

### 5.1 Problemes identifies

#### P1 — Selections ETF codees en dur (CRITIQUE)
Le fichier `portfolio-strategy.ts` contenait 8 ETFs fixes ignores par le moteur de scoring.
→ **Corrige** : selection dynamique par score.

#### P2 — Chevauchement World / US Tech (IMPORTANT)
Le profil agressif original (WPEA 60% + PUST 15%) creait une exposition US de 57%.
→ **Corrige** : le slot "US Tech" est remplace par "Europe Large" et "Asie/Japon" pour reellement diversifier.

#### P3 — Aucun emergent dans le profil equilibre original en simplifie
Un seul ETF World (100%) est certes simple, mais ignore completement les emergents.
→ **Inchange en simplifie** (frais de courtage prohibitifs avec 2+ ETFs a <200 EUR/mois), mais le World couvre deja 23 pays.

#### P4 — Absence totale de sectoriels defensifs
Aucun profil n'incluait de sectoriel defensif (sante, utilities) pour amortir les crises.
→ **Corrige** : ajout d'un slot sectoriel defensif dans les profils standard.

#### P5 — Pas d'Asie/Japon independant
Le Japon/Pacifique represente ~10% du MSCI World mais avec un potentiel de decorrelation enorme.
→ **Corrige** : ajout d'un slot Asie/Japon dans le profil agressif.

#### P6 — Rendements attendus statiques
Les rendements etaient codes en dur (8-10%, 7-8%, 5-6%).
→ **Corrige** : calcul dynamique depuis les performances reelles ponderees.

#### P7 — Benchmarks de scoring statiques
Les bornes de normalisation etaient arbitraires.
→ **Corrige** : percentiles P10/P90 calcules depuis les donnees reelles.

---

## 6. Architecture technique

### 6.1 Pipeline de donnees

```
getAllEtfsRanked()  ──→  EtfRankedEntry[]  (scores + returns reels)
         │
         ├─→ computeDynamicBenchmarks()  ──→  Scoring adaptatif (P10/P90)
         │
         └─→ computePortfolioStrategy(profile, rankedEtfs)
                    │
                    ├── Pour chaque slot du profil de risque :
                    │   ├── Filtre par categories + distribution + !leveraged
                    │   ├── Trie par score descendant
                    │   └── Selectionne le meilleur ETF
                    │
                    ├── Calcule rendement attendu = avg(return5y) - avg(TER)
                    ├── Genere raisons avec donnees reelles (score, TER, perf, AUM)
                    └── Retourne PortfolioStrategy complete
```

### 6.2 Selection dynamique par slot

Pour chaque emplacement de la strategie :
1. Filtrer les ETFs du catalogue par **categories eligibles** et **type de distribution**
2. Exclure les ETFs a **levier** (sauf demande explicite)
3. Trier par **score composite descendant** (combinaison TER + perf + AUM + Sharpe + drawdown)
4. Selectionner le **top 1**
5. Si aucun candidat : **fallback sur un ETF par defaut**

Cela garantit que si un nouvel ETF PEA avec un meilleur TER ou de meilleures performances est ajoute, il sera automatiquement selectionne.

### 6.3 Benchmarks dynamiques

Le scoring utilise des bornes calculees depuis les percentiles P10/P90 des donnees reelles :
- **P10 → best** : les 10% meilleurs ETFs definissent la borne haute
- **P90 → worst** : les 10% pires definissent la borne basse
- Si moins de 5 ETFs : fallback sur les bornes statiques de `constants.ts`

### 6.4 Rendement attendu dynamique

```
rendement_attendu = SUM(allocation_i × return5y_i) − SUM(allocation_i × TER_i)
```
- Fallback : `return3y` ou `return1y` si `return5y` absent
- Plancher : taux sans risque (3%, OAT francaise)
- Plafond : 15% (au-dela = irrealiste)

---

## 7. Validation du scoring

### 7.1 Poids du score composite

| Metrique | Poids | Justification |
|----------|-------|---------------|
| TER | 20% | Seul facteur predictif fiable (etude Morningstar) |
| Performance 5y | 30% | Tendance long terme |
| AUM | 15% | Proxy de liquidite et viabilite du fonds |
| Sharpe | 20% | Rendement ajuste du risque |
| Max Drawdown | 15% | Protection contre les chutes extremes |

### 7.2 Penalite levier
Multiplicateur 0.85x : le levier quotidien cree du "volatility drag" qui erode la performance sur le long terme.

### 7.3 Donnees manquantes = 30/100
L'absence de donnees est un signal negatif (ETF petit, recent, peu suivi).

---

## 8. Risques et limites

1. **Pas un conseil en investissement** : cette strategie est indicative et educative
2. **Performance passee ≠ future** : les rendements historiques ne garantissent rien
3. **Biais de survivant** : seuls les ETFs existants sont dans le catalogue
4. **Risque emetteur** : Amundi/Lyxor domine le PEA, diversification emetteur limitee
5. **Replication synthetique** : risque de contrepartie (mais limite a 10% de la NAV par la reglementation UCITS)
6. **Inflation** : les projections sont en euros nominaux, pas reels
7. **Taux sans risque** : fixe a 3%, devrait etre dynamique
8. **Pas de rebalancing automatique** : le DCA mensuel reequilibre naturellement mais imparfaitement

---

## 9. Fichiers impactes

### Modifies
- `src/lib/portfolio-strategy.ts` — Selection dynamique, slots avec diversification geo/sectorielle
- `src/lib/scoring.ts` — Benchmarks dynamiques (P10/P90)
- `src/lib/etf-data.ts` — Pipeline en 2 passes avec benchmarks adaptatifs
- `src/app/portfolio/portfolio-client.tsx` — Strategie calculee avec donnees live

### Documentation
- `docs/etude-strategie-portfolio.md` — Cette etude
- `docs/guide-expert-investissement-pea.md` — Guide expert : 13 piliers de l'investissement ETF PEA (ACC/DIST, correlation, TER, tracking, liquidite, rebalancing, DCA, risque, fiscalite 2026, change, smart beta)
- `docs/etude-donnees-etf.md` — Etude fiabilite des sources de donnees (pre-existante)

---

## 10. Evolutions Mars 2026 — Integration des piliers d'investissement

Suite a l'etude exhaustive documentee dans `docs/guide-expert-investissement-pea.md`, les modifications suivantes ont ete appliquees :

### Scoring (`scoring.ts`)
- **Penalite levier augmentee** : 0.85 → 0.70 (soit -30% au lieu de -15%). Justification : le volatility drag est amplifie par le carre du facteur de levier (2x → 4x le drag).
- **Plancher AUM** : penalite supplementaire pour les fonds < 50M EUR (-7%) et < 20M EUR (-15%). Justification : risque de fermeture, spread eleve.
- **Distribution et volatilite** ajoutees a `ScoringInput` pour usage en aval.

### Strategie (`portfolio-strategy.ts`)
- **ACC vs DIST** : bonus systematique pour ACC en phase de capitalisation (+3 pts dans le selecteur). DIST reserve aux slots de dividendes en profil defensif.
- **Volatility drag** : rendement attendu calcule avec la formule `return - vol²/2` au lieu du rendement brut.
- **Raisons enrichies** : chaque ETF affiche son type ACC/DIST avec explication du choix.
- **Correlations documentees** dans chaque slot (ex: "correlation ~0.65 avec les developpes").

### Fiscalite (`portfolio-client.tsx`)
- **PS mis a jour** : 17.2% → 18.6% (hausse CSG entree en vigueur le 01/01/2026).
- **Flat tax CTO** : 30% → 31.4% (coherent avec la hausse PS).
- **Economie fiscale** recalculee : `gains × (0.314 - 0.186)` au lieu de `gains × (0.30 - 0.172)`.
