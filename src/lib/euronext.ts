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

  // Leveraged
  {
    pattern: /2[xX]\s+Lever|Daily\s+2x|Leveraged/i,
    category: "Leveraged",
    index: "Leveraged",
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
): { category: EtfCategory | null; index: string | null } {
  for (const { pattern, category, index } of INDEX_PATTERNS) {
    if (pattern.test(name)) {
      return { category, index };
    }
  }
  return { category: null, index: null };
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
  // Only swap-based versions (with "PEA" or "Swap" in name) qualify.
  if (
    isin.startsWith("IE") &&
    category &&
    !EU_HEAVY_CATEGORIES.has(category) &&
    !hasPeaKeyword &&
    !hasSwapKeyword
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

  // Provider connu pour PEA
  if (PEA_PROVIDERS.some((p) => p.test(name))) {
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

  // Catégorie reconnue (indice actions)
  if (category && category !== "Leveraged") {
    confidence += 10;
    reasons.push(`Indice actions reconnu (${category})`);
  }

  // Indice 100% zone euro → presque toujours PEA
  if (category && EU_HEAVY_CATEGORIES.has(category)) {
    confidence += 10;
    reasons.push("Indice majoritairement UE");
  }

  // ESG/SRI/Climate versions of known indices
  if (/\b(?:ESG|SRI|Climate|Net\s*Zero|PAB|CTB)\b/i.test(name) && category) {
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
