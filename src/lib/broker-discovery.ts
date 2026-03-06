/**
 * Detection dynamique de nouveaux courtiers PEA.
 *
 * Scrape des sites de comparaison financiers francais pour detecter
 * des courtiers proposant le PEA qui ne seraient pas encore dans
 * notre base de donnees (pea-brokers.ts).
 *
 * Quand un nouveau courtier est detecte, on tente de trouver son site
 * officiel et d'en extraire des informations tarifaires basiques pour
 * construire un PeaBroker stub utilisable dans l'app.
 *
 * Se lance en background avec le scraper principal (cache 24h).
 */

import type { PeaBroker, FeeRange } from "@/data/pea-brokers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveredBroker {
  name: string;
  slug: string;
  sourceUrl: string;
  context: string;
  /** URL du site officiel (null si non trouvee) */
  websiteUrl: string | null;
  /** PeaBroker stub construit dynamiquement (null si echec) */
  brokerStub: PeaBroker | null;
}

export interface BrokerDiscoveryResult {
  scannedAt: string;
  newBrokers: DiscoveredBroker[];
  sourcesScraped: number;
  sourcesFailed: number;
}

// ---------------------------------------------------------------------------
// Sources de comparaison
// ---------------------------------------------------------------------------

const DISCOVERY_SOURCES = [
  {
    url: "https://avenuedesinvestisseurs.fr/comprendre-investir-bourse/plan-depargne-en-actions-pea/",
    name: "Avenue des Investisseurs - PEA",
  },
  {
    url: "https://finance-heros.fr/meilleur-pea/",
    name: "Finance Heros - Meilleur PEA",
  },
  {
    url: "https://www.francetransactions.com/bourse/pea/",
    name: "France Transactions - PEA",
  },
  {
    url: "https://www.moneyvox.fr/bourse/pea/comparatif/",
    name: "MoneyVox - Comparatif PEA",
  },
];

// ---------------------------------------------------------------------------
// Known broker aliases
// ---------------------------------------------------------------------------

