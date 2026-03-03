/**
 * Données comparatives des courtiers PEA en France.
 *
 * Ce fichier centralise les informations sur chaque courtier :
 * frais, fonctionnalités, avantages, inconvénients et sources.
 *
 * Chaque champ porte une date de dernière vérification (`lastChecked`)
 * pour faciliter la maintenance et la mise à jour dynamique.
 *
 * Sources : pages tarifaires officielles, comparatifs finance-heros.fr,
 * avenuedesinvestisseurs.fr, sinvestir.fr, cafedelabourse.com.
 */

import type { Envelope } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BrokerType = "courtier" | "banque_en_ligne" | "neocourtier" | "gestion_pilotee";

// ── Modèle de calcul de frais (data-driven) ──────────────────────────────

export type FeeModel =
  /** 0 € (ex: XTB, gestion pilotée) */
  | { type: "free" }
  /** Montant fixe par ordre (ex: Trade Republic 1 €) */
  | { type: "fixed"; amount: number }
  /** Pourcentage avec min/max optionnels (ex: Saxo 0.08 %, min 2 €) */
  | { type: "percentage"; rate: number; min?: number; max?: number }
  /** Paliers : si montant ≤ upTo → fee fixe ; au-delà du dernier palier → aboveRate % */
  | { type: "tiered"; tiers: Array<{ upTo: number; fee: number }>; aboveRate?: number }
  /** Premier ordre du mois gratuit, puis afterFirst s'applique (ex: Fortuneo) */
  | { type: "first_free_monthly"; afterFirst: FeeModel };

export interface FeeRange {
  /** Frais minimum en € ou % */
  min: number;
  /** Frais maximum en € ou % (peut être identique à min si fixe) */
  max: number;
  /** Unité : "EUR" pour montant fixe, "%" pour pourcentage */
  unit: "EUR" | "%";
  /** Détail textuel pour les cas complexes */
  detail: string;
}

export interface ManagedProfile {
  /** Nom du profil (ex: "Prudent", "Équilibré", "Dynamique", "Offensif") */
  name: string;
  /** Niveau de risque SRRI (1-7) */
  risk: number;
  /** Horizon d'investissement minimum recommandé (années) */
  minHorizon: number;
  /** Performance nette 2024 en décimal (0.05 = +5 %), null si non disponible */
  perf2024: number | null;
  /** Performance nette 2025 en décimal, null si non disponible */
  perf2025: number | null;
}

export interface ManagedOption {
  /** Société de gestion (ex: "Amundi", "Arkea AM", "LBP AM") */
  gestionnaire: string;
  /** Type de frais : fixe, performance, ou hybride */
  feeType: "fixed" | "performance" | "hybrid";
  /** Frais fixes annuels (en %) — null si uniquement à la performance */
  annualFee: FeeRange | null;
  /** Frais de surperformance en décimal (0.15 = 15 %) — null si aucun */
  performanceFee: number | null;
  /** Profils d'investissement disponibles */
  profiles: ManagedProfile[];
  /** Investissement minimum en € */
  minInvestment: number;
  /** Peut-on mixer gestion libre + profilée dans le même PEA ? */
  canMixWithLibre: boolean;
  /** Description courte de l'offre */
  detail: string;
}

export interface PromotionalOffer {
  description: string;
  validUntil: string | null;
  conditions: string;
}

export interface PeaBroker {
  /** Identifiant unique du courtier (slug) */
  id: string;
  /** Nom commercial */
  name: string;
  /** Type de service */
  type: BrokerType;
  /** URL du site officiel */
  website: string;
  /** URL de la page PEA spécifique */
  peaUrl: string;
  /** URL de la page tarifaire (si différente de peaUrl) */
  tariffUrl?: string;
  /** Pays du siège */
  country: string;
  /** Régulateur (AMF, BaFin, etc.) */
  regulator: string;
  /** Logo URL ou nom de fichier (pour l'UI) */
  logo?: string;

  // ── Modèle de calcul (data-driven) ────────────────────────────────────
  /** Modèle de calcul des frais de courtage Euronext pour estimateTradeFee(). */
  feeModel: FeeModel;
  /** Label court des frais pour le sélecteur de courtier (ex: "0,99 € (< 500 €)"). */
  feeShortLabel: string;
  /** Montant minimum effectif pour un ordre (en €), tenant compte du DCA. */
  effectiveMinOrder: number;

