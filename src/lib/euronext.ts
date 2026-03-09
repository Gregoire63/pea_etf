/**
 * Euronext DataTables API — récupération et classification des ETFs cotés sur XPAR.
 *
 * Ce module est le socle partagé par :
 *  - etf-catalog.ts  → construction dynamique du catalogue PEA
 *  - etf-discovery.ts → endpoint de découverte des ETFs manquants
 *
 * Il n'importe RIEN de etf-catalog.ts (pas de circular dependency).
 */

import type { EtfCategory } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EuronextRawEtf {
  isin: string;
  name: string;
  ticker: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Euronext DataTables API
// ─────────────────────────────────────────────────────────────────────────────

const EURONEXT_URL = "https://live.euronext.com/en/pd/data/track";

const EURONEXT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  Referer: "https://live.euronext.com/en/products/etfs/list",
};

export async function fetchEuronextEtfs(): Promise<EuronextRawEtf[]> {
  const results: EuronextRawEtf[] = [];
  let start = 0;
  const pageSize = 300;
  let total = Infinity;

  while (start < total) {
    const body = new URLSearchParams({
      mics: "XPAR",
      tp: "etf",
      iDisplayStart: String(start),
      iDisplayLength: String(pageSize),
    });

    const res = await fetch(EURONEXT_URL, {
      method: "POST",
      headers: EURONEXT_HEADERS,
      body: body.toString(),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`[Euronext] API error: HTTP ${res.status}`);
      break;
    }

    const json = await res.json();

    // DataTables response format
    total = json.iTotalRecords ?? json.recordsTotal ?? 0;
    const rows: string[][] = json.aaData ?? json.data ?? [];

    for (const row of rows) {
      // row[0] = HTML avec nom et lien, row[1] = ISIN, row[2] = ticker
      const isin = stripHtml(row[1] ?? "").trim();
      const name = extractNameFromHtml(row[0] ?? "");
      const ticker = stripHtml(row[2] ?? "").trim();

      if (isin && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) {
        results.push({ isin, name, ticker });
      }
    }

    start += pageSize;

    // Rate limiting
    if (start < total) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.info(
    `[Euronext] ${results.length}/${total} ETFs récupérés sur XPAR`,
  );
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML helpers
// ─────────────────────────────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function extractNameFromHtml(html: string): string {
  // Pattern: <a ...title="Nom complet">Nom court</a>
  const titleMatch = html.match(/title="([^"]+)"/);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  return stripHtml(html);
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification — patterns d'indices
// ─────────────────────────────────────────────────────────────────────────────

export const INDEX_PATTERNS: Array<{
  pattern: RegExp;
  category: EtfCategory;
  index: string;
}> = [
  // World
  {
    pattern:
      /MSCI\s+World(?!\s+(?:Water|Robot|AI|Tech|Health|Energy|Real|Alt))/i,
    category: "World",
    index: "MSCI World",
  },
  {
    pattern: /FTSE\s+All[- ]World/i,
    category: "World",
    index: "FTSE All-World",
  },
  {
    pattern: /FTSE\s+Developed\s+World/i,
    category: "World",
    index: "FTSE Developed World",
  },
  {
    pattern: /Solactive\s+GBS\s+Developed\s+Markets/i,
    category: "World",
    index: "Solactive GBS Developed Markets",
  },
  {
    pattern: /\bACWI\b(?!\s+IMI)/i,
    category: "World",
    index: "MSCI ACWI",
  },

  // US
  {
    pattern: /S&P\s*500|SP\s*500|S\.?P\.?\s*500|SP5/i,
    category: "US",
    index: "S&P 500",
  },
  {
    pattern: /Nasdaq[- ]?100|NSDQ|NAS100/i,
    category: "US",
    index: "Nasdaq-100",
  },
  { pattern: /MSCI\s+USA/i, category: "US", index: "MSCI USA" },
  { pattern: /Russell\s+2000/i, category: "US", index: "Russell 2000" },
  {
    pattern: /Dow\s+Jones|DJIA\b/i,
    category: "US",
    index: "Dow Jones Industrial",
  },
  {
    pattern: /\bUS(?:A)?\s+(?:Value|Growth|Cons|Qual)/i,
    category: "US",
    index: "MSCI USA",
  },
  {
    pattern: /\bPEA\s+(?:US|USA|S&P|SP)\b/i,
    category: "US",
    index: "S&P 500",
  },

  // Europe
  {
    pattern: /STOXX\s+Europe\s+600/i,
    category: "Europe",
    index: "STOXX Europe 600",
  },
  { pattern: /MSCI\s+Europe/i, category: "Europe", index: "MSCI Europe" },
  {
    pattern: /FTSE\s+Developed\s+Europe/i,
    category: "Europe",
    index: "FTSE Developed Europe",
  },
  {
    pattern: /\bPEA\s+EUROPE\b/i,
    category: "Europe",
    index: "MSCI Europe",
  },
  {
    pattern: /\bEUR\s+CLIM/i,
    category: "Europe",
    index: "MSCI Europe Climate",
  },

  // Eurozone
  { pattern: /MSCI\s+EMU/i, category: "Eurozone", index: "MSCI EMU" },
  {
    pattern: /\bEMU\b(?:\s+ESG)?/i,
    category: "Eurozone",
    index: "MSCI EMU",
  },
  {
    pattern: /EURO\s+STOXX\s+50/i,
    category: "Eurozone",
    index: "EURO STOXX 50",
  },
  {
    pattern: /MSCI\s+Euro(?:zone)?(?:\s|$)/i,
    category: "Eurozone",
    index: "MSCI EMU",
  },

  // France
  { pattern: /CAC\s*40/i, category: "France", index: "CAC 40" },
  {
    pattern: /CAC\s+Mid\s*(?:&\s*Small)?\s*(?:60|190)/i,
    category: "France",
    index: "CAC Mid 60",
  },

  // Emerging
  {
    pattern: /MSCI\s+Emerg/i,
    category: "Emerging",
    index: "MSCI Emerging Markets",
  },
  {
    pattern: /FTSE\s+Emerg/i,
    category: "Emerging",
    index: "FTSE Emerging Markets",
  },
  {
    pattern: /EM\s+Latin\s+America|EM\s+ALAT|ALAT\b/i,
    category: "Emerging",
    index: "MSCI EM Latin America",
  },
  {
    pattern: /\bMSCI\s+EM\b/i,
    category: "Emerging",
    index: "MSCI Emerging Markets",
  },
  {
    pattern: /\bPEA\s+Emerg/i,
    category: "Emerging",
    index: "MSCI Emerging Markets",
  },

  // Asia
  {
    pattern: /MSCI\s+(?:AC\s+)?Asia/i,
    category: "Asia",
    index: "MSCI Emerging Markets Asia",
  },
  {
    pattern: /Pacific\s+(?:ex|Ex)\s+Japan|PAC\s+XJP/i,
    category: "Asia",
    index: "MSCI Pacific ex Japan",
  },
  { pattern: /MSCI\s+India/i, category: "Asia", index: "MSCI India" },
  { pattern: /MSCI\s+Korea/i, category: "Asia", index: "MSCI Korea" },
  {
    pattern: /MSCI\s+China|Chine\b/i,
    category: "Asia",
    index: "MSCI China",
  },

  // Japan
  { pattern: /TOPIX/i, category: "Japan", index: "TOPIX" },
  { pattern: /Nikkei\s*225/i, category: "Japan", index: "Nikkei 225" },
  { pattern: /MSCI\s+Japan/i, category: "Japan", index: "MSCI Japan" },

  // Sector
  {
    pattern: /Health\s*Care/i,
    category: "Sector",
    index: "STOXX Europe 600 Health Care",
  },
  {
    pattern: /Technology/i,
    category: "Sector",
    index: "STOXX Europe 600 Technology",
  },
  {
    pattern: /Banks?\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Banks",
  },
  {
    pattern: /Utilit(?:y|ies)/i,
    category: "Sector",
    index: "STOXX Europe 600 Utilities",
  },
  {
    pattern: /\bEnergy\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Energy",
  },
  {
    pattern: /Real\s+Estate|Immobilier|IMMO\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Real Estate",
  },
  {
    pattern: /Water|AWAT\b/i,
    category: "Sector",
    index: "MSCI ACWI IMI Water ESG",
  },
  {
    pattern: /Robot|AI|Artificial/i,
    category: "Sector",
    index: "MSCI ACWI IMI Robotics & AI ESG",
  },
  {
    pattern: /Clean\s+Energy|Alternative\s+Energy/i,
    category: "Sector",
    index: "World Alternative Energy",
  },
  {
    pattern: /US\s+Tech\s*100/i,
    category: "Sector",
    index: "Solactive ISS ESG US Tech 100",
  },
  {
    pattern: /Cons(?:umer)?\s*St(?:a)?pl/i,
    category: "Sector",
    index: "US Consumer Staples",
  },
  {
    pattern: /Luxe?|Luxury/i,
    category: "Sector",
    index: "S&P Global Luxury",
  },
  {
    pattern: /Telecommunic|Telecom\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Telecommunications",
  },
  {
    pattern: /Industr(?:y|ial|ies)/i,
    category: "Sector",
    index: "STOXX Europe 600 Industrial Goods",
  },
  {
    pattern: /Auto(?:mob)?(?:ile)?s?\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Automobiles",
  },
  {
    pattern: /Insurance/i,
    category: "Sector",
    index: "STOXX Europe 600 Insurance",
  },
  {
    pattern: /Food\s*(?:&\s*)?Bev/i,
    category: "Sector",
    index: "STOXX Europe 600 Food & Beverage",
  },
  {
    pattern: /Media\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Media",
  },
  {
    pattern: /Retail/i,
    category: "Sector",
    index: "STOXX Europe 600 Retail",
  },
  {
    pattern: /Construc(?:tion)?/i,
    category: "Sector",
    index: "STOXX Europe 600 Construction",
  },
  {
    pattern: /Chemicals?\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Chemicals",
  },
  {
    pattern: /Basic\s+Resources?|Materials?\b/i,
    category: "Sector",
    index: "STOXX Europe 600 Basic Resources",
  },
  {
    pattern: /Oil\s*(?:&\s*)?Gas/i,
    category: "Sector",
    index: "STOXX Europe 600 Oil & Gas",
  },
  {
    pattern: /Financ(?:e|ial)/i,
    category: "Sector",
    index: "STOXX Europe 600 Financial Services",
  },
  {
    pattern: /Travel|Tourism|Leisure/i,
    category: "Sector",
    index: "STOXX Europe 600 Travel & Leisure",
  },
  {
    pattern: /Personal\s*(?:&\s*)?Household/i,
    category: "Sector",
    index: "STOXX Europe 600 Personal & Household Goods",
  },
  {
    pattern: /Cyber\s*Security|Cyber\b/i,
    category: "Sector",
    index: "ISE Cyber Security",
  },
  {
    pattern: /Climate\s+(?:Change|Action|Transition)|PAB\b|CTB\b/i,
    category: "World",
    index: "MSCI World Climate",
  },
  {
    pattern: /Smart\s*City|Infra(?:structure)?/i,
    category: "Sector",
    index: "Infrastructure",
  },
  {
    pattern: /Agri(?:culture|business|food)|Food\s+Innovation/i,
    category: "Sector",
    index: "Agribusiness",
  },
  {
    pattern: /Digit(?:al)?(?:isation|ization|al\s+Economy)/i,
    category: "Sector",
    index: "Digital Economy",
  },
  {
    pattern: /Semiconduc/i,
    category: "Sector",
    index: "Semiconductors",
  },
  {
    pattern: /Cloud\s+Comput/i,
    category: "Sector",
    index: "Cloud Computing",
  },
  {
    pattern: /Gaming|Video\s+Games|Esport/i,
    category: "Sector",
    index: "Video Gaming & Esports",
  },
  {
    pattern: /Blockchain|Metaverse|Web3/i,
    category: "Sector",
    index: "Blockchain & Digital Assets",
  },

  // UK
  {
    pattern: /FTSE\s+100\b/i,
    category: "UK",
    index: "FTSE 100",
  },
  { pattern: /MSCI\s+UK\b/i, category: "UK", index: "MSCI UK" },
  {
    pattern: /MSCI\s+United\s+Kingdom/i,
    category: "UK",
    index: "MSCI United Kingdom",
  },

  // Germany
  { pattern: /\bDAX\b/i, category: "Germany", index: "DAX" },
  { pattern: /MSCI\s+Germany/i, category: "Germany", index: "MSCI Germany" },

  // Nordic
  {
    pattern: /MSCI\s+Nordic/i,
    category: "Nordic",
    index: "MSCI Nordic",
  },

  // Country-specific (mapped to closest broad category)
  {
    pattern: /IBEX\s*35/i,
    category: "Eurozone",
    index: "IBEX 35",
  },
  { pattern: /MSCI\s+Spain/i, category: "Eurozone", index: "MSCI Spain" },
  { pattern: /MSCI\s+Italy/i, category: "Eurozone", index: "MSCI Italy" },
  {
    pattern: /FTSE\s+MIB/i,
    category: "Eurozone",
    index: "FTSE MIB",
  },
  { pattern: /MSCI\s+Greece/i, category: "Eurozone", index: "MSCI Greece" },
  {
    pattern: /MSCI\s+Netherl/i,
    category: "Eurozone",
    index: "MSCI Netherlands",
  },
  { pattern: /MSCI\s+Belgium/i, category: "Eurozone", index: "MSCI Belgium" },
  { pattern: /MSCI\s+Austria/i, category: "Eurozone", index: "MSCI Austria" },
  { pattern: /MSCI\s+Ireland/i, category: "Eurozone", index: "MSCI Ireland" },
  { pattern: /MSCI\s+Finland/i, category: "Eurozone", index: "MSCI Finland" },
  {
    pattern: /MSCI\s+Portug/i,
    category: "Eurozone",
    index: "MSCI Portugal",
  },

  // Swiss (non-EU but common on PEA)
  {
    pattern: /\bSMI\b|MSCI\s+Switz|Swiss\b/i,
    category: "Europe",
    index: "MSCI Switzerland",
  },

  // Asia — additional countries
  {
    pattern: /MSCI\s+Taiwan/i,
    category: "Asia",
    index: "MSCI Taiwan",
  },
  {
    pattern: /Hang\s+Seng|HSI\b/i,
    category: "Asia",
    index: "Hang Seng",
  },
  { pattern: /KOSPI/i, category: "Asia", index: "KOSPI" },
  {
    pattern: /MSCI\s+Pacific(?!\s+(?:ex|Ex))/i,
    category: "Asia",
    index: "MSCI Pacific",
  },
  {
    pattern: /MSCI\s+Indonesia/i,
    category: "Asia",
    index: "MSCI Indonesia",
  },
  {
    pattern: /MSCI\s+(?:South\s+East\s+Asia|ASEAN)/i,
    category: "Asia",
    index: "MSCI South East Asia",
  },

  // Africa / Middle East (mapped to Emerging)
  {
    pattern: /MSCI\s+(?:South\s+)?Africa/i,
    category: "Emerging",
    index: "MSCI South Africa",
  },
  {
    pattern: /MSCI\s+(?:EFM|Frontier)/i,
    category: "Emerging",
    index: "MSCI Frontier Markets",
  },
  {
    pattern: /\bPEA\s+(?:Brésil|Brazil)\b/i,
    category: "Emerging",
    index: "MSCI Brazil",
  },
  { pattern: /MSCI\s+Brazil/i, category: "Emerging", index: "MSCI Brazil" },

  // France — additional
  {
    pattern: /SBF\s*120/i,
    category: "France",
    index: "SBF 120",
  },
  {
    pattern: /\bPEA\s+PME\b/i,
    category: "France",
    index: "PEA PME",
  },
  {
    pattern: /CAC\s+Small\b/i,
    category: "France",
    index: "CAC Small",
  },
  {
    pattern: /CAC\s+(?:All[- ]?Tradable|AT)\b/i,
    category: "France",
    index: "CAC All-Tradable",
  },

  // Dividend strategies
  {
    pattern: /Select\s+Divid/i,
    category: "Dividend",
    index: "STOXX Select Dividend",
  },
  {
    pattern: /Divid(?:end)?\s+Aristo/i,
    category: "Dividend",
    index: "S&P Dividend Aristocrats",
  },
  {
    pattern: /High\s+Divid/i,
    category: "Dividend",
    index: "High Dividend Yield",
  },
  {
    pattern: /STOXX.*Divid|Euro.*Divid|Europ.*Divid/i,
    category: "Dividend",
    index: "STOXX Europe Dividend",
  },
  {
    pattern: /Divid(?:end)?(?:s)?\b/i,
    category: "Dividend",
    index: "Dividend Strategy",
  },

  // World ex-regions
  {
    pattern: /World\s+ex\s+Euro/i,
    category: "World",
    index: "MSCI World ex Euro",
  },
  {
    pattern: /World\s+ex\s+US/i,
    category: "World",
    index: "MSCI World ex USA",
  },

  // EURO STOXX variants (not just 50)
  {
    pattern: /EURO\s+STOXX(?!\s+50)/i,
    category: "Eurozone",
    index: "EURO STOXX",
  },
  {
    pattern: /STOXX\s+Europe\s+(?:50|Large|Mid|Small)\b/i,
    category: "Europe",
    index: "STOXX Europe",
  },

  // Value / Growth / Quality / Momentum factors (broad)
  {
    pattern: /\bValue\b/i,
    category: "World",
    index: "MSCI Value",
  },
  {
    pattern: /\bMomentum\b/i,
    category: "World",
    index: "MSCI Momentum",
  },
  {
    pattern: /\bQuality\b/i,
    category: "World",
    index: "MSCI Quality",
  },
  {
    pattern: /\bGrowth\b/i,
    category: "World",
    index: "MSCI Growth",
  },
  {
    pattern: /\bMin(?:imum)?\s*Vol/i,
    category: "World",
    index: "MSCI Minimum Volatility",
  },
  {
    pattern: /\bMulti[- ]?Factor/i,
    category: "World",
    index: "MSCI Multi-Factor",
  },

  // Leveraged
  {
    pattern: /2[xX]\s+Lever|Daily\s+2x|Leveraged/i,
    category: "Leveraged",
    index: "Leveraged",
  },

  // ── Catch-all ESG/SRI Europe patterns ──
  {
    pattern: /\bEuro(?:pe|zone)?\b.*\b(?:ESG|SRI|Net\s*Zero)\b/i,
    category: "Europe",
    index: "MSCI Europe ESG",
  },
  {
    pattern: /\b(?:ESG|SRI|Net\s*Zero)\b.*\bEuro(?:pe|zone)?\b/i,
    category: "Europe",
    index: "MSCI Europe ESG",
  },

  // ── Catch-all: Global/World variants ──
  {
    pattern: /\bGlobal\b(?!\s+(?:Gold|Silver|Commodity|Bond|Aggregate))/i,
    category: "World",
    index: "Global Equity",
  },

  // ── Small/mid cap variants ──
  {
    pattern: /\bEuro(?:pe)?\s+(?:Small|Mid|Sm)\b/i,
    category: "Europe",
    index: "MSCI Europe Small Cap",
  },
  {
    pattern: /\bWorld\s+(?:Small|Mid|Sm)\b/i,
    category: "World",
    index: "MSCI World Small Cap",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PEA eligibility heuristics
// ─────────────────────────────────────────────────────────────────────────────

export const NON_PEA_KEYWORDS = [
  /\bbond/i,
  /\boblig/i,
  /\bOBLI\b/,
  /\bfixed\s+income/i,
  /\bcorporate\b.*\beur\b/i,
  /\bgovernment\b/i,
  /\btreasur/i,
  /\bgold\b/i,
  /\bsilver\b/i,
  /\bcommodit/i,
  /\bmoney\s+market/i,
  /\bmonétaire/i,
  /\bcredit\b/i,
  /\baggregate\b/i,
  /\bibds\b/i,
  /\biboxx\b/i,
  /\bhigh\s+yield/i,
  /\bbtp\b/i,
  /\binfla(?:tion)?-?link/i,
  /\bcrypto/i,
  /\bbitcoin/i,
  /\betherium/i,
  /\bCORP\s+SRI/i,
  /\bHY\s*C/i,
];

export const PEA_KEYWORDS = [/\bPEA\b/];

export const PEA_PROVIDERS = [
  /^Amundi\b/i,
  /^Lyxor\b/i,
  /^BNP\b/i,
  /^iShares\b/i,
  /^Xtrackers\b/i,
  /^SPDR\b/i,
  /^Invesco\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Detection functions
// ─────────────────────────────────────────────────────────────────────────────

export function detectCategory(
  name: string,
): { category: EtfCategory; index: string } {
  for (const { pattern, category, index } of INDEX_PATTERNS) {
    if (pattern.test(name)) {
      return { category, index };
    }
  }
  // Aucun pattern reconnu → catégorie générique.
  // Permet d'inclure automatiquement tout futur ETF PEA
  // sans avoir besoin d'ajouter un pattern.
  return { category: "Other", index: name };
}

/**
 * Categories whose underlying holdings are predominantly EU-based (≥75%)
 * and thus inherently satisfy the PEA equity requirement regardless of
 * the fund's domicile.
 */
const EU_HEAVY_CATEGORIES: ReadonlySet<EtfCategory> = new Set([
  "Eurozone",
  "France",
  "Europe",
  "Germany",
  "Nordic",
]);

export function computePeaConfidence(
  name: string,
  isin: string,
): { confidence: number; reason: string } {
  // Exclusion forte : obligations, matières premières, etc.
  for (const kw of NON_PEA_KEYWORDS) {
    if (kw.test(name)) {
      return {
        confidence: 0,
        reason: `Exclu : actif non-actions (${kw.source})`,
      };
    }
  }

  const { category } = detectCategory(name);
  const hasPeaKeyword = PEA_KEYWORDS.some((p) => p.test(name));
  const hasSwapKeyword = /\bSwap\b/i.test(name);

  // ── IE-domiciled ETFs tracking non-EU indices ──────────────────────────
  // Physical-replication IE ETFs on World/US/Emerging/Japan/Asia indices
  // are NOT PEA-eligible (underlying < 75% EU equities).
  // Only swap-based versions qualify. Detection: "PEA", "Swap", or listed
  // on Euronext Paris by a PEA provider (iShares, Invesco, SPDR have
  // dedicated PEA ranges that all use swap replication).
  const isPeaProvider = PEA_PROVIDERS.some((p) => p.test(name));
  const isKnownCategory = category !== "Other";

  if (
    isin.startsWith("IE") &&
    !EU_HEAVY_CATEGORIES.has(category) &&
    !hasPeaKeyword &&
    !hasSwapKeyword &&
    !isPeaProvider
  ) {
    return {
      confidence: 5,
      reason: `ETF IE sur indice non-UE (${category}) sans mention PEA/Swap — non éligible PEA`,
    };
  }

  let confidence = 30; // Base pour un ETF actions sur Euronext Paris
  const reasons: string[] = [];

  // "PEA" dans le nom → quasi certain
  if (hasPeaKeyword) {
    confidence += 50;
    reasons.push("Mention PEA dans le nom");
  }

  // Provider connu pour PEA (already computed above for IE filter)
  if (isPeaProvider) {
    confidence += 10;
    reasons.push("Provider PEA reconnu");
  }

  // ISIN FR ou LU → domicile UE favorable
  if (isin.startsWith("FR") || isin.startsWith("LU")) {
    confidence += 10;
    reasons.push("Domicile FR/LU");
  } else if (isin.startsWith("IE")) {
    confidence += 5;
    reasons.push("Domicile IE (PEA possible si >75% actions UE)");
  }

  // Catégorie reconnue (indice actions) — "Other" et "Leveraged" n'apportent pas de bonus
  if (isKnownCategory && category !== "Leveraged") {
    confidence += 10;
    reasons.push(`Indice actions reconnu (${category})`);
  }

  // Indice 100% zone euro → presque toujours PEA
  if (EU_HEAVY_CATEGORIES.has(category)) {
    confidence += 10;
    reasons.push("Indice majoritairement UE");
  }

  // ESG/SRI/Climate versions of known indices
  if (/\b(?:ESG|SRI|Climate|Net\s*Zero|PAB|CTB)\b/i.test(name) && isKnownCategory) {
    confidence += 5;
    reasons.push("Variante ESG d'un indice reconnu");
  }

  return {
    confidence: Math.min(100, confidence),
    reason: reasons.join(" · ") || "ETF actions sur Euronext Paris",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers (JustETF → catalog format)
// ─────────────────────────────────────────────────────────────────────────────

export function mapReplication(
  repl: string | undefined,
): "Physical" | "Synthetic" {
  if (!repl) return "Synthetic";
  if (/full\s+replication|physical|optimized\s+sampling/i.test(repl))
    return "Physical";
  return "Synthetic";
}

export function mapDistribution(dist: string | undefined): "ACC" | "DIST" {
  if (!dist) return "ACC";
  if (/distributing/i.test(dist)) return "DIST";
  return "ACC";
}
