# Guide Expert : Les Piliers de l'Investissement ETF en PEA

**Date** : Mars 2026
**Objectif** : Reference exhaustive des principes fondamentaux de l'investissement en ETF dans le cadre du PEA francais. Ce guide alimente directement l'algorithme de selection dynamique du portefeuille.

---

## Table des matieres

1. [ACC vs DIST — Capitalisant ou Distribuant](#1-acc-vs-dist)
2. [Diversification — Le seul repas gratuit en finance](#2-diversification)
3. [Correlation & Theorie Moderne du Portefeuille](#3-correlation)
4. [Chevauchement geographique (overlap)](#4-overlap)
5. [TER et cout total de detention](#5-ter)
6. [Tracking Error & Tracking Difference](#6-tracking)
7. [Liquidite, encours (AUM) et spread](#7-liquidite)
8. [Rebalancing — Reequilibrage du portefeuille](#8-rebalancing)
9. [DCA — Dollar Cost Averaging](#9-dca)
10. [Gestion du risque — Drawdown, volatilite, levier](#10-risque)
11. [Fiscalite PEA — Optimisation 2026](#11-fiscalite)
12. [Risque de change](#12-change)
13. [Smart Beta & Facteurs](#13-smart-beta)
14. [Synthese : impact sur l'algorithme](#14-synthese)

---

## 1. ACC vs DIST — Capitalisant ou Distribuant {#1-acc-vs-dist}

### Principe

- **ACC (Capitalisant / Accumulating)** : les dividendes sont automatiquement reinvestis dans le fonds. La valeur liquidative (NAV) croit en integrant les dividendes. Zero friction.
- **DIST (Distribuant / Distributing)** : les dividendes sont verses en cash sur le compte especes du PEA. Il faut ensuite passer un ordre d'achat pour les reinvestir.

### Fiscalite dans le PEA

**Les deux sont fiscalement identiques a l'interieur du PEA.** Aucun impot n'est declenche sur les dividendes recus dans l'enveloppe, que l'ETF soit ACC ou DIST. La difference est purement operationnelle.

### Impact sur les interets composes

Sur 25 ans avec 7% de rendement annuel et 2% de dividende :
- **ACC** genere environ **54 000 EUR de plus** que DIST
- Cela equivaut a ~12 annees de versements mensuels "gratuits"
- Raisons : (a) reinvestissement immediat vs cash dormant, (b) pas de frais de courtage sur les ordres de reinvestissement

### Friction de reinvestissement DIST

Chaque reinvestissement necessite un nouvel ordre d'achat :
- Frais de courtage : 0,50 - 2,00 EUR/ordre (courtiers discount)
- Avec des dividendes trimestriels : 4 ordres/an
- Sur 30 ans : **120 transactions inutiles** et leur cout associe

### Quand privilegier DIST ?

- **Phase de retrait (retraite)** : les dividendes en cash evitent de vendre des parts
- **PEA mature (5+ ans)** : besoin de revenus reguliers sans declencher de vente
- **Profil defensif** : horizon < 10 ans, preparation de la rente

### Impact sur l'algorithme

| Situation | Preference |
|-----------|-----------|
| Phase de capitalisation (horizon > 10 ans) | **ACC** fortement prefere (+3 pts au score) |
| Profil equilibre | **ACC** legerement prefere (+1 pt) |
| Profil defensif / proche retraite | **DIST** prefere pour les slots "dividendes" |
| Montant mensuel < 200 EUR | **ACC** obligatoire (pas de friction) |

---

## 2. Diversification — Le seul repas gratuit en finance {#2-diversification}

### Le principe fondamental

> "La diversification est le seul repas gratuit en finance." — Harry Markowitz, prix Nobel 1990

En combinant des actifs faiblement correles, on **reduit le risque global du portefeuille SANS sacrifier le rendement attendu**.

### Les 4 axes de diversification dans un PEA

```
1. GEOGRAPHIQUE — Ne pas dependre d'un seul pays/continent
   - Amerique du Nord (~70% du MSCI World)
   - Europe (~20%)
   - Japon + Pacifique (~10%)
   - Marches emergents (hors MSCI World)

2. SECTORIELLE — Ne pas dependre d'une seule industrie
   - 11 secteurs GICS : Tech, Sante, Finance, Industrie, Conso, Energie...
   - Le MSCI World couvre les 11 secteurs

3. TAILLE D'ENTREPRISE
   - Large caps (MSCI World, S&P 500) — stabilite
   - Mid caps (STOXX Europe 600, Russell 2000) — croissance
   - Small caps (tres peu accessible en PEA)

4. STYLE
   - Growth (Nasdaq-100, Tech) — rendement eleve, volatilite elevee
   - Value (Europe, Dividendes) — rendement stable, volatilite moindre
```

### Regle d'or pour le PEA

Un portefeuille diversifie doit couvrir :
- **Au minimum 3 zones geographiques distinctes** (US, Europe, Emergents/Asie)
- **Le complement de l'overlap** : si le core est World (70% US), ajouter Europe et Emergents, PAS plus d'US
- **Idealement un secteur defensif** (Sante, Utilities) pour amortir les crises
- **Aucune zone > 35% du portefeuille** dans les allocations explicites

---

## 3. Correlation & Theorie Moderne du Portefeuille {#3-correlation}

### Matrice de correlation des indices

| Paire | Correlation | Interet diversification |
|-------|:-----------:|------------------------|
| MSCI World / S&P 500 | 0.95-0.97 | Tres faible (overlap massif) |
| S&P 500 / STOXX Europe 600 | 0.75-0.85 | Modere |
| S&P 500 / MSCI Emerging Markets | 0.65-0.75 | **Bon** |
| STOXX Europe 600 / MSCI EM | 0.60-0.75 | **Bon** |
| S&P 500 / TOPIX (Japon) | 0.45-0.60 | **Tres bon** |
| MSCI World / Sante Europe | 0.70 | **Bon** — secteur defensif |
| MSCI World / Energie Europe | 0.50 | **Tres bon** — contracyclique |

### Tendance 2024-2026

Les correlations entre marches actions mondiaux sont en **baisse** depuis 2024. Cela rend la diversification **plus efficace qu'au cours de la derniere decennie** (Goldman Sachs GSAM, fevrier 2026).

### Theorie Moderne du Portefeuille (Markowitz, 1952)

- Le risque d'un portefeuille n'est **pas** la moyenne ponderee des risques individuels
- Il depend des **correlations** entre les actifs
- Combiner des actifs avec rho < 1 reduit le risque total sans reduire proportionnellement le rendement
- La **frontiere efficiente** = ensemble des portefeuilles offrant le meilleur rendement pour chaque niveau de risque
- Ajouter des actifs peu correles deplace la frontiere vers le haut-gauche (meilleur rendement/risque)

### Divergence de valorisation (fin 2025)

| Indice | P/E forward | Implication |
|--------|:-----------:|-------------|
| S&P 500 | ~21.5x | Eleve — rendement futur attendu plus faible |
| MSCI EAFE (Europe, Japon) | ~13.7x | Attractif — potentiel de revalorisation |
| MSCI Emerging Markets | ~12.2x | Tres attractif — decote historique |

En 2025, le MSCI EM a surperforme le S&P 500 de +16 pts (+34% vs +18%), la plus grande surperformance des emergents en 17 ans.

---

## 4. Chevauchement geographique (overlap) {#4-overlap}

### Le piege classique

Un portefeuille "diversifie" avec 3 ETFs peut etre ultra-concentre :

```
Exemple dangereux : WPEA 60% + PSP5 25% + PUST 15%

Exposition reelle :
  US     = 60%×70% + 25%×100% + 15%×98% = 82% (!!)
  Europe = 60%×20%                        = 12%
  Japon  = 60%×10%                        = 6%
  EM     = 0%

→ Ce portefeuille est dangereusement concentre aux US
```

### Composition du MSCI World

| Region | Poids approx. |
|--------|:------------:|
| Etats-Unis | ~69.7% |
| Japon | ~6% |
| Royaume-Uni | ~4% |
| France | ~3% |
| Canada | ~3% |
| Allemagne | ~2.5% |
| Autres (17 pays) | ~12% |

### Regles pour eviter l'overlap

1. **Jamais World + S&P 500 dans le meme portefeuille** (overlap > 60%)
2. **Jamais World + Nasdaq dans le meme portefeuille** (overlap > 50% + concentration tech)
3. **Si core = World** → completer avec Europe (renforcement), Emergents (absent du World), Asie/Japon (decorrelation)
4. **Si core = S&P 500** → obligatoirement completer avec Europe, Japon, Emergents
5. **Exposition max a une seule region : 40%** (hors World qui est par nature multi-region)

### Impact sur l'algorithme

L'algorithme doit :
- Empecher la selection d'un ETF US (S&P 500, Nasdaq, MSCI USA) si le core est deja World
- Detecter et signaler les portefeuilles avec > 40% d'exposition a une seule region
- Favoriser les combinaisons a faible correlation (World + EM + Japan > World + US + Nasdaq)

---

## 5. TER et cout total de detention {#5-ter}

### Impact du TER sur les interets composes

Simulation : 10 000 EUR initial, 7% brut/an, 30 ans :

| TER | Valeur finale | Perte vs 0.10% |
|:---:|:---:|:---:|
| 0.10% | ~74 016 EUR | reference |
| 0.20% | ~71 953 EUR | -2 063 EUR |
| 0.30% | ~69 973 EUR | -4 043 EUR |
| 0.50% | ~66 144 EUR | **-7 872 EUR** |

Avec DCA 300 EUR/mois sur 30 ans :
- TER 0.10% → ~353 500 EUR
- TER 0.50% → ~336 300 EUR
- **Difference : ~17 200 EUR perdus** a cause de 0.40% de frais en plus

### Fourchettes TER par categorie PEA

| Categorie | TER typique |
|-----------|:-----------:|
| Broad market (MSCI World, S&P 500) | 0.05% - 0.25% |
| Regional (STOXX Europe 600) | 0.07% - 0.20% |
| Emerging Markets | 0.14% - 0.55% |
| Sectoriel / Thematique | 0.30% - 0.65% |
| ETF a levier | 0.35% - 0.75% |

### Nuance importante

Le TER n'est **pas** le cout total de detention. La **tracking difference** (ecart de performance ETF vs indice) est plus representative. Un fonds avec TER 0.20% mais TD -0.05% est effectivement moins cher qu'un fonds avec TER 0.10% mais TD -0.25%.

### Impact sur l'algorithme

- TER pondere a 20% dans le score composite — justifie (seul facteur predictif fiable, Morningstar)
- Benchmarks dynamiques P10/P90 pour normalisation relative
- Ne PAS sacrifier la diversification pour 0.05% de TER en moins

---

## 6. Tracking Error & Tracking Difference {#6-tracking}

### Definitions

- **Tracking Difference (TD)** : ecart de performance annualise entre l'ETF et son indice de reference.
  - TD de -0.20% = l'ETF sous-performe l'indice de 20 bps/an
  - **C'est la metrique la plus importante** pour les investisseurs long terme

- **Tracking Error (TE)** : ecart-type de la tracking difference dans le temps.
  - TE faible = sous-performance previsible
  - TE eleve = deviations erratiques

### Synthetic vs Physical

| Critere | Synthétique (swap) | Physique |
|---------|:---:|:---:|
| Tracking error | Plus faible | Legerement plus eleve |
| Tracking difference | Souvent meilleure | Cash drag, taxes dividendes |
| Risque de contrepartie | Oui (plafonne a 10% NAV par UCITS) | Non |
| PEA-eligible pour indices non-EU | **Oui** — c'est la methode standard | Rarement |
| Revenue de pret de titres | Via le swap | Possible |

### Seuils acceptables

| Metrique | Excellent | Acceptable | Inquietant |
|----------|:---------:|:----------:|:----------:|
| Tracking difference | -0.05% a +0.10% | -0.10% a -0.30% | > -0.40% |
| Tracking error | < 0.10% | < 0.30% | > 0.50% |

### Particularite PEA

La majorite des ETFs PEA sont **synthetiques** (swap-based) pour repliquer des indices non-europeens tout en restant PEA-eligibles. C'est structurellement avantageux pour la tracking difference mais introduit un risque de contrepartie (limite par UCITS a 10% de la NAV avec reset quotidien).

**La replication synthetique ne doit PAS etre penalisee dans le scoring** — elle produit souvent de meilleurs resultats que la replication physique.

---

## 7. Liquidite, encours (AUM) et spread {#7-liquidite}

### AUM et risque de fermeture

| AUM | Risque | Recommandation |
|:---:|:------:|----------------|
| < 20 M EUR | **Eleve** | Eviter — risque de fermeture reel |
| 20 - 50 M EUR | Modere | Acceptable si emetteur solide (Amundi, iShares) |
| 50 - 100 M EUR | Faible | Seuil de survie — un seul fonds > 50M a ferme historiquement |
| 100 - 500 M EUR | Tres faible | Bonne liquidite, spreads corrects |
| > 500 M EUR | Quasi nul | Excellente liquidite, spreads serres |
| > 1 Md EUR | Negligeable | Optimal |

### Bid-ask spread (cout cache)

| Categorie ETF | Spread typique |
|---------------|:--------------:|
| Large-cap (iShares Core MSCI World) | 0.02% - 0.05% |
| Mid-tier | 0.05% - 0.15% |
| Small / niche | 0.15% - 0.50%+ |

Ce spread est paye a **chaque transaction** — pour un DCA mensuel, ca s'accumule.

### Statistiques de fermeture

- 244 ETFs fermes en 2023
- Age moyen a la fermeture : 5.4 ans
- AUM moyen a la fermeture : 54 M$
- **Aucun ETF > 50 M$ AUM n'a jamais ferme** (sauf un cas exceptionnel)

### Impact sur l'algorithme

- AUM pondere a 15% dans le score composite avec benchmarks dynamiques P10/P90
- **Plancher dur** : ETFs < 50 M EUR → alerte ; < 20 M EUR → penalite forte
- Force de l'emetteur : un ETF Amundi a 30 M est plus sur qu'un ETF de petit emetteur a 80 M
- Volume de transaction comme proxy supplementaire de liquidite

---

## 8. Rebalancing — Reequilibrage du portefeuille {#8-rebalancing}

### Pourquoi reequilibrer ?

Sans reequilibrage, les positions gagnantes prennent de plus en plus de poids. Un portefeuille 50/50 World/EM peut deriver vers 70/30 si le World surperforme. Cela degrade la diversification.

### Les 3 strategies

| Strategie | Methode | Avantage | Inconvenient |
|-----------|---------|----------|--------------|
| Calendaire | Reequilibrer a date fixe (annuel) | Simple | Peut manquer les grosses derives |
| Seuil | Reequilibrer si deviation > 5% | Efficient | Necessite surveillance |
| **Hybride** (calendaire + seuil) | Verifier regulierement, agir si deviation > seuil | **Optimal** (Vanguard) | Legerement plus complexe |

### Parametres optimaux

- **Frequence de verification** : semestrielle a annuelle
- **Seuil de declenchement** : 5% absolu (ou 25% relatif)
- **Attention** : reequilibrer trop souvent (mensuel) sous-performe car on coupe les gagnants trop tot

### Avantage massif du PEA

**Le reequilibrage dans le PEA ne declenche AUCUN impot sur les plus-values.**

En CTO, chaque vente pour reequilibrer est imposee a 31.4% (flat tax 2026). Cette friction fiscale rend le reequilibrage beaucoup plus couteux et pousse a le faire moins souvent.

Dans le PEA, on peut reequilibrer **agressivement** sans consequence fiscale. C'est un des avantages les plus sous-estimes de l'enveloppe.

### Reequilibrage par les flux

Pour les investisseurs en phase de capitalisation (DCA), la methode la plus simple :
- Investir les versements mensuels **dans la position la plus sous-ponderee**
- Pas besoin de vendre — le flux mensuel reequilibre naturellement
- Efficace tant que les versements sont significatifs par rapport a la taille du portefeuille

---

## 9. DCA — Dollar Cost Averaging {#9-dca}

### Principe

Investir un montant fixe a intervalles reguliers. On achete **plus de parts quand les prix sont bas** et **moins quand ils sont hauts**, ce qui lisse le prix d'entree moyen.

### DCA vs Lump Sum (etude Vanguard 2012)

- Le Lump Sum (tout investir d'un coup) bat le DCA **67% du temps** sur des periodes de 10 ans
- Le Lump Sum produit **+2.4% de rendement total** en moyenne
- **Mais** : la majorite des investisseurs n'ont pas de lump sum — ils investissent depuis leur salaire mensuel
- Le DCA est donc la **strategie par defaut** pour les salaries

### Frequence optimale

| Montant mensuel | Frais courtage | % du montant | Frequence recommandee |
|:---:|:---:|:---:|:---:|
| 500+ EUR | 1 EUR | 0.2% | **Mensuel** — cout negligeable |
| 200-500 EUR | 1 EUR | 0.2-0.5% | **Mensuel** — encore acceptable |
| 100-200 EUR | 1 EUR | 0.5-1% | **Bimestriel** — regrouper 2 mois |
| < 100 EUR | 1 EUR | > 1% | **Trimestriel** — minimiser les frais |

### Regle pratique

Si les frais de courtage representent > 0.5% du montant investi, il vaut mieux regrouper les versements pour reduire la frequence.

### Impact sur l'algorithme

- Pas d'impact direct sur le scoring des ETFs
- Influence la decision `simplify` (< 200 EUR → moins d'ETFs pour reduire les ordres)
- Les ETFs a spread faible (= AUM eleve) sont preferes pour le DCA frequent

---

## 10. Gestion du risque — Drawdown, volatilite, levier {#10-risque}

### Maximum Drawdown — Les pires chutes historiques

| Indice | Drawdown 2008 | Drawdown 2020 | Drawdown 2022 |
|--------|:---:|:---:|:---:|
| S&P 500 | -56% | -34% | -25% |
| MSCI World | -54% | -34% | -20% |
| MSCI Emerging Markets | -61% | -32% | -28% |
| Nasdaq-100 | -52% | -28% | -33% |
| STOXX Europe 600 | -59% | -35% | -18% |
| MSCI USA 2x Leveraged | **-68%** | -55% | -45% |

### Volatility Drag — L'ennemi invisible

La formule fondamentale :

```
Rendement compose reel ≈ Rendement arithmetique moyen - (Volatilite² / 2)
```

Exemples :
| Rendement moyen | Volatilite | Rendement compose reel |
|:---:|:---:|:---:|
| 10% | 15% | ~8.9% |
| 10% | 30% | ~5.5% |
| 10% | 40% | ~2.0% |
| 10% | 50% | **-2.5%** (perte nette !) |

### Asymetrie des pertes

| Perte | Gain necessaire pour revenir a zero |
|:-----:|:---:|
| -10% | +11.1% |
| -20% | +25.0% |
| -30% | +42.9% |
| -50% | **+100.0%** |
| -70% | **+233.3%** |

### ETFs a effet de levier — Pourquoi les penaliser fortement

Les ETFs 2x leveraged subissent un **reset quotidien** qui amplifie le volatility drag :
- Le drag est multiplie par le **carre du facteur de levier** (2x → 4x le drag)
- Sur des periodes volatiles, un ETF 2x peut perdre de l'argent meme si l'indice sous-jacent est stable
- Exemple : si l'indice fait +10% puis -10% (retour a -1% net), le 2x fait +20% puis -20% (retour a -4% net)

**Recommandation** : penalite de 30% sur le score pour le levier 2x (au lieu de 15% actuellement).

### Risque de sequence de rendement

Particulierement dangereux pour les investisseurs proches de la retraite :
- 2 portefeuilles avec le meme rendement moyen sur 20 ans mais des sequences differentes peuvent avoir des resultats tres differents en phase de retrait
- Des rendements negatifs en debut de retrait sont devastateurs
- C'est pourquoi le profil defensif doit privilegier la **stabilite** (faible volatilite, faible drawdown)

### Impact sur l'algorithme

- Drawdown pondere a 15% dans le score composite ✓
- Sharpe ratio pondere a 20% ✓
- **Penalite levier augmentee** : 0.85 → 0.70 (soit -30% au lieu de -15%)
- Rendement attendu ajuste de la volatilite : `return - vol²/2` au lieu du return brut
- Pour les profils defensifs, surponderer drawdown et Sharpe

---

## 11. Fiscalite PEA — Optimisation 2026 {#11-fiscalite}

### Changement majeur 2026 : hausse de la CSG

Les prelevements sociaux passent de **17.2% a 18.6%** au 1er janvier 2026, suite a la hausse de la CSG. Ce taux s'applique retroactivement a **toutes les plus-values accumulees**, y compris celles generees pendant les annees a taux plus bas.

### Comparaison des enveloppes fiscales (2026)

| Enveloppe | Impot sur le revenu | Prelevements sociaux | Total | Avantages |
|-----------|:---:|:---:|:---:|-----------|
| **PEA (5+ ans)** | **0%** | **18.6%** | **18.6%** | Meilleure enveloppe actions |
| Assurance-vie (8+ ans) | 7.5% (avec abattement) | 17.2%* | 24.7% | Protegee de la hausse CSG |
| CTO | 12.8% | 18.6% | 31.4% | Pas de plafond de versement |

*L'assurance-vie a ete explicitement protegee de la hausse CSG : ses PS restent a 17.2%.

### Avantages structurels du PEA

1. **Exoneration d'IR apres 5 ans** : seuls les PS de 18.6% s'appliquent
2. **Reequilibrage sans impot** : achat/vente sans friction fiscale
3. **Dividendes non imposes** : les dividendes recus dans le PEA ne declenchent aucun impot
4. **Pas de declaration annuelle** des plus-values (reportees au retrait)

### Plafond PEA

- **150 000 EUR de versements** (contributions uniquement)
- Les plus-values et dividendes peuvent faire depasser ce montant sans limitation
- Un PEA a 150 000 EUR de versements peut valoir 500 000+ EUR sans probleme

### Strategie fiscale optimale

1. **Maximiser les versements PEA** avant d'utiliser un CTO
2. **Ne pas retirer avant 5 ans** sauf urgence absolue (sinon flat tax 31.4%)
3. **Reequilibrer librement** dans le PEA (avantage fiscal massif vs CTO)
4. **Preferer les ETFs ACC** en phase de capitalisation (pas de friction dividendes)
5. **Basculer vers DIST** en phase de retrait/rente (dividendes sans vendre de parts)

### Impact sur l'algorithme

- Mettre a jour le taux PS de 17.2% → 18.6% dans les projections
- Calcul d'economie fiscale PEA vs CTO : `gains × (0.314 - 0.186) = gains × 0.128`
- Pas d'impact sur le scoring des ETFs (le PEA traite ACC et DIST de maniere identique fiscalement)

---

## 12. Risque de change {#12-change}

### EUR-hedged vs Unhedged

- **Court terme (< 2 ans)** : les fluctuations de change peuvent ajouter 5-15% de volatilite. Le hedging est utile.
- **Long terme (5+ ans)** : les variations de change tendent a se compenser. Le hedging a un **cout** (difference de taux d'interet) qui erode le rendement.

### Cout actuel du hedging EUR/USD

Le hedging EUR→USD coute actuellement de l'argent car les taux europeens sont inferieurs aux taux americains. Ce cout s'ajoute au TER et reduit le rendement.

### Recommandation pour le PEA

- **Actions (horizon long)** : **Unhedged prefere.** Le risque de change est une forme de diversification. Le cout du hedging erode les rendements sur le long terme.
- **La diversification monetaire est un atout** : si l'euro s'affaiblit, les positions en USD gagnent de la valeur en EUR.

### Contexte PEA

La quasi-totalite des ETFs PEA cotent en EUR mais sont **unhedged** par rapport aux devises sous-jacentes. La NAV reflete a la fois la performance de l'indice ET les mouvements de change. Tres peu d'ETFs PEA-eligibles proposent un hedging EUR.

### Impact sur l'algorithme

- Pas de penalite pour les ETFs unhedged (c'est la norme en PEA)
- Information affichee a titre educatif
- Pour les profils defensifs a tres court horizon, privilegier les ETFs zone euro (STOXX 600, EURO STOXX 50) qui n'ont pas de risque de change

---

## 13. Smart Beta & Facteurs {#13-smart-beta}

### Les 5 facteurs academiquement valides

| Facteur | Prime historique | Description | Risque |
|---------|:---:|-------------|--------|
| Value | +2-3%/an | Actions sous-evaluees (P/E bas) | Sous-performance prolongee possible (2010-2020) |
| Momentum | +3-4%/an | Actions en tendance haussiere | Retournements brutaux |
| Quality | +1-2%/an | ROE eleve, faible dette | Premium plus faible |
| Low Volatility | Comparable | Volatilite inferieure au marche | Sous-performe en marche haussier |
| Size (Small Cap) | +1-2%/an | Petites capitalisations | Plus volatil |

### Disponibilite en PEA

**Tres limitee.** La majorite des ETFs factoriels mondiaux (iShares Edge MSCI World Momentum, Value, Quality) ne sont **PAS PEA-eligibles** (ISIN irlandais domicilie hors plan).

Options PEA-eligibles :
- Amundi MSCI Europe Multi Smart Allocation (multifactoriel, TER 0.40%)
- Quelques ETFs factoriels sur indices europeens

### Recommandation

Pour le PEA, **rester sur les indices larges market-cap weighted** (MSCI World, S&P 500, STOXX 600). Le smart beta :
- A une offre PEA trop limitee
- Coute plus cher (TER +0.15-0.30%)
- Presente un risque cyclique (aucun facteur ne surperforme constamment)
- N'est pertinent que comme **satellite** (< 5% du portefeuille)

### Impact sur l'algorithme

- Pas de traitement specifique smart beta dans le scoring
- Les ETFs factoriels sont evalues par le meme score composite (TER, perf, AUM, Sharpe, drawdown)
- Leur TER plus eleve sera naturellement penalise

---

## 14. Synthese : impact sur l'algorithme {#14-synthese}

### Modifications implementees

| Pilier | Modification | Fichier |
|--------|-------------|---------|
| ACC vs DIST | Bonus ACC en phase de capitalisation, preference DIST en phase de retrait | `portfolio-strategy.ts` |
| Diversification | Slots par zone geographique, max 35% par zone | `portfolio-strategy.ts` |
| Correlation | Slots conçus pour minimiser la correlation inter-ETFs | `portfolio-strategy.ts` |
| Overlap | World exclut US/Nasdaq dans les slots complementaires | `portfolio-strategy.ts` |
| TER | Poids 20%, benchmarks dynamiques P10/P90 | `scoring.ts` |
| Liquidite (AUM) | Poids 15%, plancher dur < 50M EUR avec alerte | `scoring.ts` |
| Levier | Penalite augmentee 15% → 30% pour le 2x leveraged | `scoring.ts` |
| Volatility drag | Rendement attendu ajuste : `return - vol²/2` | `portfolio-strategy.ts` |
| Fiscalite 2026 | PS mis a jour a 18.6% | `portfolio-client.tsx` |
| ACC/DIST scoring | +3 pts ACC pour profils longs, preference DIST en defensif | `scoring.ts` + `portfolio-strategy.ts` |

### Poids du score composite (inchange)

| Metrique | Poids | Justification |
|----------|:-----:|---------------|
| TER | 20% | Seul facteur predictif fiable (etude Morningstar) |
| Performance 5y | 30% | Tendance long terme |
| AUM | 15% | Proxy de liquidite et viabilite |
| Sharpe | 20% | Rendement ajuste du risque |
| Max Drawdown | 15% | Protection contre les chutes extremes |

### Piliers non implementes (informatifs uniquement)

| Pilier | Raison |
|--------|--------|
| Tracking difference | Donnee non disponible dans les sources actuelles |
| Smart beta / facteurs | Offre PEA trop limitee pour justifier un traitement specifique |
| Risque de change | Pas de penalite — l'unhedged est la norme en PEA long terme |
| DCA frequence | Information educative, pas d'impact sur la selection d'ETFs |
| Rebalancing | Recommandation affichee, pas d'automatisation dans l'app |

---

## References

- Markowitz, H. (1952). Portfolio Selection. *Journal of Finance.*
- Vanguard (2012). Dollar-cost averaging just means taking risk later.
- Vanguard. Finding the optimal rebalancing frequency.
- Morningstar. Predictive power of expense ratios (2016).
- Goldman Sachs AM. US Market Pulse (February 2026).
- MSCI. Correlations within and across global markets.
- Service-Public.fr. Imposition du PEA.
- Meilleurtaux (2026). Prelevements sociaux PEA passe a 18.6%.
- trackingdifferences.com. ETF tracking data.
- etf.com. Fund closure risk study.
