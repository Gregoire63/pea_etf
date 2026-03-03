# Etude : Comparatif des courtiers PEA en France — Mars 2026

## 1. Contexte et objectif

Le Plan d'Epargne en Actions (PEA) est l'enveloppe fiscale privilegiee pour investir en
bourse en France. Apres 5 ans de detention, les plus-values sont exonerees d'impot sur le
revenu (seuls les prelevements sociaux de 18.6 % restent dus en 2026).

Cette etude compare les 10 principaux courtiers proposant un PEA en France, en analysant :
- Les frais (courtage, garde, inactivite, transfert)
- Les fonctionnalites (nombre de titres, plans programmes, fractions d'actions)
- Les avantages et inconvenients concrets
- Les offres promotionnelles en cours
- La methode de mise a jour dynamique des donnees

**Donnees structurees** : `src/data/pea-brokers.ts` (type PeaBroker[])
**API** : `GET /api/brokers` et `GET /api/brokers/check`
**Date de derniere verification** : 2 mars 2026

---

## 2. Rappel reglementaire PEA

| Element | Valeur |
|---------|--------|
| Plafond versements PEA | 150 000 EUR |
| Plafond PEA Jeune (18-25 ans) | 20 000 EUR |
| Plafond PEA-PME | 225 000 EUR |
| Fiscalite avant 5 ans | Flat tax 31.4 % (12.8 % IR + 18.6 % PS) |
| Fiscalite apres 5 ans | 18.6 % PS uniquement |
| Frais courtage max (loi) | 0.50 % du montant de l'ordre (en ligne) |
| Frais transfert max (loi) | 15 EUR par ligne, plafonne a 150 EUR |
| Titres eligibles | Actions et ETF de l'EEE (Espace Economique Europeen) |

---

## 3. Courtiers analyses

### 3.1 XTB — Le moins cher du marche

**Type** : Courtier en ligne | **Pays** : Pologne | **Regulateur** : KNF / AMF

| Critere | Detail |
|---------|--------|
| Frais de courtage | 0 % jusqu'a 100 000 EUR/mois, puis 0.20 % |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~1 600 |
| Nombre d'ETF | ~280 |
| Plans programmes | Non |
| Fractions d'actions | Non |
| PEA Jeune / PEA-PME | Non / Non |
| Transfert entrant | Non (prevu courant 2026) |
| Depot minimum | 10 EUR |

**Avantages** :
- 0 % de commission jusqu'a 100 000 EUR/mois — imbattable en 2026
- Aucun frais de garde, ouverture, cloture ni inactivite
- Plateforme xStation avec outils d'analyse avances
- Depot minimum tres faible (10 EUR)

**Inconvenients** :
- Transfert entrant PEA pas encore disponible
- Offre ETF plus limitee (280 ETF vs 2000+ chez Trade Republic)
- Pas de plans d'investissement programmes
- PEA lance recemment, peu de recul
- Frais de change de 0.50 % sur devises non-EUR

**Profil ideal** : Investisseur actif ou passif avec ordres mensuels < 100 000 EUR,
cherchant les frais les plus bas possibles.

**Sources** :
- https://www.xtb.com/fr/pea
- https://avenuedesinvestisseurs.fr/avis-pea-xtb/

---

### 3.2 Trade Republic — Le neo-courtier aux plans programmes gratuits

**Type** : Neo-courtier | **Pays** : Allemagne | **Regulateur** : BaFin / AMF

| Critere | Detail |
|---------|--------|
| Frais de courtage | 1 EUR fixe par ordre, 0 EUR via plan programme |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~11 400 |
| Nombre d'ETF | ~2 000 |
| Plans programmes | Oui, gratuits |
| Fractions d'actions | Non sur PEA (prevu 2026) |
| PEA Jeune / PEA-PME | Non / Non |
| Transfert entrant | Oui |
| Depot minimum | 1 EUR |

**Avantages** :
- 1 EUR par ordre fixe, plans programmes totalement gratuits
- Interface mobile epuree et intuitive
- Tres large choix de titres (11 400+ actions, 2 000+ ETF)
- Plans d'investissement automatiques sans frais — ideal DCA
- Pas de frais de garde ni d'inactivite

**Inconvenients** :
- Pas encore de fractions d'actions sur PEA (ordonnance prevue mi-2026)
- Outils d'analyse limites (pas de graphiques avances)
- Pas de PEA-PME ni PEA Jeune
- Especes PEA non remunerees
- Service client parfois lent

**Profil ideal** : Investisseur passif en DCA mensuel sur ETF. Les plans programmes
a 0 EUR en font le choix numero 1 pour l'investissement programme.

**Sources** :
- https://traderepublic.com/fr-fr/pea
- https://avenuedesinvestisseurs.fr/avis-pea-trade-republic/

---

### 3.3 Interactive Brokers — L'acces a toutes les bourses europeennes

**Type** : Courtier en ligne | **Pays** : Etats-Unis / Irlande | **Regulateur** : CBI / SEC / AMF

| Critere | Detail |
|---------|--------|
| Frais de courtage | 0.05 % par ordre, min 1.25 EUR, max 29 EUR |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~30 000 |
| Nombre d'ETF | ~5 000 |
| Plans programmes | Non |
| Fractions d'actions | Non sur PEA |
| PEA Jeune / PEA-PME | Non / Non |
| Transfert entrant | Oui |
| Depot minimum | Aucun |

**Avantages** :
- Acces a TOUTES les bourses europeennes au meme tarif (0.05 %)
- Le moins cher pour les gros ordres (plafonne a 29 EUR)
- Univers d'investissement le plus large (30 000+ titres)
- Outils professionnels (TWS, screeners, analyse technique)
- Transfert entrant et sortant gratuit

**Inconvenients** :
- Minimum 1.25-3 EUR par ordre — pas le moins cher pour petits ordres
- Interface complexe, courbe d'apprentissage importante
- Pas de PEA Jeune ni PEA-PME
- Support client principalement en anglais

**Profil ideal** : Investisseur experimente souhaitant acheter des actions hors Euronext
(Danemark, Suisse, Suede, Allemagne…) ou passant des ordres importants.

**Sources** :
- https://www.interactivebrokers.ie/fr/accounts/plan-depargne-en-action-accounts.php
- https://pea.fr/courtiers/pea-interactive-brokers-avis-2026/

---

### 3.4 Fortuneo — La banque en ligne complete

**Type** : Banque en ligne | **Pays** : France | **Regulateur** : AMF / ACPR

| Critere | Detail |
|---------|--------|
| Frais de courtage | Starter : 0 EUR < 500 EUR, 0.35 % au-dela. Optimum : 0 EUR > 500 EUR |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~8 000 |
| Nombre d'ETF | ~1 000 |
| Plans programmes | Non |
| Fractions d'actions | Non |
| PEA Jeune / PEA-PME | Oui / Oui |
| Transfert entrant | Oui |
| Depot minimum | Aucun |

**Avantages** :
- 1er ordre mensuel gratuit (selon formule)
- Banque en ligne complete (compte courant + PEA au meme endroit)
- PEA Jeune et PEA-PME disponibles
- Partenariat Amundi : 1er ordre ETF rembourse chaque mois (800-100 000 EUR)
- Interface claire, bon service client

**Inconvenients** :
- Frais plus eleves que XTB/Trade Republic pour ordres frequents
- Hors Euronext : minimum 15 EUR par ordre
- Pas de fractions d'actions ni de plans programmes automatiques

**Offre en cours** : 1er achat ETF Amundi rembourse chaque mois (jusqu'au 31/03/2026)

**Profil ideal** : Investisseur souhaitant centraliser banque + PEA, ou ayant besoin
d'un PEA Jeune pour un enfant majeur.

**Sources** :
- https://www.fortuneo.fr/bourse
- https://avenuedesinvestisseurs.fr/avis-fortuneo-bourse-pea-cto/

---

### 3.5 BoursoBank (ex-Boursorama) — La banque la plus repandue

**Type** : Banque en ligne | **Pays** : France | **Regulateur** : AMF / ACPR

| Critere | Detail |
|---------|--------|
| Frais de courtage | 0.50 % par ordre (plafond legal PEA) |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~8 000 |
| Nombre d'ETF | ~800 |
| Plans programmes | Non |
| Fractions d'actions | Non |
| PEA Jeune / PEA-PME | Oui / Oui |
| Transfert entrant | Oui |
| Ordre minimum | 100 EUR |
| Gestion profilee | Oui (1.60 %/an) |

**Avantages** :
- Banque en ligne complete (compte courant, epargne, credit + PEA)
- PEA Jeune et PEA-PME disponibles
- Gestion profilee PEA accessible des 100 EUR
- Tres large base de clients, fiabilite eprouvee

**Inconvenients** :
- Frais de courtage au plafond legal (0.50 %) — le plus cher des courtiers en ligne
- Ordre minimum de 100 EUR
- Pas d'outils d'analyse avances
- Pas adapte aux petits investisseurs ni aux ordres frequents

**Profil ideal** : Client BoursoBank existant ne souhaitant pas ouvrir un compte ailleurs,
ou investisseur recherchant une gestion profilee PEA simple.

**Sources** :
- https://www.boursobank.com/bourse/pea-plan-epargne-actions
- https://finance-heros.fr/avis-courtier/avis-boursorama-pea-compte-titre/

---

### 3.6 Bourse Direct — Le courtier historique francais

**Type** : Courtier en ligne | **Pays** : France | **Regulateur** : AMF / ACPR

| Critere | Detail |
|---------|--------|
| Frais de courtage | 0.99 EUR < 500 EUR, 1.90 EUR < 1 000 EUR, 3.80 EUR < 2 000 EUR |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~15 000 |
| Nombre d'ETF | ~1 500 |
| Plans programmes | Non |
| Fractions d'actions | Non |
| PEA Jeune / PEA-PME | Oui / Oui |
| Transfert entrant | Oui |

**Avantages** :
- Frais parmi les plus bas des courtiers historiques francais
- Offre iShares : ordres ETF plafonnes a 0.99 EUR (jusqu'en sept. 2026)
- Offre Amundi : 1er ordre ETF rembourse chaque mois
- PEA Jeune et PEA-PME disponibles
- Courtier francais fiable, 25+ ans d'anciennete

**Inconvenients** :
- Interface vieillissante
- Application mobile basique
- Hors Euronext : minimum 15 EUR par ordre

**Offres en cours** :
- ETF iShares : frais plafonnes a 0.99 EUR (jusqu'au 15/09/2026)
- Amundi : 1er ordre ETF rembourse/mois (jusqu'au 30/04/2026)
- Jusqu'a 300 EUR de frais offerts a l'ouverture (code « 30ans »)

**Profil ideal** : Investisseur valorisant un courtier francais de confiance avec de
bons partenariats ETF, acceptant une interface moins moderne.

**Sources** :
- https://www.boursedirect.fr/fr/bourse/tarifs
- https://avenuedesinvestisseurs.fr/avis-pea-bourse-direct/

---

### 3.7 Saxo Banque — Le courtier danois avec plateforme pro

**Type** : Courtier en ligne | **Pays** : Danemark | **Regulateur** : DFSA / AMF

| Critere | Detail |
|---------|--------|
| Frais de courtage | 0.08 % par ordre, minimum 2 EUR |
| Frais de garde | Gratuit |
| Frais d'inactivite | Gratuit |
| Nombre d'actions | ~10 000 |
| Nombre d'ETF | ~3 000 |
| Plans programmes | Non |
| Fractions d'actions | Non |
| PEA Jeune / PEA-PME | Non / Oui |
| Transfert entrant | Oui (frais rembourses jusqu'a 150 EUR) |

**Avantages** :
- Frais competitifs (0.08 %, min 2 EUR)
- Offre 2026 : 0 frais sur 70 actions selectionnees (CAC 40 + 30 EU)
- Plateforme SaxoTraderPRO tres complete (analyse, graphiques)
- Large choix d'ETF (3 000+)
- Transfert entrant rembourse

**Inconvenients** :
- Minimum 2 EUR par ordre (peu adapte aux tres petits ordres)
- Pas de PEA Jeune
- Interface complexe pour debutants
- Frais de change sur devises non-EUR

**Offre en cours** : 0 frais sur 70 actions selectionnees (CAC 40 + 30 EU) jusqu'au 31/12/2026

**Profil ideal** : Investisseur intermediaire a avance cherchant une plateforme
professionnelle avec un bon choix d'ETF.

**Sources** :
- https://www.home.saxo/fr-fr/accounts/pea
- https://www.home.saxo/fr-fr/content/commentaries/pr/press-release/saxo-banque-devoile-son-pea-sans-frais-26022026

---

### 3.8 Yomoni — La gestion pilotee 100 % ETF

**Type** : Gestion pilotee | **Pays** : France | **Regulateur** : AMF

| Critere | Detail |
|---------|--------|
| Frais de gestion | 1.60 %/an tout compris (gestion + frais ETF) |
| Frais d'ouverture | Gratuit |
| Frais de transfert | Gratuit |
| Minimum ouverture | 1 000 EUR |
| Gestion libre | Non |
| Performance moy. | +8 %/an depuis 2016 |

**Avantages** :
- Gestion 100 % pilotee — aucune decision a prendre
- Portefeuille ETF diversifie optimise par des experts
- Frais tout compris sans surprise
- Performance historique solide (+8 %/an, +110 % cumule depuis 2016)
- Transfert entrant gratuit

**Inconvenients** :
- Pas de gestion libre (impossible de choisir ses titres)
- Frais 1.60 %/an (vs 0 % chez XTB en gestion libre)
- Minimum 1 000 EUR pour ouvrir
- Pas de PEA Jeune ni PEA-PME

**Profil ideal** : Investisseur debutant ou qui ne veut pas gerer son portefeuille,
pret a payer 1.60 %/an pour la tranquillite d'esprit.

**Sources** :
- https://www.yomoni.fr/investir/plan-epargne-actions-pea
- https://avenuedesinvestisseurs.fr/yomoni-avis-gestion-pilotee/

---

### 3.9 Ramify — La gestion conseillee haut de gamme

**Type** : Gestion conseillee | **Pays** : France | **Regulateur** : AMF

| Critere | Detail |
|---------|--------|
| Frais de gestion | 1.20 % a 1.60 %/an (degressif selon encours) |
| Frais d'ouverture | Gratuit |
| Frais de transfert | Gratuit |
| Minimum ouverture | 50 000 EUR |
| Minimum transfert | 5 000 EUR |
| Gestion libre | Non |

**Avantages** :
- Gestion conseillee par des experts, portefeuille ETF
- Frais degressifs a partir de 1.20 %/an
- Transfert accepte des 5 000 EUR (ouverture des 50 000 EUR)
- Aucun frais cache (entree, sortie, arbitrage)

**Inconvenients** :
- Ticket d'entree eleve : 50 000 EUR pour ouvrir
- Pas de gestion libre
- Pas de PEA Jeune ni PEA-PME
- Offre recente, peu de recul historique

**Profil ideal** : Investisseur avec un capital consequent (50k+) cherchant une
gestion conseillee a frais optimises.

**Sources** :
- https://www.ramify.fr/produits/pea
- https://avenuedesinvestisseurs.fr/avis-ramify-gestion-pilotee/

---

### 3.10 EasyBourse — Le courtier de La Banque Postale

**Type** : Courtier en ligne | **Pays** : France | **Regulateur** : AMF / ACPR

| Critere | Detail |
|---------|--------|
| Frais de courtage | 2 EUR a 9.50 EUR selon formule |
| Frais de garde | Jusqu'a 0.40 %/an |
| Frais d'inactivite | 3 EUR/mois (gratuit des 1 ordre/mois) |
| Nombre d'actions | ~10 000 |
| Nombre d'ETF | ~800 |
| PEA Jeune / PEA-PME | Oui / Oui |
| Transfert entrant | Oui |

**Avantages** :
- Filiale de La Banque Postale — solidite institutionnelle
- PEA Jeune et PEA-PME disponibles
- Offres promotionnelles regulieres

**Inconvenients** :
- Frais d'inactivite de 3 EUR/mois si aucun ordre
- Droits de garde pouvant atteindre 0.40 %/an
- Service client note 2.1/5 sur Trustpilot
- Interface datee
- Globalement moins competitif que les neo-courtiers

**Profil ideal** : Client La Banque Postale souhaitant rester dans le meme ecosysteme.

**Sources** :
- https://www.francetransactions.com/bourse/pea/pea-easybourse.html

---

## 4. Tableau comparatif synthetique

### Frais de courtage (ordre Euronext)

| Courtier | 100 EUR | 500 EUR | 1 000 EUR | 5 000 EUR | 10 000 EUR |
|----------|---------|---------|-----------|-----------|------------|
| XTB | 0 EUR | 0 EUR | 0 EUR | 0 EUR | 0 EUR |
| Trade Republic (DCA) | 0 EUR | 0 EUR | 0 EUR | 0 EUR | 0 EUR |
| Trade Republic (manuel) | 1 EUR | 1 EUR | 1 EUR | 1 EUR | 1 EUR |
| Bourse Direct | 0.99 EUR | 0.99 EUR | 1.90 EUR | 3.80 EUR | 9 EUR |
| Saxo Banque | 2 EUR | 2 EUR | 2 EUR | 4 EUR | 8 EUR |
| Interactive Brokers | 1.25 EUR | 1.25 EUR | 1.25 EUR | 2.50 EUR | 5 EUR |
| Fortuneo (Starter) | 0 EUR* | 1.75 EUR | 3.50 EUR | 17.50 EUR | 35 EUR |
| Fortuneo (Optimum) | 1.95 EUR | 0 EUR* | 0 EUR* | 0 EUR* | 0 EUR* |
| BoursoBank | 0.50 EUR | 2.50 EUR | 5 EUR | 25 EUR | 50 EUR |
| EasyBourse (Decouverte) | 2 EUR | 2 EUR | 3.80 EUR | 5.50 EUR | 5.50 EUR |

*Note : XTB gratuit jusqu'a 100 000 EUR/mois de volume cumule.*
*Note : Trade Republic DCA = plans programmes gratuits, manuel = 1 EUR fixe.*
*Note : Fortuneo * = 1er ordre du mois gratuit. Starter : gratuit < 500 EUR, 0.35 % au-dela. Optimum : gratuit >= 500 EUR, 1.95 EUR sinon.*
*Note : Yomoni et Ramify (gestion pilotee) n'ont pas de frais par ordre — voir section frais de gestion.*

### Frais de gestion annuels (gestion pilotee)

| Courtier | Frais/an | Minimum ouverture | Gestion libre |
|----------|----------|-------------------|---------------|
| Yomoni | 1.60 % tout compris | 1 000 EUR | Non |
| Ramify | 1.20 % a 1.60 % | 50 000 EUR | Non |
| BoursoBank (profilee) | 1.60 % | 100 EUR | Oui (au choix) |

### Frais annexes

| Courtier | Garde | Inactivite | Transfert sortant | Frais de change |
|----------|-------|------------|-------------------|-----------------|
| XTB | Gratuit | Gratuit | 15 EUR/ligne (max 150 EUR) | 0.50 % |
| Trade Republic | Gratuit | Gratuit | 25 EUR/ligne | — |
| Interactive Brokers | Gratuit | Gratuit | Gratuit | — |
| Fortuneo | Gratuit | Gratuit | 15 EUR/ligne (max 150 EUR) | — |
| BoursoBank | Gratuit | Gratuit | 15 EUR/ligne (max 150 EUR) | — |
| Bourse Direct | Gratuit | Gratuit | 15 EUR/ligne (max 150 EUR) | — |
| Saxo Banque | Gratuit | Gratuit | Rembourse (offre en cours) | 0.25 % |
| EasyBourse | Jusqu'a 0.40 %/an | 3 EUR/mois sans ordre | 15 EUR/ligne | — |
| Yomoni | Gratuit | Gratuit | Gratuit | — |
| Ramify | Gratuit | Gratuit | Gratuit | — |

### Fonctionnalites

| Courtier | ETF | Plans prog. | Fractions | PEA Jeune | PEA-PME | Transfer In | Outils | Partenariats ETF |
|----------|-----|-------------|-----------|-----------|---------|-------------|--------|------------------|
| XTB | 280 | Non | Non | Non | Non | Non | Oui | — |
| Trade Republic | 2 000 | Oui (0 EUR) | Non* | Non | Non | Oui | Non | — |
| Interactive Brokers | 5 000 | Non | Non | Non | Non | Oui | Oui++ | — |
| Fortuneo | 1 000 | Non | Non | Oui | Oui | Oui | Oui | Amundi (1er/mois) |
| BoursoBank | 800 | Non | Non | Oui | Oui | Oui | Non | BoursoMarkets |
| Bourse Direct | 1 500 | Non | Non | Oui | Oui | Oui | Oui | iShares + Amundi |
| Saxo Banque | 3 000 | Non | Non | Non | Oui | Oui | Oui++ | 70 actions 0 frais |
| EasyBourse | 800 | Non | Non | Oui | Oui | Oui | Non | — |
| Yomoni | — | Oui (auto) | Non | Non | Non | Oui | Non | — |
| Ramify | — | Oui (auto) | Non | Non | Non | Oui | Non | — |

*Trade Republic : fractions d'actions prevues courant 2026 sur PEA.*

---

## 5. Recommandations par profil

### Debutant total — ne veut pas gerer
**Yomoni** (gestion pilotee, 1.60 %/an, minimum 1 000 EUR)
→ Aucune decision a prendre, portefeuille optimise automatiquement.

### Investisseur passif en DCA mensuel
**Trade Republic** (plans programmes gratuits)
→ Programmer un achat ETF mensuel a 0 EUR de frais.
→ Alternative : XTB si le DCA n'est pas automatise (0 % par ordre).

### Investisseur actif — ordres reguliers
**XTB** (0 % jusqu'a 100k EUR/mois)
→ Imbattable en frais pour tout volume sous 100 000 EUR/mois.

### Gros ordres (> 10 000 EUR)
**XTB** (0 %) > **Interactive Brokers** (5 EUR pour 10k) > **Saxo** (8 EUR)
→ XTB reste le moins cher. IBKR domine pour les ordres hors Euronext.

### Multi-bourses europeennes
**Interactive Brokers** (0.05 % sur toutes les bourses EU)
→ Le seul courtier avec un acces uniforme a toutes les bourses europeennes.

### Besoin d'un PEA Jeune (18-25 ans)
**Fortuneo** ou **Bourse Direct** (les seuls a le proposer parmi les courtiers en ligne).
→ BoursoBank aussi, mais frais de courtage plus eleves.

### Centraliser banque + PEA
**Fortuneo** (banque en ligne complete + frais corrects)
→ BoursoBank si deja client, mais frais de courtage au plafond legal.

---

## 6. Methode de mise a jour dynamique

### Architecture

Les donnees sont structurees dans `src/data/pea-brokers.ts` avec un schema type strict
(`PeaBroker`). Chaque courtier porte :

1. **`lastChecked`** (string ISO 8601) — date de derniere verification humaine
2. **`sources[]`** — URLs des pages tarifaires officielles
3. **`promotions[].validUntil`** — date d'expiration des offres (null = permanente)
4. **`tariffUrl`** (optionnel) — URL de la page tarifaire si differente de `peaUrl`
5. **`fees.currencyFee`** — frais de change sur devises non-EUR (null si non applicable)
6. **`features.etfPartnerships`** — partenariats ETF (iShares, Amundi, BoursoMarkets...)

### Scraping automatise (v2)

Le fichier `src/lib/broker-scraper.ts` implemente un scraper ameliore :

**URLs multiples** : Scrape a la fois `peaUrl` et `tariffUrl` (quand disponible)
pour maximiser la couverture des informations tarifaires.

**Patterns generiques** (appliques a tous les courtiers) :
- `FEE_PATTERNS` — frais de courtage, commissions, ordres
- `PROMO_PATTERNS` — offres promotionnelles, codes promo
- `CUSTODY_PATTERNS` — frais de garde, tenue de compte
- `INACTIVITY_PATTERNS` — frais d'inactivite
- `TRANSFER_PATTERNS` — frais de transfert
- `COUNT_PATTERNS` — nombre d'ETF et d'actions

**Patterns specifiques par courtier** (`BROKER_SPECIFIC_PATTERNS`) :
- XTB : `0%`, `100 000 EUR`, `0.20%`
- Trade Republic : `1 EUR fixe`, `plan programme`, `DCA gratuit`
- IBKR : `0.05%`, `1.25 EUR`, `max 29`
- Fortuneo : `Starter`, `Optimum`, `0.35%`, `1.95 EUR`, `Amundi rembourse`
- BoursoBank : `0.50%`, `plafond legal`, `BoursoMarkets`, `100 EUR minimum`
- Bourse Direct : `0.99 EUR`, `iShares`, `Amundi rembourse`
- Saxo : `0.08%`, `minimum 2 EUR`, `70 actions`
- EasyBourse : `3 EUR/mois`, `0.40%`, `Decouverte`, `Premium`
- Yomoni : `1.60%`, `gestion pilotee`, `tout compris`
- Ramify : `1.20%`, `50 000 EUR`, `gestion conseillee`

**Nettoyage HTML** : Les pages sont converties en texte brut (strip des tags,
scripts, styles, entites HTML) avant extraction pour des resultats plus fiables.

**Drift detection** : Comparaison automatique des donnees scrapees vs stockees :
- Verification de la fraicheur (`lastChecked` > 30j = warning, > 90j = critical)
- Detection des promotions expirees
- Verification que les frais stockes apparaissent dans le texte scrape
- Alerte si le nombre d'ETFs a varie de plus de 20%
- Detection de frais de garde/inactivite non prevus

### Endpoint de verification

`GET /api/brokers/check` scrape les 10 courtiers (jusqu'a 2 URLs chacun) et retourne :

```json
{
  "checkedAt": "2026-03-02T10:00:00Z",
  "brokerCount": 10,
  "health": {
    "totalDrifts": 2,
    "criticalDrifts": 0,
    "warningDrifts": 1,
    "status": "warning"
  },
  "results": [
    {
      "brokerId": "xtb",
      "brokerName": "XTB",
      "urls": [
        "https://www.xtb.com/fr/pea",
        "https://www.xtb.com/fr/pea#tarification"
      ],
      "lastStored": "2026-03-02",
      "findings": {
        "fees": ["0% de commission", "0,20%"],
        "promotions": [],
        "etfCount": "280",
        "actionCount": "1 600",
        "custody": null,
        "inactivity": null,
        "transferFee": null
      },
      "drift": [],
      "warnings": [],
      "error": null
    }
  ],
  "errors": []
}
```

### Processus de mise a jour recommande

1. **Mensuel** : Appeler `GET /api/brokers/check` pour detecter les changements
2. **Verifier le status** : `health.status` indique `ok`, `warning` ou `critical`
3. **A chaque drift** : Verifier manuellement les pages sources concernees
4. **Mettre a jour** `pea-brokers.ts` avec les nouvelles valeurs + `lastChecked`
5. **Expiration automatique** : Les promotions avec `validUntil` passe sont ignorees en UI
6. **Alerte stale data** : Si `lastChecked` > 90 jours, le scraper emet un drift `critical`

### Limites du scraping

- Les pages tarifaires changent de structure regulierement → regex a maintenir
- Certains courtiers utilisent des PDF pour les tarifs (non scrape actuellement)
- Les offres temporaires ne sont pas toujours sur la page PEA principale
- Le scraping ne remplace pas une verification humaine — il detecte les changements
- Les pages SPA (JavaScript client-side) peuvent ne pas rendre le contenu tarifaire

---

## 7. Points d'attention pour les investisseurs PEA

### Pieges courants

1. **Frais caches — frais de change** : Certains courtiers facturent des frais de change
   sur les titres cotes hors EUR : XTB (0.50 %), Saxo Banque (0.25 %). Un ETF cote en EUR
   sur Euronext n'est pas concerne — seules les actions etrangeres non cotees en EUR le sont.

2. **Ordre minimum** : BoursoBank impose 100 EUR minimum par ordre, incompatible avec
   le DCA a petit budget. XTB a un minimum de 10 EUR, Trade Republic de 1 EUR.

3. **Frais d'inactivite** : EasyBourse facture 3 EUR/mois sans ordre (annulable des
   1 ordre/mois). Attention aux PEA ouverts puis oublies. Tous les autres courtiers
   de cette etude n'ont aucun frais d'inactivite.

4. **Frais de garde** : EasyBourse est le seul courtier de cette etude a facturer des
   droits de garde (jusqu'a 0.40 %/an de la valeur des titres). Tous les autres sont gratuits.

5. **Transfert entrant impossible** : XTB ne permet pas encore le transfert entrant PEA
   (prevu courant 2026). Ouvrir chez eux implique un nouveau PEA vierge. Trade Republic
   accepte desormais les transferts entrants.

6. **Gestion pilotee vs libre** : Les frais de gestion de 1.60 %/an (Yomoni) representent
   16 000 EUR de frais sur 10 ans pour un portefeuille de 100 000 EUR. En gestion libre
   chez XTB, le cout est 0 EUR. L'ecart represente ~47 000 EUR sur 20 ans (voir tableau).

7. **BoursoBank au plafond legal** : A 0.50 % par ordre, BoursoBank est au plafond legal
   des frais PEA. Pour un DCA de 500 EUR/mois, cela represente 30 EUR/an de frais — vs 0 EUR
   chez XTB ou Trade Republic (DCA).

### Impact des frais sur 20 ans

Pour un investissement mensuel de 500 EUR pendant 20 ans (rendement 8 %/an) :

| Courtier | Frais/ordre | Frais cumules estimes | Capital final estime | Ecart vs XTB |
|----------|-------------|----------------------|---------------------|--------------|
| XTB (0 %) | 0 EUR | ~0 EUR | ~294 000 EUR | — |
| Trade Republic (DCA) | 0 EUR | ~0 EUR | ~294 000 EUR | 0 EUR |
| Trade Republic (manuel) | 1 EUR | ~240 EUR | ~293 760 EUR | -240 EUR |
| Fortuneo (1er gratuit) | 0 EUR | ~0 EUR (1 ordre/mois) | ~294 000 EUR | 0 EUR |
| Bourse Direct | 0.99 EUR | ~238 EUR | ~293 762 EUR | -238 EUR |
| Saxo Banque | 2 EUR | ~480 EUR | ~293 520 EUR | -480 EUR |
| Interactive Brokers | 1.25 EUR | ~300 EUR | ~293 700 EUR | -300 EUR |
| EasyBourse | ~2 EUR | ~480 EUR + garde | ~293 000 EUR | -1 000 EUR |
| BoursoBank (0.50 %) | 2.50 EUR* | ~15 000 EUR | ~279 000 EUR | -15 000 EUR |
| Yomoni (1.60 %/an) | — | ~47 000 EUR** | ~247 000 EUR | -47 000 EUR |
| Ramify (1.20 %/an) | — | ~35 000 EUR** | ~259 000 EUR | -35 000 EUR |

*BoursoBank : 0.50% de 500 EUR = 2.50 EUR/ordre, cumulant 600 EUR/an de frais.*
**Yomoni/Ramify : les frais de gestion reduisent le rendement net annuel, l'impact compose est significatif sur 20 ans.*

---

## 8. Conclusion

Le marche du PEA en France est en pleine effervescence en 2026 avec l'arrivee de XTB
et Trade Republic qui ont bouleverse la tarification. Pour la majorite des investisseurs
en ETF via PEA :

- **DCA automatise** → Trade Republic (plans programmes a 0 EUR)
- **Meilleurs frais ponctuels** → XTB (0 % jusqu'a 100k/mois)
- **Multi-bourses** → Interactive Brokers (0.05 % partout en Europe)
- **Simplicite totale** → Yomoni (gestion pilotee)

Les banques en ligne (Fortuneo, BoursoBank) restent pertinentes pour ceux qui veulent
centraliser tous leurs comptes, mais leurs frais de courtage sont significativement
plus eleves que les neo-courtiers.

---

## 9. Donnees techniques

### Fichiers du projet

| Fichier | Role |
|---------|------|
| `src/data/pea-brokers.ts` | Source unique des donnees courtiers (type PeaBroker[]) |
| `src/lib/brokers.ts` | Adapteur : calcul de frais, filtres, helpers |
| `src/lib/broker-scraper.ts` | Scraper v2 : multi-URL, patterns specifiques, drift detection |
| `src/lib/purchase-planner.ts` | Algorithme de plan d'achat mensuel |
| `src/types/broker.ts` | Types TypeScript (BrokerId, MonthlyPlan, PurchasePlanResult) |
| `src/hooks/use-broker.ts` | Persistance du courtier selectionne (localStorage) |
| `src/components/portfolio/broker-selector.tsx` | Dropdown de selection courtier |
| `src/components/portfolio/purchase-plan-card.tsx` | Carte du plan d'achat mensuel |
| `src/components/compare/broker-comparison-table.tsx` | Tableau comparatif interactif |
| `src/app/api/brokers/route.ts` | API GET /api/brokers |
| `src/app/api/brokers/check/route.ts` | API GET /api/brokers/check (scraping + drift) |

### Champs PeaBroker

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (slug) |
| `name` | string | Nom commercial |
| `type` | BrokerType | courtier, banque_en_ligne, neocourtier, gestion_pilotee |
| `peaUrl` | string | URL page PEA |
| `tariffUrl` | string? | URL page tarifaire (si differente de peaUrl) |
| `fees.orderEuronext` | FeeRange | Frais de courtage Euronext |
| `fees.custody` | FeeRange | Frais de garde annuels |
| `fees.inactivity` | FeeRange | Frais d'inactivite |
| `fees.transferOut` | FeeRange | Frais de transfert sortant |
| `fees.currencyFee` | FeeRange? | Frais de change non-EUR |
| `fees.managementFee` | FeeRange? | Frais de gestion (pilotee) |
| `features.etfCount` | number? | Nombre d'ETF eligibles |
| `features.freeSavingsPlan` | boolean | Plans programmes gratuits |
| `features.peaJeune` | boolean | PEA Jeune disponible |
| `features.peaPme` | boolean | PEA-PME disponible |
| `features.transferIn` | boolean | Transfert entrant possible |
| `features.etfPartnerships` | string? | Partenariats ETF (iShares, Amundi...) |
| `promotions` | PromotionalOffer[] | Offres en cours |
| `lastChecked` | string | Date ISO de derniere verification |
| `sources` | string[] | URLs de reference |