  // ── Frais ──────────────────────────────────────────────────────────────
  fees: {
    /** Frais d'ouverture */
    opening: FeeRange;
    /** Frais de tenue de compte / garde annuels */
    custody: FeeRange;
    /** Frais de courtage par ordre (Euronext) */
    orderEuronext: FeeRange;
    /** Frais de courtage hors Euronext (bourses EU) */
    orderOtherEU: FeeRange | null;
    /** Frais d'inactivité */
    inactivity: FeeRange;
    /** Frais de transfert sortant (par ligne) */
    transferOut: FeeRange;
    /** Frais de gestion annuels (gestion pilotée uniquement) */
    managementFee: FeeRange | null;
    /** Frais de change sur devises non-EUR */
    currencyFee: FeeRange | null;
  };

  // ── Fonctionnalités ────────────────────────────────────────────────────
  features: {
    /** Nombre d'actions éligibles PEA */
    stockCount: number | null;
    /** Nombre d'ETF éligibles PEA */
    etfCount: number | null;
    /** Plans d'investissement programmés gratuits */
    freeSavingsPlan: boolean;
    /** Fractions d'actions disponibles */
    fractionalShares: boolean;
    /** Rémunération des espèces (taux brut annuel) */
    cashInterestRate: number | null;
    /** PEA Jeune (18-25 ans) disponible */
    peaJeune: boolean;
    /** PEA-PME disponible */
    peaPme: boolean;
    /** Transfert entrant PEA possible */
    transferIn: boolean;
    /** Ordre minimum en € */
    minOrderAmount: number | null;
    /** Application mobile */
    mobileApp: boolean;
    /** Interface web */
    webPlatform: boolean;
    /** Outils d'analyse/graphiques avancés */
    advancedTools: boolean;
    /** Partenariats ETF (liste gratuite ou remboursée) */
    etfPartnerships: string | null;
  };

  // ── Avantages / Inconvénients ──────────────────────────────────────────
  pros: string[];
  cons: string[];

  // ── Offres promotionnelles en cours ────────────────────────────────────
  promotions: PromotionalOffer[];

  // ── Métadonnées de mise à jour ─────────────────────────────────────────
  /** Date de dernière vérification complète (ISO 8601) */
  lastChecked: string;
  /** Sources utilisées pour la vérification */
  sources: string[];

  /** Enveloppes disponibles chez ce courtier */
  envelopes: Envelope[];

