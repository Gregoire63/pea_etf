/**
 * Scraper JustETF — source de référence pour les métadonnées ETF européens.
 *
 * URL : https://www.justetf.com/en/etf-profile.html?isin={ISIN}
 * Données extraites : TER, encours (fund size), nom, domicile.
 *
 * Les valeurs sont normalisées en fraction décimale pour le TER
 * (0.0020 = 0.20 %) et en euros pour l'AUM.
 */

const BASE_URL = "https://www.justetf.com/en/etf-profile.html";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

export interface JustEtfData {
  isin: string;
  /** Nom complet du fonds */
  name?: string;
  /** TER en fraction décimale (ex: 0.0020 pour 0.20 %) */
  ter?: number;
  /** Encours en EUR (ex: 1_200_000_000 pour 1.2 Md) */
  fundSizeEur?: number;
  /** Méthode de réplication : "Full replication" | "Swap based" | "Optimized sampling" */
  replication?: string;
  /** Politique de distribution : "Accumulating" | "Distributing" */
  distribution?: string;
  /** Domicile du fonds */
  domicile?: string;
  /** Erreur si le scraping a échoué */
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de parsing
// ─────────────────────────────────────────────────────────────────────────────

function parsePercentage(text: string): number | undefined {
  // "0.20% p.a." → 0.0020, "0.85%" → 0.0085
  const m = text.match(/([\d,.]+)\s*%/);
  if (!m) return undefined;
  const pct = parseFloat(m[1].replace(",", "."));
  if (isNaN(pct) || pct <= 0) return undefined;
  return pct / 100; // convertir en fraction décimale
}

function parseFundSize(text: string): number | undefined {
  // "EUR 1,201m" → 1_201_000_000, "EUR 5bn" → 5_000_000_000
  // "EUR 234m" → 234_000_000
  const cleaned = text.replace(/,/g, "").trim();

  // Format: "EUR Xbn" ou "EUR Xm"
  const bnMatch = cleaned.match(/([\d.]+)\s*bn/i);
  if (bnMatch) {
    const val = parseFloat(bnMatch[1]);
    return isNaN(val) ? undefined : val * 1_000_000_000;
  }

  const mMatch = cleaned.match(/([\d.]+)\s*m/i);
  if (mMatch) {
    const val = parseFloat(mMatch[1]);
    return isNaN(val) ? undefined : val * 1_000_000;
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scraper principal
// ─────────────────────────────────────────────────────────────────────────────

export async function scrapeJustEtf(isin: string): Promise<JustEtfData> {
  const result: JustEtfData = { isin };
  const url = `${BASE_URL}?isin=${encodeURIComponent(isin)}`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      result.error = `HTTP ${res.status}`;
      return result;
    }

    const html = await res.text();

    // ─── Nom du fonds ──────────────────────────────────────────────────
    // <h1 class="h1">iShares MSCI World Swap PEA UCITS ETF EUR (Acc)</h1>
    const nameMatch = html.match(/<h1[^>]*class="[^"]*h1[^"]*"[^>]*>([^<]+)<\/h1>/i)
      ?? html.match(/<title>([^|<]+)/i);
    if (nameMatch?.[1]) {
      result.name = nameMatch[1].trim();
    }

    // ─── TER ───────────────────────────────────────────────────────────
    // Pattern : "Total expense ratio" suivi du pourcentage
    const terPatterns = [
      /Total\s+expense\s+ratio\s*(?:<[^>]*>)*\s*([\d,.]+\s*%\s*(?:p\.?\s*a\.?)?)/i,
      /TER[^<]*(?:<[^>]*>)*\s*([\d,.]+\s*%)/i,
      /expense\s*ratio[^<]*(?:<[^>]*>)*\s*([\d,.]+\s*%)/i,
      // Variante table : <td>Total expense ratio</td><td>0.25% p.a.</td>
      /Total\s+expense\s+ratio<\/(?:td|th|div|span)>\s*<(?:td|th|div|span)[^>]*>\s*([\d,.]+\s*%[^<]*)/i,
    ];
    for (const pat of terPatterns) {
      const m = html.match(pat);
      if (m?.[1]) {
        const ter = parsePercentage(m[1]);
        // Validation : TER raisonnable pour un ETF (0.01 % à 5 %)
        if (ter !== undefined && ter >= 0.0001 && ter <= 0.05) {
          result.ter = ter;
          break;
        }
      }
    }

    // ─── Fund size (AUM) ───────────────────────────────────────────────
    const fundPatterns = [
      /Fund\s+size\s*(?:<[^>]*>)*\s*(?:EUR|€)\s*([\d,.]+\s*(?:bn|m))/i,
      /Fund\s+size<\/(?:td|th|div|span)>\s*<(?:td|th|div|span)[^>]*>\s*(?:EUR|€)\s*([\d,.]+\s*(?:bn|m))/i,
      /Assets\s+under\s+management\s*(?:<[^>]*>)*\s*(?:EUR|€)\s*([\d,.]+\s*(?:bn|m))/i,
    ];
    for (const pat of fundPatterns) {
      const m = html.match(pat);
      if (m?.[1]) {
        const size = parseFundSize(`EUR ${m[1]}`);
        if (size !== undefined && size > 0) {
          result.fundSizeEur = size;
          break;
        }
      }
    }

    // ─── Réplication ───────────────────────────────────────────────────
    const replPatterns = [
      /Replication[^<]*(?:<[^>]*>)*\s*(Full\s+replication|Swap\s+based|Optimized\s+sampling|Unfunded\s+swap|Funded\s+swap)/i,
      /Replication<\/(?:td|th|div|span)>\s*<(?:td|th|div|span)[^>]*>\s*(Full\s+replication|Swap[^<]*|Optimized[^<]*)/i,
    ];
    for (const pat of replPatterns) {
      const m = html.match(pat);
      if (m?.[1]) {
        result.replication = m[1].trim();
        break;
      }
    }

    // ─── Distribution ──────────────────────────────────────────────────
    if (/Accumulating/i.test(html)) {
      result.distribution = "Accumulating";
    } else if (/Distributing/i.test(html)) {
      result.distribution = "Distributing";
    }

    // ─── Domicile ──────────────────────────────────────────────────────
    const domPatterns = [
      /Fund\s+domicile\s*(?:<[^>]*>)*\s*([A-Z][a-z]+(?:\s+[A-Za-z]+)*)/i,
      /Fund\s+domicile<\/(?:td|th|div|span)>\s*<(?:td|th|div|span)[^>]*>\s*([^<]+)/i,
    ];
    for (const pat of domPatterns) {
      const m = html.match(pat);
      if (m?.[1]) {
        result.domicile = m[1].trim();
        break;
      }
    }

    return result;
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : "Erreur réseau";
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch scraping — respecte le rate-limiting de JustETF
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 12;
const DELAY_MS = 400;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeAllJustEtf(
  isins: string[]
): Promise<Map<string, JustEtfData>> {
  const results = new Map<string, JustEtfData>();

  for (let i = 0; i < isins.length; i += BATCH_SIZE) {
    const batch = isins.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (isin) => {
      const data = await scrapeJustEtf(isin);
      results.set(isin, data);
    });
    await Promise.all(promises);

    if (i + BATCH_SIZE < isins.length) {
      await delay(DELAY_MS);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache in-memory — JustETF change rarement, TTL 7 jours
// globalThis pour survivre au HMR de Turbopack en dev
// ─────────────────────────────────────────────────────────────────────────────

const g = globalThis as unknown as {
  __justEtfCache?: { data: Map<string, JustEtfData>; timestamp: number } | null;
};

const JUSTETF_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAllJustEtfData(
  isins: string[]
): Promise<Map<string, JustEtfData>> {
  const cached = g.__justEtfCache;
  if (cached && Date.now() - cached.timestamp < JUSTETF_CACHE_MS) {
    return cached.data;
  }

  console.info(`[JustETF] Scraping ${isins.length} ETF…`);
  const data = await scrapeAllJustEtf(isins);

  const withTer = [...data.values()].filter((d) => d.ter !== undefined).length;
  const withAum = [...data.values()].filter((d) => d.fundSizeEur !== undefined).length;
  const errors = [...data.values()].filter((d) => d.error).length;
  console.info(
    `[JustETF] Terminé : TER=${withTer}/${isins.length}, AUM=${withAum}/${isins.length}, erreurs=${errors}`
  );

  g.__justEtfCache = { data, timestamp: Date.now() };
  return data;
}
