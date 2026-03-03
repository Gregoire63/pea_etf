# Etude : Fiabilite des donnees ETF — Sources et Architecture

## 1. Probleme identifie

### TER affiche a 85% au lieu de 0.85%

**Cause racine** : Yahoo Finance retourne `netExpenseRatio` en **pourcentage** (ex: `0.85` pour 0.85%), alors que le code l'attendait en **fraction decimale** (ex: `0.0085`).

```
Yahoo Finance : netExpenseRatio = 0.85    → signifie 0.85%
Catalogue :     ter = 0.0085              → signifie 0.85%
Affichage :     etf.ter * 100 = 85.00%   → BUG!
```

**Impact** :
- TER affiche faux dans le dashboard, detail, comparaison
- Score TER corrompu (20% du score composite)
- TER moyen dans l'overview faux
- Scoring global fausse pour tous les ETF ayant un TER Yahoo

### Autres problemes de donnees

| Probleme | Impact | Severite |
|----------|--------|----------|
| AUM renvoye a 0 par Yahoo pour certains .PA | 15% du score affecte | Moyen |
| Valeurs null traitees comme medianes (50/100) | Scores gonfles pour ETF sans donnees | Moyen |
| Aucune validation des rendements/volatilite | Valeurs aberrantes possibles | Faible |
| Source unique = point de defaillance unique | App inutilisable si Yahoo down | Eleve |

---

## 2. Sources de donnees analysees

### 2.1 Yahoo Finance (existant — source primaire)

- **Librairie** : `yahoo-finance2` (npm, v3.13.1)
- **Donnees** : Prix temps reel, historique (10 ans hebdo), AUM (netAssets/marketCap), TER (netExpenseRatio), volume, 52wk high/low
- **Format TER** : Pourcentage (0.20 = 0.20%) — ATTENTION: pas en fraction!
- **Fiabilite TER** : Moyenne — beaucoup d'ETF europeens n'ont pas de netExpenseRatio
- **Fiabilite AUM** : Moyenne — retourne 0 pour certains ETF .PA
- **Fiabilite prix** : Bonne
- **Rate limiting** : Non documente, le code utilise des batches de 5 avec 1.2s de delai
- **Cache** : 24h in-memory

### 2.2 JustETF (nouveau — source de reference)