function getKnownBrokerSlugs(brokers: PeaBroker[]): Set<string> {
  const slugs = new Set<string>();
  for (const b of brokers) {
    slugs.add(normalize(b.name));
    slugs.add(normalize(b.id));
    if (b.id === "boursobank") slugs.add("boursorama");
    if (b.id === "trade-republic") slugs.add("traderepublic");
    if (b.id === "bourse-direct") slugs.add("boursedirect");
    if (b.id === "saxo-banque") slugs.add("saxo");
    if (b.id === "interactive-brokers") slugs.add("ibkr");
    if (b.id === "hello-bank") slugs.add("hellobank");
    if (b.id === "caisse-epargne") slugs.add("caisseepargne");
    if (b.id === "banque-populaire") slugs.add("banquepopulaire");
    if (b.id === "credit-agricole") slugs.add("creditagricole");
    if (b.id === "credit-mutuel") slugs.add("creditmutuel");
    if (b.id === "bnp-paribas") slugs.add("bnp");
    if (b.id === "societe-generale") slugs.add("sg");
  }
  return slugs;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function toSlugId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

const PEA_BROKER_PATTERNS = [
  /(?:PEA|plan\s+d'[ée]pargne\s+en\s+actions?)\s+(?:chez|de|du|avec|par)\s+([A-Z][\w\s&'.!-]{2,30}?)(?:\s*[,:.(]|\s+est|\s+propose|\s+permet)/gi,
  /([A-Z][\w\s&'.!-]{2,30}?)\s+(?:propose|offre|lance)\s+(?:un\s+)?PEA/gi,
  /(?:ouvrir|souscrire)\s+(?:un\s+)?PEA\s+(?:chez|avec)\s+([A-Z][\w\s&'.!-]{2,30}?)(?:\s*[,:.(]|\s+pour)/gi,
  /(?:comparatif|classement|meilleur)\s+PEA[^.]{0,100}?:\s*([^.]{10,200})/gi,
];

const EXCLUDED_WORDS = new Set([
  "france", "europe", "paris", "bruxelles", "amf", "pea", "bourse",
  "actions", "etf", "courtier", "banque", "frais", "comparatif",
  "meilleur", "avis", "guide", "investir",
]);

// URL extraction from comparison page HTML (href attributes near broker name)
const URL_PATTERN = /href="(https?:\/\/[^"]+)"/gi;

function extractBrokerNames(text: string): string[] {
  const names: string[] = [];
  for (const pattern of PEA_BROKER_PATTERNS) {
    const copy = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = copy.exec(text)) !== null) {
      const captured = m[1]?.trim();
      if (!captured || captured.length < 3 || captured.length > 40) continue;
      const parts = captured.split(/[,;]/).map((s) => s.trim());
      for (const part of parts) {
        const cleaned = part.replace(/^\s*(et|ou|and|or)\s+/i, "").trim();
        if (cleaned.length >= 3 && !EXCLUDED_WORDS.has(cleaned.toLowerCase())) {
          names.push(cleaned);
        }
      }
    }
  }
  return [...new Set(names)];
}

/** Try to find the broker's official URL from the raw HTML. */
function findBrokerUrl(rawHtml: string, brokerName: string): string | null {
  const nameLower = brokerName.toLowerCase().replace(/\s+/g, "");
  const copy = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let m;
  while ((m = copy.exec(rawHtml)) !== null) {
    const url = m[1];
    // Check if the URL domain contains the broker name
    try {
      const domain = new URL(url).hostname.toLowerCase().replace(/\./g, "");
      if (domain.includes(nameLower) || nameLower.includes(domain.replace("www", ""))) {
        return url;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#?\w+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Stub builder — construit un PeaBroker minimal pour un courtier decouvert
// ---------------------------------------------------------------------------

const FREE_RANGE: FeeRange = { min: 0, max: 0, unit: "EUR", detail: "Gratuit" };
const UNKNOWN_RANGE: FeeRange = { min: 0, max: 0, unit: "EUR", detail: "Non renseigne" };

/** Tente d'extraire les frais de courtage depuis le contexte textuel. */
function extractBasicFeeInfo(context: string): {
  feeLabel: string;
  minOrder: number;
} {
  // Try to find a fee pattern
  const feeMatch = context.match(/(\d+[.,]\d+)\s*€\s*(?:par\s+ordre|de\s+courtage|frais)/i);
  const pctMatch = context.match(/(\d+[.,]\d+)\s*%\s*(?:de\s+)?(?:courtage|commission|frais)/i);
  const freeMatch = /0\s*[€%]\s*(?:de\s+)?commission|sans\s+frais|gratuit/i.test(context);

  let feeLabel = "Frais non renseignes";
  if (freeMatch) {
    feeLabel = "0 EUR";
  } else if (feeMatch) {
    feeLabel = `${feeMatch[1].replace(",", ".")} EUR/ordre`;
  } else if (pctMatch) {
    feeLabel = `${pctMatch[1]}%`;
  }

  const minMatch = context.match(/(?:minimum|min)\s+(\d+)\s*€/i);
  const minOrder = minMatch ? parseInt(minMatch[1], 10) : 100;

  return { feeLabel, minOrder };
}

function buildBrokerStub(
  name: string,
  slug: string,
  websiteUrl: string | null,
  context: string,
): PeaBroker {
  const { feeLabel, minOrder } = extractBasicFeeInfo(context);
  const url = websiteUrl ?? `https://www.google.com/search?q=${encodeURIComponent(name + " PEA")}`;

  return {
    id: toSlugId(name),
    name,
    type: "courtier",
    website: url,
    peaUrl: url,
    country: "FR",
    regulator: "AMF",

    feeModel: { type: "percentage", rate: 0.005, min: 5 },
    feeShortLabel: feeLabel,
    effectiveMinOrder: minOrder,

    fees: {
      opening: FREE_RANGE,
      custody: UNKNOWN_RANGE,
      orderEuronext: UNKNOWN_RANGE,
      orderOtherEU: null,
      inactivity: UNKNOWN_RANGE,
      transferOut: UNKNOWN_RANGE,
      managementFee: null,
      currencyFee: null,
    },

    features: {
      stockCount: null,
      etfCount: null,
      freeSavingsPlan: false,
      fractionalShares: false,
      cashInterestRate: null,
      peaJeune: false,
      peaPme: false,
      transferIn: true,
      minOrderAmount: minOrder,
      mobileApp: true,
      webPlatform: true,
      advancedTools: false,
      etfPartnerships: null,
    },

    pros: [`Courtier detecte automatiquement depuis ${name}`],
    cons: ["Donnees non verifiees — informations partielles"],
    promotions: [],
    lastChecked: new Date().toISOString().slice(0, 10),
    sources: ["Decouverte automatique via comparateurs financiers"],
    envelopes: ["pea"],
    managedOption: null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function discoverNewPeaBrokers(
  knownBrokers: PeaBroker[],
): Promise<BrokerDiscoveryResult> {
  const knownSlugs = getKnownBrokerSlugs(knownBrokers);
  const discovered = new Map<string, DiscoveredBroker>();
  // Store raw HTML per source for URL extraction
  const rawHtmlBySource = new Map<string, string>();
  let sourcesScraped = 0;
  let sourcesFailed = 0;

  for (const source of DISCOVERY_SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        sourcesFailed++;
        continue;
      }

      const rawHtml = await res.text();
      rawHtmlBySource.set(source.url, rawHtml);
      const text = stripHtml(rawHtml);
      sourcesScraped++;

      const names = extractBrokerNames(text);
      for (const name of names) {
        const slug = normalize(name);
        if (slug.length < 3) continue;
        if (knownSlugs.has(slug)) continue;

        let isKnown = false;
        for (const known of knownSlugs) {
          if (known.includes(slug) || slug.includes(known)) {
            isKnown = true;
            break;
          }
        }
        if (isKnown) continue;

        if (!discovered.has(slug)) {
          const nameIdx = text.toLowerCase().indexOf(name.toLowerCase());
          const context = nameIdx >= 0
            ? text.substring(Math.max(0, nameIdx - 80), nameIdx + name.length + 200).trim()
            : "";

          const websiteUrl = findBrokerUrl(rawHtml, name);

          discovered.set(slug, {
            name,
            slug,
            sourceUrl: source.url,
            context,
            websiteUrl,
            brokerStub: buildBrokerStub(name, slug, websiteUrl, context),
          });
        }
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      sourcesFailed++;
    }
  }

  const result: BrokerDiscoveryResult = {
    scannedAt: new Date().toISOString(),
    newBrokers: [...discovered.values()],
    sourcesScraped,
    sourcesFailed,
  };

  if (result.newBrokers.length > 0) {
    console.info(
      `[BrokerDiscovery] ${result.newBrokers.length} nouveau(x) courtier(s) PEA detecte(s) :`,
      result.newBrokers.map((b) => `${b.name}${b.websiteUrl ? ` (${b.websiteUrl})` : ""}`).join(", "),
    );
  } else {
    console.info(
      `[BrokerDiscovery] Aucun nouveau courtier detecte (${sourcesScraped} sources scannees)`,
    );
  }

  return result;
}
