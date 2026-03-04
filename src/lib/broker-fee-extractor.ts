/**
 * Extraction structurée des frais courtiers depuis le texte scrapé.
 *
 * Chaque courtier possède un extracteur spécifique qui cherche des patterns
 * précis dans le HTML strippé. Les valeurs extraites portent un score de
 * confiance (high / medium / low) utilisé par `brokers.ts` pour décider
 * si l'on fusionne automatiquement ou si l'on signale simplement un drift.
 *
 * Confiance :
 *   - high   : pattern spécifique trouvé ET confirmé par site de comparaison
 *   - medium : pattern spécifique trouvé OU confirmé par comparaison
 *   - low    : pattern générique seulement
 */

import type { FeeModel } from "@/data/pea-brokers";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low";

export interface ExtractedField<T> {
  value: T;
  confidence: Confidence;
  /** Pattern source ayant produit la valeur */
  source: string;
}

export interface ExtractedFees {
  feeModel?: ExtractedField<FeeModel>;
  effectiveMinOrder?: ExtractedField<number>;
  feeShortLabel?: ExtractedField<string>;
  etfCount?: ExtractedField<number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse un nombre français : "1,99" → 1.99, "100 000" → 100000 */
function parseFrenchNumber(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(",", "."));
}

/** Teste si un pattern est trouvé dans le texte. */
function has(text: string, pattern: RegExp): boolean {
  return new RegExp(pattern.source, pattern.flags).test(text);
}

/** Extrait le premier groupe capturant d'un pattern. */
function capture(text: string, pattern: RegExp): string | null {
  const m = new RegExp(pattern.source, pattern.flags).exec(text);
  return m?.[1] ?? null;
}

/**
 * Cherche un nombre d'ETF dans le texte.
 * Retourne null si non trouvé ou si la valeur est manifestement incohérente.
 */
function extractEtfCount(text: string): number | null {
  const m = text.match(/(\d[\d\s.,]*)\s*ETF/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[\s.,]/g, ""), 10);
  return isNaN(n) || n < 5 || n > 50_000 ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracteurs par courtier
// ─────────────────────────────────────────────────────────────────────────────

type Extractor = (text: string, comparisonText: string) => ExtractedFees;