  /** Gestion profilée optionnelle (null si non proposée) */
  managedOption: ManagedOption | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Données
// ─────────────────────────────────────────────────────────────────────────────

const FREE: FeeRange = { min: 0, max: 0, unit: "EUR", detail: "Gratuit" };

export const PEA_BROKERS: PeaBroker[] = [
  // ── Trade Republic ──────────────────────────────────────────────────────
  {
    id: "trade-republic",
    name: "Trade Republic",
    type: "neocourtier",
    feeModel: { type: "fixed", amount: 1 },
    feeShortLabel: "DCA gratuit",
    effectiveMinOrder: 1,
    website: "https://traderepublic.com/fr-fr",
    peaUrl: "https://traderepublic.com/fr-fr/pea",
    tariffUrl: "https://traderepublic.com/fr-fr/tarification",
    country: "Allemagne",
    regulator: "BaFin / AMF",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 1, max: 1, unit: "EUR", detail: "1 € fixe par ordre, 0 € via plan programmé" },
      orderOtherEU: { min: 1, max: 1, unit: "EUR", detail: "1 € fixe" },
      inactivity: FREE,
      transferOut: { min: 25, max: 25, unit: "EUR", detail: "25 € par ligne" },
      managementFee: null,
      currencyFee: null,
    },
    features: {
      stockCount: 11400,
      etfCount: 2000,
      freeSavingsPlan: true,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: false,
      transferIn: true,
      minOrderAmount: 1,
      mobileApp: true,
      webPlatform: true,
      advancedTools: false,
      etfPartnerships: null,
    },
    pros: [
      "1 € par ordre fixe, plans programmés gratuits",
      "Interface mobile épurée et intuitive",
      "Très large choix de titres (11 400+)",
      "Pas de frais de garde ni d'inactivité",
      "Plans d'investissement automatiques sans frais",
    ],
    cons: [
      "Pas encore de fractions d'actions sur PEA (prévu courant 2026)",
      "Outils d'analyse limités",
      "Pas de PEA-PME ni PEA Jeune",
      "Espèces PEA non rémunérées",
      "Service client parfois lent",
    ],
    promotions: [],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://traderepublic.com/fr-fr/pea",
      "https://traderepublic.com/fr-fr/tarification",
      "https://avenuedesinvestisseurs.fr/avis-pea-trade-republic/",
      "https://finance-heros.fr/avis-courtier/avis-trade-republic/",
    ],
    managedOption: null,
  },

  // ── XTB ─────────────────────────────────────────────────────────────────
  {
    id: "xtb",
    name: "XTB",
    feeModel: { type: "free" },
    feeShortLabel: "0 € (< 100k€/mois)",
    effectiveMinOrder: 10,
    type: "courtier",
    website: "https://www.xtb.com/fr",
    peaUrl: "https://www.xtb.com/fr/pea",
    tariffUrl: "https://www.xtb.com/fr/pea#tarification",
    country: "Pologne",
    regulator: "KNF / AMF",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 0, max: 0, unit: "EUR", detail: "0 % jusqu'à 100 000 €/mois, puis 0.20 %" },
      orderOtherEU: { min: 0, max: 0, unit: "EUR", detail: "0 % jusqu'à 100 000 €/mois, puis 0.20 %" },
      inactivity: FREE,
      transferOut: { min: 15, max: 15, unit: "EUR", detail: "15 € par ligne, plafonné à 150 €" },
      managementFee: null,
      currencyFee: { min: 0.50, max: 0.50, unit: "%", detail: "0.50 % sur devises non-EUR" },
    },
    features: {
      stockCount: 1600,
      etfCount: 280,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: false,
      transferIn: false,
      minOrderAmount: 10,
      mobileApp: true,
      webPlatform: true,
      advancedTools: true,
      etfPartnerships: null,
    },
    pros: [
      "0 % de commission jusqu'à 100 000 €/mois — le moins cher du marché",
      "Aucun frais de garde, ouverture, clôture ni inactivité",
      "Plateforme xStation avec outils d'analyse avancés",
      "Dépôt minimum très faible (10 €)",
      "Régulé AMF",
    ],
    cons: [
      "Transfert entrant PEA pas encore disponible (prévu 2026)",
      "Offre ETF plus limitée que la concurrence (280 ETF)",
      "Pas de fractions d'actions",
      "Pas de plans d'investissement programmés",
      "PEA lancé récemment, peu de recul",
      "Frais de change de 0.50 % sur devises non-EUR",
    ],
    promotions: [],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.xtb.com/fr/pea",
      "https://avenuedesinvestisseurs.fr/avis-pea-xtb/",
      "https://pea.fr/courtiers/pea-xtb-avis-2026/",
    ],
    managedOption: null,
  },

  // ── Interactive Brokers ─────────────────────────────────────────────────
  {
    id: "interactive-brokers",
    name: "Interactive Brokers",
    feeModel: { type: "percentage", rate: 0.0005, min: 1.25, max: 29 },
    feeShortLabel: "0,05 % (min 1,25 €)",
    effectiveMinOrder: 50,
    type: "courtier",
    website: "https://www.interactivebrokers.ie/fr",
    peaUrl: "https://www.interactivebrokers.ie/fr/accounts/plan-depargne-en-action-accounts.php",
    tariffUrl: "https://www.interactivebrokers.ie/fr/trading/commissions-invest-background.php",
    country: "États-Unis / Irlande",
    regulator: "CBI / SEC / AMF",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 1.25, max: 29, unit: "EUR", detail: "0.05 % par ordre, min 1.25 €, max 29 €" },
      orderOtherEU: { min: 1.25, max: 29, unit: "EUR", detail: "0.05 % identique sur toutes les bourses EU" },
      inactivity: FREE,
      transferOut: FREE,
      managementFee: null,
      currencyFee: null,
    },
    features: {
      stockCount: 30000,
      etfCount: 5000,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: false,
      transferIn: true,
      minOrderAmount: null,
      mobileApp: true,
      webPlatform: true,
      advancedTools: true,
      etfPartnerships: null,
    },
    pros: [
      "Accès à TOUTES les bourses européennes au même tarif (0.05 %)",
      "Le moins cher pour les gros ordres (plafonné à 29 €)",
      "Univers d'investissement le plus large (30 000+ titres)",
      "Outils professionnels (TWS, analyse, screeners)",
      "Transfert entrant et sortant gratuit",
    ],
    cons: [
      "Minimum 1.25-3 € par ordre — pas le moins cher pour petits ordres",
      "Interface complexe, courbe d'apprentissage",
      "Pas de PEA Jeune ni PEA-PME",
      "Pas de plans d'investissement programmés",
      "Support client en anglais principalement",
    ],
    promotions: [],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.interactivebrokers.ie/fr/accounts/plan-depargne-en-action-accounts.php",
      "https://pea.fr/courtiers/pea-interactive-brokers-avis-2026/",
      "https://finance-heros.fr/meilleur-pea/",
    ],
    managedOption: null,
  },

  // ── Fortuneo ────────────────────────────────────────────────────────────
  {
    id: "fortuneo",
    name: "Fortuneo",
    feeModel: { type: "first_free_monthly", afterFirst: { type: "tiered", tiers: [{ upTo: 500, fee: 1.95 }], aboveRate: 0.0035 } },
    feeShortLabel: "1er ordre gratuit/mois",
    effectiveMinOrder: 50,
    type: "banque_en_ligne",
    website: "https://www.fortuneo.fr",
    peaUrl: "https://www.fortuneo.fr/bourse",
    tariffUrl: "https://www.fortuneo.fr/compte-titres-bourse/tarifs-bourse",
    country: "France",
    regulator: "AMF / ACPR",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 0, max: 20, unit: "EUR", detail: "Starter : 1er ordre/mois gratuit < 500 €, 0.35 % au-delà. Optimum : 1er ordre/mois gratuit > 500 €, 1.95 € sinon" },
      orderOtherEU: { min: 0.20, max: 0.50, unit: "%", detail: "0.20 % min 15 € hors Euronext" },
      inactivity: FREE,
      transferOut: { min: 15, max: 15, unit: "EUR", detail: "15 € par ligne, max 150 €" },
      managementFee: null,
      currencyFee: null,
    },
    features: {
      stockCount: 8000,
      etfCount: 1000,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: true,
      peaPme: true,
      transferIn: true,
      minOrderAmount: null,
      mobileApp: true,
      webPlatform: true,
      advancedTools: true,
      etfPartnerships: "Amundi : 1er ordre ETF remboursé/mois (800 € – 100 000 €)",
    },
    pros: [
      "1er ordre mensuel gratuit (< 500 € ou > 500 € selon formule)",
      "Banque en ligne complète (compte courant + PEA)",
      "PEA Jeune et PEA-PME disponibles",
      "Partenariat Amundi : 1er ordre ETF remboursé/mois",
      "Interface claire, bon service client",
      "Transfert entrant possible",
    ],
    cons: [
      "Frais plus élevés que XTB/Trade Republic pour ordres fréquents",
      "Hors Euronext : minimum 15 € par ordre",
      "Pas de fractions d'actions",
      "Pas de plans programmés automatiques",
    ],
    promotions: [
      {
        description: "1er achat ETF Amundi remboursé chaque mois (800 € - 100 000 €)",
        validUntil: "2026-03-31",
        conditions: "Ordre d'achat entre 800 € et 100 000 € sur ETF Amundi éligible",
      },
    ],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.fortuneo.fr/bourse",
      "https://avenuedesinvestisseurs.fr/avis-fortuneo-bourse-pea-cto/",
      "https://nexipa.com/bourse/avis-pea-fortuneo/",
    ],
    managedOption: {
      gestionnaire: "Arkea Investment Services",
      feeType: "hybrid",
      annualFee: null,
      performanceFee: 0.15,
      profiles: [
        { name: "Dynamique", risk: 6, minHorizon: 5, perf2024: null, perf2025: null },
      ],
      minInvestment: 30000,
      canMixWithLibre: false,
      detail: "Gestion sous mandat PEA : profil Dynamique uniquement, OPCVM sélectionnés par Arkea IS. Frais OPCVM ~1-3 %/an + 15 % commission de surperformance.",
    },
  },

  // ── BoursoBank (ex-Boursorama) ──────────────────────────────────────────
  {
    id: "boursobank",
    name: "BoursoBank",
    feeModel: { type: "tiered", tiers: [{ upTo: 500, fee: 1.99 }], aboveRate: 0.005 },
    feeShortLabel: "1,99 € (< 500 €) ou 0,50 %",
    effectiveMinOrder: 200,
    type: "banque_en_ligne",
    website: "https://www.boursobank.com",
    peaUrl: "https://www.boursobank.com/bourse/pea-plan-epargne-actions",
    tariffUrl: "https://www.boursobank.com/bourse/tarifs",
    country: "France",
    regulator: "AMF / ACPR",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 1.99, max: 0.50, unit: "%", detail: "1,99 € (< 500 €) ou 0,50 % (≥ 500 €) — Offre Découverte" },
      orderOtherEU: { min: 1.99, max: 0.50, unit: "%", detail: "1,99 € (< 500 €) ou 0,50 % (≥ 500 €)" },
      inactivity: FREE,
      transferOut: { min: 15, max: 15, unit: "EUR", detail: "15 € par ligne, max 150 €" },
      managementFee: null,
      currencyFee: null,
    },
    features: {
      stockCount: 8000,
      etfCount: 800,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: true,
      peaPme: true,
      transferIn: true,
      minOrderAmount: 200,
      mobileApp: true,
      webPlatform: true,
      advancedTools: false,
      etfPartnerships: "BoursoMarkets : 160+ ETF iShares (BlackRock) à 0 € de frais à l'achat",
    },
    pros: [
      "Banque en ligne complète (compte courant, épargne, crédit + PEA)",
      "BoursoMarkets : 160+ ETF iShares à 0 € de frais à l'achat",
      "PEA Jeune et PEA-PME disponibles",
      "Gestion profilée optionnelle disponible",
      "Très large base de clients, fiabilité",
      "Transfert entrant possible",
      "Pas de frais de garde ni d'inactivité",
    ],
    cons: [
      "Frais de courtage élevés hors BoursoMarkets : 1,99 € (< 500 €) ou 0,50 % (≥ 500 €)",
      "Ordre minimum de 200 € à l'achat (BoursoMarkets et hors BoursoMarkets)",
      "Pas adapté aux petits ordres",
      "Pas d'outils d'analyse avancés",
      "Pas de plans programmés sans frais",
    ],
    promotions: [
      {
        description: "BoursoMarkets : 160+ ETF iShares à 0 € de frais à l'achat et à la vente",
        validUntil: null,
        conditions: "Ordre d'achat minimum 200 €, sur les ETF iShares (BlackRock) de la sélection BoursoMarkets",
      },
    ],
    lastChecked: "2026-03-03",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.boursobank.com/bourse/pea-plan-epargne-actions",
      "https://finance-heros.fr/avis-courtier/avis-boursorama-pea-compte-titre/",
      "https://avenuedesinvestisseurs.fr/pea-fortuneo-ou-boursobank/",
    ],
    managedOption: {
      gestionnaire: "Amundi",
      feeType: "fixed",
      annualFee: { min: 1.20, max: 1.20, unit: "%", detail: "1,20 %/an tout compris (gestion + frais sous-jacents)" },
      performanceFee: null,
      profiles: [
        { name: "Prudent", risk: 3, minHorizon: 3, perf2024: 0.048, perf2025: null },
        { name: "Équilibré", risk: 4, minHorizon: 5, perf2024: 0.076, perf2025: null },
        { name: "Dynamique", risk: 5, minHorizon: 5, perf2024: 0.102, perf2025: null },
        { name: "Offensif", risk: 6, minHorizon: 8, perf2024: 0.128, perf2025: null },
      ],
      minInvestment: 100,
      canMixWithLibre: true,
      detail: "Gestion profilée PEA par Amundi. 4 profils de risque, mix libre + profilée possible dans le même PEA. Frais tout compris 1,20 %/an.",
    },
  },

  // ── Bourse Direct ───────────────────────────────────────────────────────
  {
    id: "bourse-direct",
    name: "Bourse Direct",
    feeModel: { type: "tiered", tiers: [{ upTo: 500, fee: 0.99 }, { upTo: 1000, fee: 1.90 }, { upTo: 2000, fee: 3.80 }], aboveRate: 0.0009 },
    feeShortLabel: "0,99 € (< 500 €)",
    effectiveMinOrder: 50,
    type: "courtier",
    website: "https://www.boursedirect.fr",
    peaUrl: "https://www.boursedirect.fr/fr/bourse/tarifs",
    tariffUrl: "https://www.boursedirect.fr/fr/bourse/tarifs",
    country: "France",
    regulator: "AMF / ACPR",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 0.99, max: 9, unit: "EUR", detail: "0.99 € < 500 €, 1.90 € < 1 000 €, 3.80 € < 2 000 €, 0.09 % au-delà" },
      orderOtherEU: { min: 0.15, max: 0.15, unit: "%", detail: "0.15 % min 15 €" },
      inactivity: FREE,
      transferOut: { min: 15, max: 15, unit: "EUR", detail: "15 € par ligne, max 150 €" },
      managementFee: null,
      currencyFee: null,
    },
    features: {
      stockCount: 15000,
      etfCount: 1500,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: true,
      peaPme: true,
      transferIn: true,
      minOrderAmount: null,
      mobileApp: true,
      webPlatform: true,
      advancedTools: true,
      etfPartnerships: "iShares : frais plafonnés 0.99 €/ordre. Amundi : 1er ordre ETF remboursé/mois",
    },
    pros: [
      "Frais parmi les plus bas des courtiers historiques français",
      "Offre iShares : ordres ETF plafonnés à 0.99 € (jusqu'en sept. 2026)",
      "Offre Amundi : 1er ordre ETF remboursé/mois",
      "PEA Jeune, PEA-PME disponibles",
      "Courtier français historique, fiable",
      "Transfert entrant possible avec remboursement frais",
    ],
    cons: [
      "Interface vieillissante",
      "Application mobile basique",
      "Hors Euronext : minimum 15 € par ordre",
      "Pas de fractions d'actions",
      "Pas de plans programmés automatiques",
    ],
    promotions: [
      {
        description: "ETF iShares : frais plafonnés à 0.99 € par ordre d'achat",
        validUntil: "2026-09-15",
        conditions: "Sur la sélection ETF iShares éligibles PEA",
      },
      {
        description: "Amundi : 1er ordre d'achat ETF remboursé chaque mois",
        validUntil: "2026-04-30",
        conditions: "Ordre entre 200 € et 100 000 € sur ETF Amundi éligible",
      },
      {
        description: "Jusqu'à 300 € de frais offerts pour ouverture/transfert",
        validUntil: null,
        conditions: "Code « 30ans », valorisation min 100 €",
      },
    ],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.boursedirect.fr/fr/bourse/tarifs",
      "https://avenuedesinvestisseurs.fr/avis-pea-bourse-direct/",
      "https://www.boursedirect.fr/fr/etf/offres/ishares",
    ],
    managedOption: null,
  },

  // ── Saxo Banque ─────────────────────────────────────────────────────────
  {
    id: "saxo-banque",
    name: "Saxo Banque",
    feeModel: { type: "percentage", rate: 0.0008, min: 2 },
    feeShortLabel: "0,08 % (min 2 €)",
    effectiveMinOrder: 50,
    type: "courtier",
    website: "https://www.home.saxo/fr-fr",
    peaUrl: "https://www.home.saxo/fr-fr/accounts/pea",
    tariffUrl: "https://www.home.saxo/fr-fr/rates-and-conditions/stocks/commissions",
    country: "Danemark",
    regulator: "DFSA / AMF",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 2, max: 2, unit: "EUR", detail: "0.08 % par ordre, minimum 2 €" },
      orderOtherEU: { min: 2, max: 2, unit: "EUR", detail: "0.08 % par ordre, minimum 2 €" },
      inactivity: FREE,
      transferOut: { min: 0, max: 150, unit: "EUR", detail: "Remboursé à 100% jusqu'à 150 € (offre en cours)" },
      managementFee: null,
      currencyFee: { min: 0.25, max: 0.25, unit: "%", detail: "0.25 % sur devises non-EUR" },
    },
    features: {
      stockCount: 10000,
      etfCount: 3000,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: true,
      transferIn: true,
      minOrderAmount: null,
      mobileApp: true,
      webPlatform: true,
      advancedTools: true,
      etfPartnerships: "0 frais sur 70 actions sélectionnées (CAC 40 + 30 EU) jusqu'au 31/12/2026",
    },
    pros: [
      "Frais compétitifs (0.08 %, min 2 €)",
      "Offre 2026 : 0 frais sur 70 actions sélectionnées (CAC 40 + 30 EU)",
      "Plateforme SaxoTraderPRO très complète",
      "Large choix d'ETF (3000+)",
      "Transfert entrant : frais remboursés jusqu'à 150 €",
    ],
    cons: [
      "Minimum 2 € par ordre (peu adapté aux très petits ordres)",
      "Pas de PEA Jeune",
      "Pas de fractions d'actions",
      "Interface peut sembler complexe pour débutants",
      "Frais de change sur devises non-EUR",
    ],
    promotions: [
      {
        description: "0 frais de courtage sur 70 actions sélectionnées (CAC 40 + 30 EU)",
        validUntil: "2026-12-31",
        conditions: "Nouveaux clients ou clients sans PEA chez Saxo depuis 01/2025",
      },
    ],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.home.saxo/fr-fr/accounts/pea",
      "https://www.home.saxo/fr-fr/content/commentaries/pr/press-release/saxo-banque-devoile-son-pea-sans-frais-26022026",
      "https://investimieux.com/avis-pea-saxo/",
    ],
    managedOption: null,
  },

  // ── Yomoni ──────────────────────────────────────────────────────────────
  {
    id: "yomoni",
    name: "Yomoni",
    feeModel: { type: "free" },
    feeShortLabel: "Gestion pilotée 1,60 %/an",
    effectiveMinOrder: 0,
    type: "gestion_pilotee",
    website: "https://www.yomoni.fr",
    peaUrl: "https://www.yomoni.fr/investir/plan-epargne-actions-pea",
    tariffUrl: "https://www.yomoni.fr/tarifs",
    country: "France",
    regulator: "AMF",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: FREE,
      orderOtherEU: null,
      inactivity: FREE,
      transferOut: FREE,
      managementFee: { min: 1.60, max: 1.60, unit: "%", detail: "1.60 %/an tout compris (gestion + frais ETF)" },
      currencyFee: null,
    },
    features: {
      stockCount: null,
      etfCount: null,
      freeSavingsPlan: true,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: false,
      transferIn: true,
      minOrderAmount: 1000,
      mobileApp: true,
      webPlatform: true,
      advancedTools: false,
      etfPartnerships: null,
    },
    pros: [
      "Gestion 100 % pilotée — aucune action à faire",
      "Portefeuille ETF diversifié optimisé par des experts",
      "Frais tout compris (1.60 %/an) sans surprise",
      "Performance moyenne +8 %/an depuis 2016",
      "Transfert entrant gratuit",
    ],
    cons: [
      "Pas de gestion libre (pas de choix de titres)",
      "Frais plus élevés que la gestion libre (1.60 %/an)",
      "Minimum 1 000 € pour ouvrir",
      "Pas de PEA Jeune ni PEA-PME",
      "Univers d'investissement limité aux ETF choisis par Yomoni",
    ],
    promotions: [],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.yomoni.fr/investir/plan-epargne-actions-pea",
      "https://avenuedesinvestisseurs.fr/yomoni-avis-gestion-pilotee/",
      "https://finance-heros.fr/avis-yomoni/",
    ],
    managedOption: null,
  },

  // ── Ramify ──────────────────────────────────────────────────────────────
  {
    id: "ramify",
    name: "Ramify",
    feeModel: { type: "free" },
    feeShortLabel: "Gestion pilotée 1,20 %/an",
    effectiveMinOrder: 0,
    type: "gestion_pilotee",
    website: "https://www.ramify.fr",
    peaUrl: "https://www.ramify.fr/produits/pea",
    tariffUrl: "https://www.ramify.fr/tarifs",
    country: "France",
    regulator: "AMF",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: FREE,
      orderOtherEU: null,
      inactivity: FREE,
      transferOut: FREE,
      managementFee: { min: 1.20, max: 1.60, unit: "%", detail: "1.20 % à 1.60 %/an selon montant investi" },
      currencyFee: null,
    },
    features: {
      stockCount: null,
      etfCount: null,
      freeSavingsPlan: true,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: false,
      transferIn: true,
      minOrderAmount: 50000,
      mobileApp: true,
      webPlatform: true,
      advancedTools: false,
      etfPartnerships: null,
    },
    pros: [
      "Gestion conseillée par des experts (portefeuille ETF)",
      "Frais dégressifs à partir de 1.20 %/an",
      "Transfert dès 5 000 € (ouverture dès 50 000 €)",
      "Absence de frais cachés (entrée, sortie, arbitrage)",
    ],
    cons: [
      "Ticket d'entrée élevé : 50 000 € pour ouvrir",
      "Pas de gestion libre",
      "Pas de PEA Jeune ni PEA-PME",
      "Offre récente, peu de recul",
    ],
    promotions: [],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.ramify.fr/produits/pea",
      "https://www.ramify.fr/tarifs",
      "https://avenuedesinvestisseurs.fr/avis-ramify-gestion-pilotee/",
      "https://sinvestir.fr/avis-pea-ramify/",
    ],
    managedOption: null,
  },

  // ── EasyBourse ──────────────────────────────────────────────────────────
  {
    id: "easybourse",
    name: "EasyBourse",
    feeModel: { type: "tiered", tiers: [{ upTo: 500, fee: 2 }], aboveRate: 0.0045 },
    feeShortLabel: "2 € (≤ 500 €) ou 0,45 %",
    effectiveMinOrder: 100,
    type: "courtier",
    website: "https://www.easybourse.com",
    peaUrl: "https://www.easybourse.com",
    tariffUrl: "https://www.easybourse.com/offre-tarifaire",
    country: "France",
    regulator: "AMF / ACPR",
    fees: {
      opening: FREE,
      custody: FREE,
      orderEuronext: { min: 2, max: 10, unit: "EUR", detail: "Découverte/Premium : 2 € ≤ 500 €, 0.45 % au-delà. Expert : 9 € ≤ 5 000 €, 0.20 % au-delà" },
      orderOtherEU: { min: 0.20, max: 0.50, unit: "%", detail: "Variable selon place" },
      inactivity: { min: 0, max: 5, unit: "EUR", detail: "0 € (EasyStart 18-30 ans), 3 €/mois (Découverte/Premium), 5 €/mois (Expert)" },
      transferOut: { min: 15, max: 15, unit: "EUR", detail: "15 € par ligne" },
      managementFee: null,
      currencyFee: null,
    },
    features: {
      stockCount: 10000,
      etfCount: 800,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: true,
      peaPme: true,
      transferIn: true,
      minOrderAmount: null,
      mobileApp: true,
      webPlatform: true,
      advancedTools: false,
      etfPartnerships: null,
    },
    pros: [
      "Filiale de La Banque Postale — solidité institutionnelle",
      "PEA Jeune et PEA-PME disponibles",
      "Offres promotionnelles régulières (frais offerts à l'ouverture)",
    ],
    cons: [
      "Frais d'inactivité de 3 €/mois si aucun ordre (Découverte/Premium)",
      "Service client noté 2.1/5 sur Trustpilot",
      "Interface datée",
      "Moins compétitif que les néo-courtiers",
    ],
    promotions: [
      {
        description: "Jusqu'à 500 € de frais remboursés à l'ouverture/transfert",
        validUntil: "2026-04-30",
        conditions: "Nouveaux comptes ouverts entre 01/01/2026 et 30/04/2026",
      },
    ],
    lastChecked: "2026-03-02",
    envelopes: ["pea", "cto"],
    sources: [
      "https://www.easybourse.com/offre-tarifaire",
      "https://www.francetransactions.com/bourse/pea/pea-easybourse.html",
      "https://sinvestir.fr/ouvrir-un-pea-comparatif-banque-courtier-en-ligne/",
    ],
    managedOption: {
      gestionnaire: "La Banque Postale Asset Management",
      feeType: "fixed",
      annualFee: { min: 0.40, max: 1.20, unit: "%", detail: "0,40 % à 1,20 %/an selon le profil et le montant investi" },
      performanceFee: null,
      profiles: [
        { name: "Prudent", risk: 3, minHorizon: 3, perf2024: null, perf2025: null },
        { name: "Équilibré", risk: 4, minHorizon: 5, perf2024: null, perf2025: null },
        { name: "Dynamique", risk: 5, minHorizon: 5, perf2024: null, perf2025: null },
        { name: "Offensif", risk: 6, minHorizon: 8, perf2024: null, perf2025: null },
      ],
      minInvestment: 10000,
      canMixWithLibre: false,
      detail: "Gestion sous mandat PEA via La Banque Postale. 4 profils, investissement min 10 000 € à 75 000 € selon profil.",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Retourne la liste triée par coût de courtage croissant (pour un ordre Euronext donné). */
export function sortByOrderCost(amount: number): PeaBroker[] {
  return [...PEA_BROKERS].sort((a, b) => {
    const costA = computeOrderCost(a, amount);
    const costB = computeOrderCost(b, amount);
    return costA - costB;
  });
}

/** Estime le coût d'un ordre Euronext pour un montant donné. */
export function computeOrderCost(broker: PeaBroker, amount: number): number {
  const fee = broker.fees.orderEuronext;
  if (fee.unit === "%") return amount * (fee.min / 100);
  return fee.min;
}

/** Labels affichables pour les types de courtier. */
export const BROKER_TYPE_LABELS: Record<BrokerType, string> = {
  courtier: "Courtier en ligne",
  banque_en_ligne: "Banque en ligne",
  neocourtier: "Néo-courtier",
  gestion_pilotee: "Gestion pilotée",
};
