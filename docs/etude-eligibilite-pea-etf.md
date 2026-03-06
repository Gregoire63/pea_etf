# Etude : Eligibilite PEA des ETFs du catalogue dynamique

## Contexte

L'app decouvre dynamiquement les ETFs cotes sur Euronext Paris (XPAR) via l'API
Euronext, puis attribue un score de confiance PEA a chaque ETF. Un seuil de 40/100
est requis pour integrer le catalogue.

**Probleme identifie** : L'ETF **Amundi Core MSCI World UCITS ETF Acc**
(`IE000BI8OT95`, ticker `MWRD`, ~142 EUR) etait inclus dans le catalogue alors
qu'il **n'est pas eligible PEA** sur BoursoBank.

## Analyse de la cause racine

### L'heuristique PEA (avant fix)

La fonction `computePeaConfidence(name, isin)` dans `src/lib/euronext.ts`
calculait un score additif :

| Critere                  | Points | MWRD |
|--------------------------|--------|------|
| Base (ETF sur XPAR)      | 30     | 30   |
| "PEA" dans le nom        | +50    | 0    |
| Provider connu (Amundi)  | +10    | +10  |
| Domicile IE              | +5     | +5   |
| Indice reconnu (World)   | +10    | +10  |
| Indice EU (Eurozone/FR)  | +10    | 0    |
| **Total**                |        | **55** |

Score 55 >= seuil 40 => **faux positif**.

### Pourquoi MWRD n'est pas PEA

Le PEA exige que le fonds detienne **>=75% d'actions de societes europeennes**.
Les ETFs physiques domicilies en Irlande qui repliquent des indices mondiaux
(MSCI World, S&P 500, MSCI Emerging, etc.) detiennent des actions du monde
entier et ne satisfont pas ce critere.

Seuls les ETFs utilisant la **replication synthetique (swap)** peuvent etre
eligibles PEA tout en offrant une exposition mondiale : ils detiennent un panier
d'actions EU (satisfaisant le critere 75%) et echangent la performance via un
swap avec une contrepartie.

### Pattern observe (reference : EasyBourse, mars 2026)

| Domicile | Indice non-UE | PEA eligible | Condition |
|----------|---------------|-------------|-----------|
| FR       | Oui (swap)    | **Oui**     | Amundi PEA, BNP Easy |
| LU       | Oui (swap)    | **Oui**     | CW8, Russell 2000, etc. |
| IE       | Oui (swap)    | **Oui**     | "Swap PEA" dans le nom (iShares) |
| IE       | Oui (physique)| **Non**     | MWRD, Core MSCI World, etc. |
| IE       | Non (EU only) | **Oui**     | EURO STOXX 50, MSCI EMU, MSCI France |
| DE       | Non (DAX)     | **Oui**     | 100% actions allemandes |

**Regle cle** : Un ETF IE sur un indice non-UE est PEA-eligible **si et
seulement si** il mentionne "PEA" ou "Swap" dans son nom (replication synthetique).

## ETFs IE confirmes eligibles PEA (source : EasyBourse)

| ISIN | Nom | Pourquoi PEA |
|------|-----|--------------|
| IE0002XZSHO1 | iShares MSCI World **Swap PEA** | "Swap PEA" dans le nom |
| IE000DQLYVB9 | iShares S&P 500 **Swap PEA** | "Swap PEA" dans le nom |
| IE00BP3QZJ36 | iShares MSCI France | Sous-jacent 100% France |
| IE0008471009 | iShares Core EURO STOXX 50 (Dist) | Sous-jacent 100% Eurozone |
| IE00B53L3W79 | iShares Core EURO STOXX 50 (Acc) | Sous-jacent 100% Eurozone |
| IE00BG0J9Y53 | iShares Core MSCI EMU | Sous-jacent 100% Eurozone |
| IE00B53QG562 | iShares Core MSCI EMU | Sous-jacent 100% Eurozone |
| IE00BKX55S42 | Vanguard FTSE Developed Europe ex UK | Sous-jacent ~100% Europe |
| IE00B910VR50 | SPDR MSCI EMU | Sous-jacent 100% Eurozone |

## ETFs IE faux positifs identifies (non PEA)

| ISIN | Nom | Ticker | Prix | Raison exclusion |
|------|-----|--------|------|------------------|
| IE000BI8OT95 | Amundi Core MSCI World Acc | MWRD | ~142 EUR | IE + World physique |
| IE000CNSFAR2 | Amundi Core MSCI World Dist | — | — | IE + World physique |

## Fix applique

Dans `src/lib/euronext.ts`, ajout d'une verification stricte **avant** le calcul
de score additif :

```typescript
// IE-domiciled ETFs tracking non-EU indices:
// Physical-replication IE ETFs on World/US/Emerging/Japan/Asia indices
// are NOT PEA-eligible (underlying < 75% EU equities).
// Only swap-based versions (with "PEA" or "Swap" in name) qualify.
if (
  isin.startsWith("IE") &&
  category && !EU_HEAVY_CATEGORIES.has(category) &&
  !hasPeaKeyword && !hasSwapKeyword
) {
  return { confidence: 5, reason: "ETF IE non-UE sans PEA/Swap" };
}
```

**Impact** : MWRD passe de 55 → 5 (exclu). Tous les ETF IE legitimement PEA
(iShares Swap PEA, EURO STOXX 50, MSCI EMU, etc.) ne sont pas affectes car ils
ont soit "PEA"/"Swap" dans le nom, soit un indice EU.

## Verification croisee — ETFs PEA World dans le catalogue

Apres fix, les ETFs MSCI World eligibles PEA restants :

| ISIN | Nom | Domicile | Methode | PEA |
|------|-----|----------|---------|-----|
| FR001400U5Q4 | Amundi PEA Monde MSCI World (DCAM) | FR | Swap | Oui |
| IE0002XZSHO1 | iShares MSCI World Swap PEA (WPEA) | IE | Swap | Oui |
| LU1681043599 | Amundi MSCI World UCITS ETF (CW8) | LU | Swap | Oui |
| LU2655993207 | Amundi MSCI World Dist | LU | Swap | Oui |

## Sources

- [EasyBourse — Liste ETF PEA](https://www.easybourse.com/international/article/34129/)
- [JustETF — IE000BI8OT95](https://www.justetf.com/en/etf-profile.html?isin=IE000BI8OT95)
- [Boursorama — MWRD](https://www.boursorama.com/bourse/trackers/cours/1rTMWRD/)
- [Amundi — FR001400U5Q4](https://www.amundietf.fr/fr/professionnels/produits/equity/amundi-pea-monde-msci-world-ucits-etf/fr001400u5q4)