- **URL** : `https://www.justetf.com/en/etf-profile.html?isin={ISIN}`
- **Donnees** : TER, fund size (AUM), replication, distribution, domicile, nom complet
- **Format TER** : Pourcentage affiche "0.20% p.a." — a convertir en fraction (÷100)
- **Format AUM** : "EUR 1,201m" ou "EUR 5bn" — a parser
- **Fiabilite** : Excellente — C'est LA reference pour les ETF europeens
- **Methode** : Scraping HTML (pas d'API publique)
- **Rate limiting** : Pas de rate limit documente, batches de 3 avec 2s de delai par precaution
- **Cache** : 7 jours (les metadonnees changent rarement)

**Projets de scraping existants** :
- [druzsan/justetf-scraping](https://github.com/druzsan/justetf-scraping) — Python, scrape overview + chart + profil
- [Quadra-Ryo/JustETF-Scraper-API](https://github.com/Quadra-Ryo/JustETF-Scraper-API) — Python, par ISIN
- [Naralux/justETF-overview-scraper](https://github.com/Naralux/justETF-overview-scraper) — JSON output avec TER, AUM, replication

**Donnees scrappables confirmees** :
```json
{
  "ticker": "CEA1",
  "ter": "0.20%",
  "fundSize": "1,201m",
  "replicationMethod": "Full replication",
  "distributionPolicy": "Accumulating",
  "isin": "IE00B5L8K969",
  "inceptionDate": "08/11/12",
  "ytd": "-2.60%"
}
```

### 2.3 Boursorama (existant — a etendre)

- **URL** : `https://www.boursorama.com/bourse/trackers/cours/1rT{TICKER}/`
- **Donnees actuelles** : Prix, bid/ask, spread, volume, composition (top 10 holdings)
- **Donnees a ajouter** : TER (frais de gestion/frais courants dans la fiche)
- **Format TER** : Pourcentage, ex: "0,25 %" — a parser et convertir
- **Fiabilite TER** : Bonne (source francaise officielle)
- **Methode** : Scraping HTML + __NEXT_DATA__ JSON
- **Cache** : 5 min (quotes), 24h pour TER

### 2.4 Autres sources evaluees

| Source | Type | TER | AUM | Prix | Gratuit | Verdict |
|--------|------|-----|-----|------|---------|---------|
| **Financial Modeling Prep** | API REST | Oui | Oui | Oui | Free tier 500MB/mois | Possible backup |
| **OpenFIGI** | API REST | Non | Non | Non | Oui, illimite | Utile pour mapping ISIN↔ticker |
| **EODHD** | API REST | Oui | Oui | Oui | Free tier limite | Alternative viable |
| **Morningstar** | Site web | Oui | Oui | Non | Scraping risque | Trop complexe |
| **Euronext** | Site web | Non | Non | Oui | Scraping | Redondant avec Yahoo |
| **AMF** | Open data | Non | Non | Non | Oui | Pas de donnees financieres utiles |

**Sources retenues** : JustETF (metadonnees), Boursorama (TER backup + prix FR), Yahoo Finance (prix/historique)

---

## 3. Architecture multi-sources implementee

### Pipeline de donnees

```
┌─────────────────────────────────────────────────────────┐
│                    refreshAllEtfs()                      │
│                    (etf-data.ts)                         │
└─────────────────────────┬───────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │  Yahoo   │  │ JustETF  │  │Boursorama│
     │ Finance  │  │ Scraper  │  │ Scraper  │
     │          │  │          │  │          │
     │ Prix     │  │ TER ★★★  │  │ TER ★★   │
     │ Hist 10a │  │ AUM ★★★  │  │ Prix     │
     │ AUM ★★   │  │ Nom      │  │ Holdings │
     │ TER ★    │  │ Replic.  │  │          │
     └────┬─────┘  └────┬─────┘  └────┬─────┘
          │             │             │
          └──────┬──────┘──────┬──────┘
                 │             │
          ┌──────▼─────────────▼──────┐
          │   Data Resolver           │
          │   (data-resolver.ts)      │
          │                           │
          │  TER: JustETF > Bourso    │
          │       > Yahoo > Catalogue │
          │  AUM: JustETF > Yahoo     │
          └──────────┬────────────────┘
                     │
          ┌──────────▼────────────────┐
          │  Validation & Scoring     │
          │  (scoring.ts)             │
          └──────────┬────────────────┘
                     │
          ┌──────────▼────────────────┐
          │  Cache 24h + Affichage    │
          │  avec badges de source    │
          └───────────────────────────┘
```

### Chaine de priorite TER

| Priorite | Source | Format brut | Conversion | Fiabilite |
|----------|--------|-------------|------------|-----------|
| 1 | JustETF | "0.20% p.a." | parse → 0.20 → ÷100 → 0.0020 | ★★★ |
| 2 | Boursorama | "0,25 %" | parse → 0.25 → ÷100 → 0.0025 | ★★ |
| 3 | Yahoo Finance | 0.20 (number) | ÷100 → 0.0020 | ★ |
| 4 | Catalogue | 0.0020 (fraction) | pas de conversion | fallback |

### Validation sur TOUTES les sources

- TER : 0.01% a 5% (0.0001 a 0.05 en fraction)
- AUM : > 0 EUR
- Rendements annualises : -90% a +200%
- Drawdown : -100% a 0%
- Volatilite : 0% a 200%
- Sharpe : -5 a +5
- Toute valeur hors plage → null + log warning

### Caches par source

| Source | TTL | Raison |
|--------|-----|--------|
| JustETF | 7 jours | Metadonnees stables |
| Boursorama TER | 24h | TER stable, pas besoin de refresh frequent |
| Yahoo quotes | 24h | Prix + donnees fondamentales |
| Yahoo historique | 1h | Pour les graphiques de prix |
| Boursorama quotes | 5 min | Prix temps reel |

---

## 4. Fichiers modifies/crees

### Nouveaux fichiers
- `src/lib/justetf.ts` — Scraper JustETF (TER, AUM, metadata)
- `src/lib/data-resolver.ts` — Orchestrateur multi-sources avec priorites

### Fichiers modifies
- `src/types/etf.ts` — Types `DataSourceName`, `DataProvenance` ajoutes
- `src/lib/etf-data.ts` — Integration du resolver, suppression logique TER inline
- `src/lib/boursobank.ts` — Extraction TER ajoutee
- `src/lib/scoring.ts` — Null → 30/100 au lieu de 50/100
- `src/app/etf/[isin]/page.tsx` — Badges de source (JustETF=vert, Bourso=bleu, Yahoo=ambre, Catalogue=gris)

---

## 5. Verification manuelle recommandee

Comparer les TER affiches avec les valeurs de reference JustETF :

| ETF | ISIN | TER attendu | Source JustETF |
|-----|------|-------------|----------------|
| iShares MSCI World PEA | IE0002XZSHO1 | 0.25% | justetf.com/en/etf-profile.html?isin=IE0002XZSHO1 |
| Amundi MSCI World | LU1681043599 | 0.38% | justetf.com/en/etf-profile.html?isin=LU1681043599 |
| Lyxor S&P 500 PEA | FR0011871128 | 0.15% | justetf.com/en/etf-profile.html?isin=FR0011871128 |
| Amundi EM Markets | FR0013412020 | 0.20% | justetf.com/en/etf-profile.html?isin=FR0013412020 |
| Lyxor Nasdaq x2 | FR0010342592 | 0.60% | justetf.com/en/etf-profile.html?isin=FR0010342592 |
