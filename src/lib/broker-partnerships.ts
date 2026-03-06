/**
 * Mapping structure : emetteur ETF -> offres partenaires courtiers.
 *
 * Architecture double couche :
 *  - Donnees hardcodees (ISSUER_PARTNERSHIPS) : fallback fiable, maintenu manuellement.
 *  - Donnees scrapees dynamiquement (via broker-partnership-extractor.ts) :
 *    fusionnees au runtime avec priorite sur les donnees hardcodees quand la
 *    confiance est haute.
 *
 * Les fonctions sync (getActiveDealsForIssuer, hasReducedFeesForBroker)
 * utilisent uniquement les donnees hardcodees — sures pour les composants client.
 *
 * Les fonctions async (getActiveDealsForIssuerDynamic, hasReducedFeesForBrokerDynamic)
 * fusionnent hardcode + scrape — pour les routes serveur et la strategie portfolio.
 *
 * Utilise par :
 *  - etf-data.ts -> badges dans le tableau de classement
 *  - portfolio-strategy.ts -> bonus de selection par courtier
 */

import type { BrokerDealInfo } from "@/types/etf";
import type { ExtractedPartnerships, ExtractedDeal } from "./broker-partnership-extractor";

// ---------------------------------------------------------------------------
// Donnees hardcodees (fallback)
// ---------------------------------------------------------------------------

interface IssuerDeals {
  issuer: string;
  deals: BrokerDealInfo[];
}