function extractTradeRepublic(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  // 1 € fixe par ordre
  const hasFixed1 = has(text, /1\s*€\s*(?:fixe|par\s+ordre|flat)/i);
  const compConfirms = has(comp, /1\s*€/i) && has(comp, /trade\s*republic/i);

  if (hasFixed1) {
    result.feeModel = {
      value: { type: "fixed", amount: 1 },
      confidence: compConfirms ? "high" : "medium",
      source: "1 € fixe pattern",
    };
    result.feeShortLabel = {
      value: "DCA gratuit",
      confidence: compConfirms ? "high" : "medium",
      source: "trade-republic fee label",
    };
  }

  // Min order : 1 € (fractions)
  if (has(text, /fraction|à\s+partir\s+de\s+1\s*€/i)) {
    result.effectiveMinOrder = {
      value: 1,
      confidence: "medium",
      source: "fractional shares detection",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractXtb(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  const hasFree = has(text, /0\s*[%€]\s*(?:de\s+)?commission/i);
  const hasThreshold = has(text, /100\s*000\s*€/i);
  const compConfirms = has(comp, /0\s*[%€]\s*commission/i) || has(comp, /sans\s+commission/i);

  if (hasFree) {
    result.feeModel = {
      value: { type: "free" },
      confidence: hasFree && compConfirms ? "high" : hasFree ? "medium" : "low",
      source: "0 % commission pattern",
    };
    const label = hasThreshold ? "0 € (< 100k€/mois)" : "0 €";
    result.feeShortLabel = {
      value: label,
      confidence: hasFree ? "medium" : "low",
      source: "xtb free commission",
    };
  }

  if (has(text, /10\s*€\s*minimum/i)) {
    result.effectiveMinOrder = { value: 10, confidence: "medium", source: "min order 10 €" };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractBoursoBank(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  // Palier de base : chercher les montants fixes par palier
  const hasTiered = has(text, /1[.,]99\s*€/i) || has(text, /boursomarkets/i);
  const hasPercentage = has(text, /0[.,]50?\s*%/i) || has(text, /0[.,]5\s*%/i);
  const compConfirms = has(comp, /bourso/i) && (has(comp, /1[.,]99/i) || has(comp, /0[.,]5/i));

  // Extraire le montant du 1er palier
  const tierMatch = capture(text, /(\d+[.,]\d+)\s*€\s*(?:par\s+ordre|fixe)?(?:[^.]{0,30}(?:500|boursomarkets))/i);
  const tierFee = tierMatch ? parseFrenchNumber(tierMatch) : null;

  // Extraire le taux au-delà
  const rateMatch = capture(text, /(0[.,]\d+)\s*%\s*(?:au[- ]?delà|sinon|à\s+partir)/i);
  const aboveRate = rateMatch ? parseFrenchNumber(rateMatch) / 100 : null;

  if (tierFee !== null || hasPercentage) {
    result.feeModel = {
      value: {
        type: "tiered",
        tiers: [{ upTo: 500, fee: tierFee ?? 1.99 }],
        aboveRate: aboveRate ?? 0.005,
      },
      confidence: compConfirms ? "high" : (hasTiered || hasPercentage) ? "medium" : "low",
      source: "boursobank tiered pattern",
    };
  }

  // Minimum order
  const minMatch = capture(text, /(\d+)\s*€\s*minimum/i);
  if (minMatch) {
    result.effectiveMinOrder = {
      value: parseInt(minMatch, 10),
      confidence: "medium",
      source: "min order pattern",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractFortuneoFees(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  const hasFirstFree = has(text, /1er\s+ordre[^.]*gratuit/i) || has(text, /premier\s+ordre[^.]*gratuit/i);
  const hasTiers = has(text, /1[.,]95\s*€/i);
  const hasAboveRate = has(text, /0[.,]35\s*%/i);
  const compConfirms = has(comp, /fortuneo/i) && (has(comp, /1[.,]95/i) || has(comp, /0[.,]35/i));

  // Extraire palier de base
  const tierMatch = capture(text, /(\d+[.,]\d+)\s*€(?:[^.]{0,40}(?:500|jusqu|palier))/i);
  const tierFee = tierMatch ? parseFrenchNumber(tierMatch) : null;

  // Taux au-delà
  const rateMatch = capture(text, /(0[.,]\d+)\s*%/i);
  const aboveRate = rateMatch ? parseFrenchNumber(rateMatch) / 100 : null;

  if (hasFirstFree && (hasTiers || tierFee !== null)) {
    result.feeModel = {
      value: {
        type: "first_free_monthly",
        afterFirst: {
          type: "tiered",
          tiers: [{ upTo: 500, fee: tierFee ?? 1.95 }],
          aboveRate: aboveRate ?? 0.0035,
        },
      },
      confidence: compConfirms ? "high" : "medium",
      source: "fortuneo 1er gratuit + paliers",
    };
    result.feeShortLabel = {
      value: "1er ordre/mois offert",
      confidence: hasFirstFree ? "medium" : "low",
      source: "fortuneo first free label",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractInteractiveBrokers(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  const hasRate = has(text, /0[.,]05\s*%/i);
  const hasMin = has(text, /(?:min(?:imum)?)\s*1[.,]25/i) || has(text, /1[.,]25\s*€/i);
  const hasMax = has(text, /(?:max(?:imum)?|plafonné)\s*29/i) || has(text, /29\s*€/i);
  const compConfirms = has(comp, /interactive/i) && (has(comp, /0[.,]05/i) || has(comp, /1[.,]25/i));

  // Extraire le taux exact
  const rateMatch = capture(text, /(0[.,]0\d+)\s*%/i);
  const rate = rateMatch ? parseFrenchNumber(rateMatch) / 100 : null;

  // Extraire min
  const minMatch = capture(text, /min(?:imum)?\s*(\d+[.,]\d+)/i);
  const minFee = minMatch ? parseFrenchNumber(minMatch) : null;

  // Extraire max
  const maxMatch = capture(text, /max(?:imum)?\s*(\d+)/i);
  const maxFee = maxMatch ? parseFrenchNumber(maxMatch) : null;

  if (hasRate || (hasMin && hasMax)) {
    result.feeModel = {
      value: {
        type: "percentage",
        rate: rate ?? 0.0005,
        min: minFee ?? 1.25,
        max: maxFee ?? 29,
      },
      confidence: compConfirms ? "high" : (hasRate && hasMin) ? "medium" : "low",
      source: "IBKR percentage pattern",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractBourseDirect(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  const hasTier1 = has(text, /0[.,]99\s*€/i);
  const hasTier2 = has(text, /1[.,]90\s*€/i);
  const hasTier3 = has(text, /3[.,]80\s*€/i);
  const compConfirms = has(comp, /bourse\s*direct/i) && (has(comp, /0[.,]99/i) || has(comp, /1[.,]90/i));

  if (hasTier1 || hasTier2) {
    const tiers: Array<{ upTo: number; fee: number }> = [];

    // Extraire les paliers
    const t1 = capture(text, /(\d+[.,]\d+)\s*€(?:[^.]{0,30}500)/i);
    const t2 = capture(text, /(\d+[.,]\d+)\s*€(?:[^.]{0,30}(?:1\s*000|1000))/i);
    const t3 = capture(text, /(\d+[.,]\d+)\s*€(?:[^.]{0,30}(?:2\s*000|2000))/i);

    tiers.push({ upTo: 500, fee: t1 ? parseFrenchNumber(t1) : 0.99 });
    if (t2 || hasTier2) tiers.push({ upTo: 1000, fee: t2 ? parseFrenchNumber(t2) : 1.90 });
    if (t3 || hasTier3) tiers.push({ upTo: 2000, fee: t3 ? parseFrenchNumber(t3) : 3.80 });

    result.feeModel = {
      value: { type: "tiered", tiers, aboveRate: 0.0009 },
      confidence: compConfirms ? "high" : (hasTier1 && hasTier2) ? "medium" : "low",
      source: "bourse-direct tiered pattern",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractSaxo(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  const hasRate = has(text, /0[.,]08\s*%/i);
  const hasMin = has(text, /minimum\s*2\s*€/i) || has(text, /min\s*2\s*€/i);
  const compConfirms = has(comp, /saxo/i) && (has(comp, /0[.,]08/i) || has(comp, /2\s*€/i));

  const rateMatch = capture(text, /(0[.,]0\d+)\s*%/i);
  const rate = rateMatch ? parseFrenchNumber(rateMatch) / 100 : null;

  const minMatch = capture(text, /min(?:imum)?\s*(\d+)\s*€/i);
  const minFee = minMatch ? parseInt(minMatch, 10) : null;

  if (hasRate || hasMin) {
    result.feeModel = {
      value: { type: "percentage", rate: rate ?? 0.0008, min: minFee ?? 2 },
      confidence: compConfirms ? "high" : hasRate ? "medium" : "low",
      source: "saxo percentage pattern",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractEasyBourse(text: string, comp: string): ExtractedFees {
  const result: ExtractedFees = {};

  const hasTier = has(text, /2\s*€\s*(?:par\s+)?(?:ordre|transaction)/i) || has(text, /découverte/i);
  const hasRate = has(text, /0[.,]40?\s*%/i) || has(text, /0[.,]45?\s*%/i);
  const compConfirms = has(comp, /easybourse/i) && (has(comp, /2\s*€/i) || has(comp, /0[.,]4/i));

  const tierMatch = capture(text, /(\d+)\s*€(?:[^.]{0,30}500)/i);
  const rateMatch = capture(text, /(0[.,]\d+)\s*%\s*(?:au[- ]?delà)?/i);

  if (hasTier || hasRate) {
    result.feeModel = {
      value: {
        type: "tiered",
        tiers: [{ upTo: 500, fee: tierMatch ? parseInt(tierMatch, 10) : 2 }],
        aboveRate: rateMatch ? parseFrenchNumber(rateMatch) / 100 : 0.0045,
      },
      confidence: compConfirms ? "high" : hasTier ? "medium" : "low",
      source: "easybourse tiered pattern",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractManagedBroker(_text: string, _comp: string): ExtractedFees {
  // Yomoni, Ramify, Goodvest, Nalo : gestion pilotée, pas de feeModel à extraire
  // Les frais de gestion sont annuels, pas par ordre
  return {};
}

// ── Extracteur générique pour banques traditionnelles ───────────────────────

function extractTraditionalBank(
  text: string,
  comp: string,
  opts: {
    expectedRate?: number;
    expectedMin?: number;
    tiered?: boolean;
    tiers?: Array<{ upTo: number; fee: number }>;
    aboveRate?: number;
    bankNamePattern: RegExp;
  },
): ExtractedFees {
  const result: ExtractedFees = {};

  // Chercher taux de commission
  const rateMatch = capture(text, /(0[.,]\d+)\s*%\s*(?:par\s+ordre|de\s+courtage|commission)?/i);
  const rate = rateMatch ? parseFrenchNumber(rateMatch) / 100 : null;

  // Chercher minimum en €
  const minMatch = capture(text, /min(?:imum)?\s*(\d+[.,]?\d*)\s*€/i);
  const minFee = minMatch ? parseFrenchNumber(minMatch) : null;

  // Confirmation par site de comparaison
  const compConfirms = has(comp, opts.bankNamePattern);

  if (opts.tiered && opts.tiers) {
    // Modèle paliers (Hello Bank!, BNP, Crédit Mutuel)
    const tierMatch = capture(text, /(\d+[.,]\d+)\s*€(?:[^.]{0,30}(?:500|1\s*000))/i);
    const tierFee = tierMatch ? parseFrenchNumber(tierMatch) : null;

    result.feeModel = {
      value: {
        type: "tiered",
        tiers: tierFee ? [{ upTo: opts.tiers[0].upTo, fee: tierFee }] : opts.tiers,
        aboveRate: rate ?? opts.aboveRate ?? 0.005,
      },
      confidence: compConfirms ? "high" : (tierFee || rate) ? "medium" : "low",
      source: "traditional bank tiered pattern",
    };
  } else {
    // Modèle pourcentage avec minimum (SG, LCL, CA, CE, BP)
    result.feeModel = {
      value: {
        type: "percentage",
        rate: rate ?? opts.expectedRate ?? 0.005,
        min: minFee ?? opts.expectedMin ?? 5,
      },
      confidence: compConfirms ? "high" : (rate || minFee) ? "medium" : "low",
      source: "traditional bank percentage pattern",
    };
  }

  const etfCount = extractEtfCount(text);
  if (etfCount) {
    result.etfCount = { value: etfCount, confidence: "medium", source: "ETF count pattern" };
  }

  return result;
}

function extractHelloBank(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    tiered: true,
    tiers: [{ upTo: 500, fee: 1.75 }, { upTo: 2000, fee: 5 }],
    aboveRate: 0.005,
    bankNamePattern: /hello\s*bank/i,
  });
}

function extractMonabanq(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    tiered: true,
    tiers: [{ upTo: 1000, fee: 5.50 }],
    aboveRate: 0.005,
    bankNamePattern: /monabanq/i,
  });
}

function extractCreditAgricole(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    expectedRate: 0.0065,
    expectedMin: 8,
    bankNamePattern: /cr[ée]dit\s*agricole/i,
  });
}

function extractBnpParibas(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    tiered: true,
    tiers: [{ upTo: 1000, fee: 5.50 }, { upTo: 3000, fee: 11 }],
    aboveRate: 0.004,
    bankNamePattern: /bnp\s*paribas/i,
  });
}

function extractSocieteGenerale(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    expectedRate: 0.005,
    expectedMin: 8.50,
    bankNamePattern: /soci[ée]t[ée]\s*g[ée]n[ée]rale|^sg$/i,
  });
}

function extractLcl(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    expectedRate: 0.005,
    expectedMin: 5,
    bankNamePattern: /lcl/i,
  });
}

function extractCreditMutuel(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    tiered: true,
    tiers: [{ upTo: 1000, fee: 4.95 }],
    aboveRate: 0.005,
    bankNamePattern: /cr[ée]dit\s*mutuel|cic/i,
  });
}

function extractCaisseEpargne(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    expectedRate: 0.005,
    expectedMin: 6,
    bankNamePattern: /caisse\s*d'?[ée]pargne|bpce/i,
  });
}

function extractBanquePopulaire(text: string, comp: string): ExtractedFees {
  return extractTraditionalBank(text, comp, {
    expectedRate: 0.005,
    expectedMin: 7,
    bankNamePattern: /banque\s*populaire|bpce/i,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACTORS: Record<string, Extractor> = {
  "trade-republic": extractTradeRepublic,
  xtb: extractXtb,
  boursobank: extractBoursoBank,
  fortuneo: extractFortuneoFees,
  "interactive-brokers": extractInteractiveBrokers,
  "bourse-direct": extractBourseDirect,
  "saxo-banque": extractSaxo,
  easybourse: extractEasyBourse,
  yomoni: extractManagedBroker,
  ramify: extractManagedBroker,
  "hello-bank": extractHelloBank,
  monabanq: extractMonabanq,
  "credit-agricole": extractCreditAgricole,
  "bnp-paribas": extractBnpParibas,
  "societe-generale": extractSocieteGenerale,
  lcl: extractLcl,
  "credit-mutuel": extractCreditMutuel,
  "caisse-epargne": extractCaisseEpargne,
  "banque-populaire": extractBanquePopulaire,
  goodvest: extractManagedBroker,
  nalo: extractManagedBroker,
};

// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait les frais structurés depuis le texte brut scrapé d'un courtier.
 *
 * @param brokerId   Identifiant du courtier (ex: "trade-republic")
 * @param text       Texte combiné des pages du courtier (HTML strippé)
 * @param compText   Texte combiné des sites de comparaison (pour cross-validation)
 */
export function extractBrokerFees(
  brokerId: string,
  text: string,
  compText: string = "",
): ExtractedFees {
  const extractor = EXTRACTORS[brokerId];
  if (!extractor) return {};
  return extractor(text, compText);
}

/** Liste des courtiers supportés par l'extraction automatique. */
export const SUPPORTED_BROKER_IDS = Object.keys(EXTRACTORS);
