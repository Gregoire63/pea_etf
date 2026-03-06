/**
 * Extraction structuree des partenariats ETF courtiers depuis le texte scrape.
 *
 * Analogue a broker-fee-extractor.ts, ce module parse le texte brut des pages
 * courtiers pour decouvrir dynamiquement les offres partenaires (0 EUR frais,
 * remboursement, plafonnement) par emetteur ETF.
 *
 * Les resultats portent un score de confiance (high / medium / low) utilise
 * par brokers.ts pour decider si l'on fusionne automatiquement ou si l'on
 * signale un drift.
 *
 * Confiance :
 *   - high   : emetteur + type de deal clairement identifies + confirme par comparaison
 *   - medium : emetteur + deal identifies dans le texte principal seulement
 *   - low    : mention generique de partenariat sans details precis
 */

import type { BrokerDealInfo } from "@/types/etf";
import type { Confidence } from "./broker-fee-extractor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedDeal {
  issuer: string;
  dealType: BrokerDealInfo["dealType"];
  confidence: Confidence;
  badgeLabel: string;
  description: string;
  conditions?: string;
  source: string;
}

export interface ExtractedPartnerships {
  deals: ExtractedDeal[];
  /** true si le courtier offre 0 EUR sur tous les ETFs (XTB, Trade Republic DCA, etc.) */
  allFree: boolean;
  allFreeConfidence: Confidence;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function has(text: string, pattern: RegExp): boolean {
  return new RegExp(pattern.source, pattern.flags).test(text);
}

function capture(text: string, pattern: RegExp): string | null {
  const m = new RegExp(pattern.source, pattern.flags).exec(text);
  return m?.[1] ?? null;
}

/** Extrait toutes les occurrences capturees d'un pattern. */
function captureAll(text: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const copy = new RegExp(pattern.source, pattern.flags);
  let m;
  while ((m = copy.exec(text)) !== null) {
    if (m[0]) results.push(m[0].trim().substring(0, 200));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Issuer detection patterns
// ---------------------------------------------------------------------------

const ISSUER_PATTERNS: { issuer: string; pattern: RegExp }[] = [
  { issuer: "iShares", pattern: /iShares|BlackRock/i },
  { issuer: "Amundi", pattern: /Amundi/i },
  { issuer: "Lyxor", pattern: /Lyxor/i },
  { issuer: "BNP Paribas", pattern: /BNP\s*(?:Paribas)?(?:\s*Easy)?/i },
  { issuer: "Xtrackers", pattern: /Xtrackers|DWS/i },
  { issuer: "SPDR", pattern: /SPDR|State\s*Street/i },
  { issuer: "Invesco", pattern: /Invesco/i },
  { issuer: "Franklin", pattern: /Franklin/i },
  { issuer: "HSBC", pattern: /HSBC/i },
  { issuer: "Vanguard", pattern: /Vanguard/i },
];

// Deal type detection
const FREE_KEYWORDS = /0\s*[€$]\s*(?:de\s+)?(?:frais|courtage)|sans\s+frais|gratuit(?:s)?|0\s*%\s*(?:de\s+)?commission/i;
const CAPPED_KEYWORDS = /plafonn[ée]|max(?:imum)?\s+\d+[.,]?\d*\s*€|frais\s+r[ée]duits/i;
const REIMBURSED_KEYWORDS = /rembours[ée]|offert|1er\s+ordre[^.]*(?:gratuit|offert|rembours)/i;

// Conditions extraction
const CONDITION_PATTERNS = [
  /(?:ordre|investissement)\s+(?:minimum|min(?:imum)?)\s+(\d[\d\s.,]*)\s*€/i,
  /(?:à\s+partir\s+de|minimum|min)\s+(\d[\d\s.,]*)\s*€/i,
  /entre\s+(\d[\d\s.,]*)\s*€\s*et\s+(\d[\d\s.,]*)\s*€/i,
];

const CAPPED_AMOUNT_PATTERN = /(?:max(?:imum)?|plafonn[ée])\s*(?:à\s+)?(\d+[.,]?\d*)\s*€/i;

// ---------------------------------------------------------------------------
// Sentence-level extraction
// ---------------------------------------------------------------------------

/** Split text into sentences for fine-grained analysis. */
function toSentences(text: string): string[] {
  return text.split(/[.!?\n]+/).filter((s) => s.trim().length > 20);
}

/**
 * Analyse une phrase pour detecter un partenariat emetteur.
 * Retourne null si aucun partenariat n'est detecte.
 */
function analyzeSentence(
  sentence: string,
  brokerId: string,
  brokerName: string,
): ExtractedDeal | null {
  // Trouver l'emetteur mentionne
  let matchedIssuer: string | null = null;
  for (const { issuer, pattern } of ISSUER_PATTERNS) {
    if (pattern.test(sentence)) {
      matchedIssuer = issuer;
      break;
    }
  }
  if (!matchedIssuer) return null;

  // Determiner le type de deal
  const isFree = FREE_KEYWORDS.test(sentence);
  const isCapped = CAPPED_KEYWORDS.test(sentence);
  const isReimbursed = REIMBURSED_KEYWORDS.test(sentence);

  if (!isFree && !isCapped && !isReimbursed) return null;

  // Priorite : free > capped > reimbursed
  const dealType: BrokerDealInfo["dealType"] = isFree
    ? "free"
    : isCapped
      ? "capped"
      : "reimbursed";

  // Badge
  let badgeLabel = "Partenaire";
  if (dealType === "free") badgeLabel = "0 EUR frais";
  else if (dealType === "capped") {
    const cap = capture(sentence, CAPPED_AMOUNT_PATTERN);
    badgeLabel = cap ? `Max ${cap} EUR` : "Frais reduits";
  } else if (dealType === "reimbursed") {
    badgeLabel = "1er ordre offert";
  }

  // Conditions
  let conditions: string | undefined;
  for (const cp of CONDITION_PATTERNS) {
    const condMatch = new RegExp(cp.source, cp.flags).exec(sentence);
    if (condMatch) {
      conditions = condMatch[0].trim();
      break;
    }
  }

  return {
    issuer: matchedIssuer,
    dealType,
    confidence: "medium",
    badgeLabel,
    description: sentence.trim().substring(0, 150),
    conditions,
    source: `sentence extraction for ${matchedIssuer}`,
  };
}

// ---------------------------------------------------------------------------
// All-free broker detection
// ---------------------------------------------------------------------------

const ALL_FREE_PATTERNS = [
  /0\s*[€%]\s*(?:de\s+)?commission\s*(?:sur\s+)?(?:tous?\s+)?(?:les\s+)?(?:ETF|trackers?|ordres?)/i,
  /sans\s+commission\s*(?:sur\s+)?(?:tous?\s+)?(?:les\s+)?(?:ETF|ordres?)/i,
  /commission\s*(?:de\s+)?0\s*[€%]/i,
  /(?:plan|DCA|investissement)\s+(?:programmé|automatique)[^.]{0,40}(?:gratuit|0\s*€|sans\s+frais)/i,
  /(?:gratuit|0\s*€|sans\s+frais)[^.]{0,40}(?:plan|DCA|investissement)\s+(?:programmé|automatique)/i,
];

function detectAllFree(
  text: string,
  compText: string,
  brokerId: string,
): { detected: boolean; confidence: Confidence } {
  const inText = ALL_FREE_PATTERNS.some((p) => has(text, p));
  const inComp = ALL_FREE_PATTERNS.some((p) => has(compText, p));

  if (!inText && !inComp) return { detected: false, confidence: "low" };

  return {
    detected: true,
    confidence: inText && inComp ? "high" : inText ? "medium" : "low",
  };
}

// ---------------------------------------------------------------------------
// Broker-specific partnership patterns
// ---------------------------------------------------------------------------

interface BrokerPartnershipHint {
  issuer: string;
  dealType: BrokerDealInfo["dealType"];
  patterns: RegExp[];
  badgeLabel: string;
  descriptionTemplate: string;
}

const BROKER_PARTNERSHIP_HINTS: Record<string, BrokerPartnershipHint[]> = {
  boursobank: [
    {
      issuer: "iShares",
      dealType: "free",
      patterns: [
        /boursomarkets[^.]{0,40}(?:iShares|BlackRock)/i,
        /(?:iShares|BlackRock)[^.]{0,40}boursomarkets/i,
        /(?:iShares|BlackRock)[^.]{0,40}0\s*[€%]\s*(?:de\s+)?frais/i,
        /boursomarkets[^.]{0,40}0\s*[€%]/i,
      ],
      badgeLabel: "0 EUR frais",
      descriptionTemplate: "BoursoMarkets : ETF iShares (BlackRock) sans frais",
    },
  ],
  fortuneo: [
    {
      issuer: "Amundi",
      dealType: "reimbursed",
      patterns: [
        /(?:1er|premier)\s+ordre[^.]{0,40}Amundi[^.]{0,40}(?:rembours|gratuit|offert)/i,
        /Amundi[^.]{0,40}(?:1er|premier)\s+ordre[^.]{0,40}(?:rembours|gratuit|offert)/i,
      ],
      badgeLabel: "1er ordre offert",
      descriptionTemplate: "1er ordre d'achat ETF Amundi rembourse chaque mois",
    },
    {
      issuer: "Lyxor",
      dealType: "reimbursed",
      patterns: [
        /(?:1er|premier)\s+ordre[^.]{0,40}Lyxor[^.]{0,40}(?:rembours|gratuit|offert)/i,
        /Lyxor[^.]{0,40}(?:1er|premier)\s+ordre[^.]{0,40}(?:rembours|gratuit|offert)/i,
      ],
      badgeLabel: "1er ordre offert",
      descriptionTemplate: "1er ordre d'achat ETF Amundi/Lyxor rembourse chaque mois",
    },
  ],
  "bourse-direct": [
    {
      issuer: "iShares",
      dealType: "capped",
      patterns: [
        /(?:iShares|BlackRock)[^.]{0,40}(?:0[.,]99|max|plafonn)/i,
        /(?:0[.,]99\s*€)[^.]{0,40}(?:iShares|BlackRock)/i,
      ],
      badgeLabel: "Max 0,99 EUR",
      descriptionTemplate: "ETF iShares : frais plafonnes a 0,99 EUR par ordre",
    },
    {
      issuer: "Amundi",
      dealType: "reimbursed",
      patterns: [
        /Amundi[^.]{0,40}(?:rembours|offert)/i,
        /(?:1er|premier)\s+ordre[^.]{0,40}Amundi/i,
      ],
      badgeLabel: "1er ordre offert",
      descriptionTemplate: "1er ordre d'achat ETF Amundi rembourse chaque mois",
    },
    {
      issuer: "BNP Paribas",
      dealType: "capped",
      patterns: [
        /BNP[^.]{0,40}(?:partenaire|frais\s+r[ée]duits|plafonn)/i,
        /(?:partenaire|frais\s+r[ée]duits)[^.]{0,40}BNP/i,
      ],
      badgeLabel: "Partenaire",
      descriptionTemplate: "BNP Paribas Asset Management partenaire de Bourse Direct",
    },
  ],
  "saxo-banque": [
    {
      issuer: "Amundi",
      dealType: "free",
      patterns: [
        /Amundi[^.]{0,60}(?:0\s*[€%]|sans\s+frais|gratuit)/i,
        /(?:0\s*[€%]|sans\s+frais|gratuit)[^.]{0,60}Amundi/i,
        /150\s*ETF[^.]{0,40}(?:Amundi|sans\s+frais)/i,
        /Amundi[^.]{0,40}150\s*ETF/i,
        /s[ée]lection[^.]{0,40}(?:Amundi|sans\s+frais)/i,
      ],
      badgeLabel: "0 EUR frais",
      descriptionTemplate: "ETF Amundi accessibles sans frais de courtage",
    },
    {
      issuer: "Lyxor",
      dealType: "free",
      patterns: [
        /Lyxor[^.]{0,60}(?:0\s*[€%]|sans\s+frais|gratuit)/i,
        /(?:0\s*[€%]|sans\s+frais|gratuit)[^.]{0,60}Lyxor/i,
      ],
      badgeLabel: "0 EUR frais",
      descriptionTemplate: "ETF Amundi/Lyxor accessibles sans frais de courtage",
    },
  ],
};

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

/**
 * Extrait les partenariats ETF structures depuis le texte brut scrape.
 *
 * @param brokerId   ID du courtier
 * @param brokerName Nom affichable du courtier
 * @param text       Texte combine des pages du courtier (HTML strippe)
 * @param compText   Texte combine des sites de comparaison
 */
export function extractBrokerPartnerships(
  brokerId: string,
  brokerName: string,
  text: string,
  compText: string = "",
): ExtractedPartnerships {
  const deals: ExtractedDeal[] = [];
  const seenIssuers = new Set<string>();

  // 1. Broker-specific partnership hints (highest priority)
  const hints = BROKER_PARTNERSHIP_HINTS[brokerId];
  if (hints) {
    for (const hint of hints) {
      const foundInText = hint.patterns.some((p) => has(text, p));
      const foundInComp = hint.patterns.some((p) => has(compText, p));

      if (foundInText || foundInComp) {
        const key = `${hint.issuer}:${hint.dealType}`;
        if (!seenIssuers.has(key)) {
          seenIssuers.add(key);

          // Extract conditions from nearby text
          let conditions: string | undefined;
          for (const cp of CONDITION_PATTERNS) {
            // Search in a window around the pattern match
            for (const p of hint.patterns) {
              const match = new RegExp(p.source, p.flags).exec(text);
              if (match) {
                const window = text.substring(
                  Math.max(0, match.index - 100),
                  Math.min(text.length, match.index + match[0].length + 200),
                );
                const condMatch = new RegExp(cp.source, cp.flags).exec(window);
                if (condMatch) {
                  conditions = condMatch[0].trim();
                  break;
                }
              }
            }
            if (conditions) break;
          }

          deals.push({
            issuer: hint.issuer,
            dealType: hint.dealType,
            confidence: foundInText && foundInComp ? "high" : foundInText ? "medium" : "low",
            badgeLabel: hint.badgeLabel,
            description: hint.descriptionTemplate,
            conditions,
            source: `broker-specific hint for ${brokerId}/${hint.issuer}`,
          });
        }
      }
    }
  }

  // 2. Generic sentence-level extraction (catches new partnerships)
  const sentences = toSentences(text);
  for (const sentence of sentences) {
    const deal = analyzeSentence(sentence, brokerId, brokerName);
    if (deal) {
      const key = `${deal.issuer}:${deal.dealType}`;
      if (!seenIssuers.has(key)) {
        seenIssuers.add(key);
        deals.push(deal);
      }
    }
  }

  // 3. Cross-validate with comparison text to boost confidence
  for (const deal of deals) {
    if (deal.confidence === "medium") {
      const issuerPattern = ISSUER_PATTERNS.find(
        (ip) => ip.issuer === deal.issuer,
      )?.pattern;
      if (issuerPattern && has(compText, issuerPattern)) {
        // Check if comparison site also mentions deal type keywords near issuer
        const compSentences = toSentences(compText);
        for (const cs of compSentences) {
          if (issuerPattern.test(cs)) {
            const hasDealKeyword =
              (deal.dealType === "free" && FREE_KEYWORDS.test(cs)) ||
              (deal.dealType === "capped" && CAPPED_KEYWORDS.test(cs)) ||
              (deal.dealType === "reimbursed" && REIMBURSED_KEYWORDS.test(cs));
            if (hasDealKeyword) {
              deal.confidence = "high";
              deal.source += " + comparison site confirmation";
              break;
            }
          }
        }
      }
    }
  }

  // 4. All-free detection
  const allFreeResult = detectAllFree(text, compText, brokerId);

  return {
    deals,
    allFree: allFreeResult.detected,
    allFreeConfidence: allFreeResult.confidence,
  };
}

/** Liste des emetteurs connus pour les partenariats. */
export const KNOWN_ISSUERS = ISSUER_PATTERNS.map((p) => p.issuer);