const ISSUER_PARTNERSHIPS: IssuerDeals[] = [
  {
    issuer: "iShares",
    deals: [
      {
        brokerId: "boursobank",
        brokerName: "BoursoBank",
        badgeLabel: "0 \u20ac frais",
        description: "BoursoMarkets : ETF iShares (BlackRock) \u00e0 0 \u20ac de frais \u00e0 l\u2019achat",
        dealType: "free",
        conditions: "Ordre minimum 500 \u20ac (depuis mai 2025)",
        validUntil: null,
      },
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "Max 0,99 \u20ac",
        description: "ETF iShares : frais plafonn\u00e9s \u00e0 0,99 \u20ac par ordre d\u2019achat",
        dealType: "capped",
        conditions: "Sur la s\u00e9lection ETF iShares \u00e9ligibles PEA",
        validUntil: "2026-09-15",
      },
    ],
  },
  {
    issuer: "Amundi",
    deals: [
      {
        brokerId: "fortuneo",
        brokerName: "Fortuneo",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d\u2019achat ETF Amundi rembours\u00e9 chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 800 \u20ac et 100 000 \u20ac",
        validUntil: "2026-03-31",
      },
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d\u2019achat ETF Amundi rembours\u00e9 chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 200 \u20ac et 100 000 \u20ac",
        validUntil: "2026-04-30",
      },
      {
        brokerId: "saxo-banque",
        brokerName: "Saxo Banque",
        badgeLabel: "0 \u20ac frais",
        description: "150 ETF Amundi accessibles sans frais de courtage (partenariat Saxo \u00d7 Amundi)",
        dealType: "free",
        conditions: "Sur la s\u00e9lection de 150 ETF Amundi \u00e9ligibles",
        validUntil: null,
      },
    ],
  },
  {
    // Lyxor est desormais Amundi, mais certains ETF portent encore le nom Lyxor
    issuer: "Lyxor",
    deals: [
      {
        brokerId: "fortuneo",
        brokerName: "Fortuneo",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d\u2019achat ETF Amundi/Lyxor rembours\u00e9 chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 800 \u20ac et 100 000 \u20ac",
        validUntil: "2026-03-31",
      },
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d\u2019achat ETF Amundi/Lyxor rembours\u00e9 chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 200 \u20ac et 100 000 \u20ac",
        validUntil: "2026-04-30",
      },
      {
        brokerId: "saxo-banque",
        brokerName: "Saxo Banque",
        badgeLabel: "0 \u20ac frais",
        description: "ETF Amundi/Lyxor accessibles sans frais de courtage",
        dealType: "free",
        conditions: "Sur la s\u00e9lection de 150 ETF Amundi \u00e9ligibles",
        validUntil: null,
      },
    ],
  },
  {
    issuer: "BNP Paribas",
    deals: [
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "Partenaire",
        description: "BNP Paribas Asset Management partenaire de Bourse Direct",
        dealType: "capped",
        conditions: "Frais r\u00e9duits sur la s\u00e9lection BNP Easy PEA",
        validUntil: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Courtiers "tout gratuit" — hardcoded fallback
// ---------------------------------------------------------------------------

/**
 * IDs des courtiers dont TOUS les ETFs PEA sont sans frais de transaction
 * (via plan programme ou commission 0 %).
 * Donnees hardcodees, completees dynamiquement par le scraper.
 */
const HARDCODED_ALL_FREE: ReadonlySet<string> = new Set([
  "xtb",            // 0 % commission <= 100 000 EUR/mois
  "trade-republic", // 0 EUR via plan d'investissement programme (DCA)
]);

/** Export sync (fallback) — pour composants client. */
export const ALL_FREE_BROKER_IDS: ReadonlySet<string> = HARDCODED_ALL_FREE;

// ---------------------------------------------------------------------------
// Helpers sync (hardcoded only — pour composants client)
// ---------------------------------------------------------------------------

function filterActive(deals: BrokerDealInfo[]): BrokerDealInfo[] {
  const today = new Date().toISOString().slice(0, 10);
  return deals.filter((d) => d.validUntil === null || d.validUntil >= today);
}

/** Retourne les deals actifs (non expires) pour un emetteur donne (sync, hardcoded). */
export function getActiveDealsForIssuer(issuer: string): BrokerDealInfo[] {
  const entry = ISSUER_PARTNERSHIPS.find(
    (p) => p.issuer.toLowerCase() === issuer.toLowerCase(),
  );
  if (!entry) return [];
  return filterActive(entry.deals);
}

/**
 * Verifie si un ETF (par emetteur) beneficie de frais reduits/nuls chez un
 * courtier donne (sync, hardcoded). Retourne le type de deal ou null.
 */
export function hasReducedFeesForBroker(
  issuer: string,
  brokerId: string,
): BrokerDealInfo["dealType"] | "all_free" | null {
  if (HARDCODED_ALL_FREE.has(brokerId)) return "all_free";

  const deals = getActiveDealsForIssuer(issuer).filter(
    (d) => d.brokerId === brokerId,
  );
  if (deals.length === 0) return null;

  return bestDealType(deals);
}

// ---------------------------------------------------------------------------
// Helpers async (hardcoded + scraped — pour routes serveur)
// ---------------------------------------------------------------------------

/**
 * Convertit un ExtractedDeal scrape en BrokerDealInfo.
 */
function scrapedToBrokerDeal(
  deal: ExtractedDeal,
  brokerId: string,
  brokerName: string,
): BrokerDealInfo {
  return {
    brokerId,
    brokerName,
    badgeLabel: deal.badgeLabel,
    description: deal.description,
    dealType: deal.dealType,
    conditions: deal.conditions,
    validUntil: null, // Scraped deals have no expiry — re-scraped next cycle
  };
}

/**
 * Fusionne les deals hardcodes et scrapes pour un emetteur et courtier donnes.
 * Les deals scrapes haute confiance ajoutent de nouveaux partenariats ou
 * mettent a jour les existants. Les medium/low sont ajoutes seulement si
 * aucun deal hardcode n'existe pour cette paire issuer/broker.
 */
function mergeDeals(
  hardcoded: BrokerDealInfo[],
  scraped: ExtractedDeal[],
  brokerId: string,
  brokerName: string,
): BrokerDealInfo[] {
  const result = [...hardcoded];
  const existingKeys = new Set(
    hardcoded.map((d) => `${d.brokerId}:${d.dealType}`),
  );

  for (const sd of scraped) {
    if (sd.confidence === "high") {
      // High confidence: replace or add
      const existingIdx = result.findIndex(
        (d) => d.brokerId === brokerId && d.dealType === sd.dealType,
      );
      const converted = scrapedToBrokerDeal(sd, brokerId, brokerName);
      if (existingIdx >= 0) {
        result[existingIdx] = converted;
      } else {
        result.push(converted);
      }
    } else {
      // Medium/low: only add if no hardcoded deal exists for this broker
      const key = `${brokerId}:${sd.dealType}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        result.push(scrapedToBrokerDeal(sd, brokerId, brokerName));
      }
    }
  }

  return result;
}

function bestDealType(
  deals: BrokerDealInfo[],
): BrokerDealInfo["dealType"] {
  const priority: Record<BrokerDealInfo["dealType"], number> = {
    free: 3,
    capped: 2,
    reimbursed: 1,
  };
  return deals.sort((a, b) => priority[b.dealType] - priority[a.dealType])[0]
    .dealType;
}

// Lazy import to avoid circular dependency (brokers.ts -> broker-partnerships.ts)
let _getScrapedPartnerships: (() => Promise<Map<string, ExtractedPartnerships>>) | null = null;

async function loadScrapedPartnerships(): Promise<Map<string, ExtractedPartnerships>> {
  if (!_getScrapedPartnerships) {
    const mod = await import("./brokers");
    _getScrapedPartnerships = mod.getScrapedPartnerships;
  }
  return _getScrapedPartnerships();
}

/**
 * Retourne les deals actifs pour un emetteur, fusionnes avec les donnees scrapees.
 * Utiliser dans les routes serveur et la strategie portfolio.
 */
export async function getActiveDealsForIssuerDynamic(
  issuer: string,
): Promise<BrokerDealInfo[]> {
  const hardcoded = getActiveDealsForIssuer(issuer);

  let partnershipMap: Map<string, ExtractedPartnerships>;
  try {
    partnershipMap = await loadScrapedPartnerships();
  } catch {
    return hardcoded;
  }

  // Collect scraped deals for this issuer across all brokers
  const allDeals = [...hardcoded];
  const seen = new Set(hardcoded.map((d) => `${d.brokerId}:${d.dealType}`));

  for (const [brokerId, partnerships] of partnershipMap) {
    const issuerDeals = partnerships.deals.filter(
      (d) => d.issuer.toLowerCase() === issuer.toLowerCase(),
    );
    for (const sd of issuerDeals) {
      const key = `${brokerId}:${sd.dealType}`;
      if (sd.confidence === "high" || !seen.has(key)) {
        if (seen.has(key) && sd.confidence === "high") {
          // Replace existing
          const idx = allDeals.findIndex(
            (d) => d.brokerId === brokerId && d.dealType === sd.dealType,
          );
          if (idx >= 0) {
            allDeals[idx] = scrapedToBrokerDeal(sd, brokerId, brokerId);
          }
        } else if (!seen.has(key)) {
          seen.add(key);
          allDeals.push(scrapedToBrokerDeal(sd, brokerId, brokerId));
        }
      }
    }
  }

  return filterActive(allDeals);
}

/**
 * Version dynamique de hasReducedFeesForBroker.
 * Fusionne hardcode + scrape. Utiliser dans les routes serveur.
 */
export async function hasReducedFeesForBrokerDynamic(
  issuer: string,
  brokerId: string,
): Promise<BrokerDealInfo["dealType"] | "all_free" | null> {
  // Check hardcoded all-free first
  if (HARDCODED_ALL_FREE.has(brokerId)) return "all_free";

  // Check scraped all-free
  let partnershipMap: Map<string, ExtractedPartnerships>;
  try {
    partnershipMap = await loadScrapedPartnerships();
  } catch {
    return hasReducedFeesForBroker(issuer, brokerId);
  }

  const partnerships = partnershipMap.get(brokerId);
  if (partnerships?.allFree && partnerships.allFreeConfidence !== "low") {
    return "all_free";
  }

  // Get merged deals for this issuer
  const hardcoded = getActiveDealsForIssuer(issuer).filter(
    (d) => d.brokerId === brokerId,
  );

  const scrapedDeals = partnerships?.deals.filter(
    (d) => d.issuer.toLowerCase() === issuer.toLowerCase(),
  ) ?? [];

  const merged = mergeDeals(hardcoded, scrapedDeals, brokerId, brokerId);
  if (merged.length === 0) return null;

  return bestDealType(merged);
}
