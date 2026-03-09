import type { PricePoint } from "@/types/etf";

// Note: malgré le rebranding BoursoBank, les pages bourse/trackers
// sont toujours servies depuis boursorama.com
const BASE = "https://www.boursorama.com";

export interface BoursobankQuote {
  price?: number;
  bid?: number;
  ask?: number;
  spreadPercent?: number;
  change1dPercent?: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
}

export interface BoursobankHolding {
  name: string;
  isin?: string;
  weight: number;
}

export interface BoursobankData {
  ticker: string;
  url: string;
  quote?: BoursobankQuote;
  holdings?: BoursobankHolding[];
  trackingError?: number;
  /** TER en fraction décimale (ex: 0.0020 pour 0.20 %), extrait de la fiche tracker */
  ter?: number;
  error?: string;
}

export function getBoursoTicker(ticker: string): string {
  const base = ticker.split(".")[0];
  return `1rT${base.toUpperCase()}`;
}

export function getBoursoUrl(ticker: string): string {
  return `${BASE}/bourse/trackers/cours/${getBoursoTicker(ticker)}/`;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
  "Cache-Control": "no-cache",
};

function parseNum(s: string): number | undefined {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

// Essaie d'extraire un nombre après un pattern regex dans le HTML
function extractNum(html: string, pattern: RegExp): number | undefined {
  const m = html.match(pattern);
  if (!m?.[1]) return undefined;
  return parseNum(m[1]);
}

export async function scrapeBoursobank(ticker: string): Promise<BoursobankData> {
  const url = getBoursoUrl(ticker);
  const result: BoursobankData = { ticker, url };

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      result.error = `HTTP ${res.status}`;
      return result;
    }

    const html = await res.text();

    // ─── 1. __NEXT_DATA__ (si le site utilise Next.js) ───────────────────────
    const nextMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextMatch?.[1]) {
      try {
        const nd = JSON.parse(nextMatch[1]);
        const pageProps =
          nd?.props?.pageProps ??
          nd?.props?.initialProps ??
          nd?.props;

        // Quote
        const q =
          pageProps?.quoteData ??
          pageProps?.quote ??
          pageProps?.security ??
          pageProps?.data?.security;

        if (q) {
          const bid = q.bid ?? q.bidPrice;
          const ask = q.ask ?? q.askPrice;
          result.quote = {
            price: q.lastPrice ?? q.price ?? q.close,
            bid,
            ask,
            change1dPercent: q.changePercent ?? q.variationDay,
            volume: q.volume ?? q.volumeDay,
            open: q.open ?? q.openPrice,
            high: q.high ?? q.highDay,
            low: q.low ?? q.lowDay,
          };
          if (bid && ask) {
            const mid = (bid + ask) / 2;
            result.quote.spreadPercent = mid > 0 ? ((ask - bid) / mid) * 100 : undefined;
          }
        }

        // Composition / holdings
        const comp =
          pageProps?.composition ??
          pageProps?.holdings ??
          pageProps?.data?.composition;

        if (Array.isArray(comp) && comp.length > 0) {
          result.holdings = comp.slice(0, 10).map(
            (h: { name?: string; label?: string; isin?: string; weight?: number; percent?: number }) => ({
              name: h.name ?? h.label ?? "—",
              isin: h.isin,
              weight: h.weight ?? h.percent ?? 0,
            })
          );
        }

        // TER depuis __NEXT_DATA__ si disponible
        if (!result.ter) {
          const rawTer =
            q?.managementFee ?? q?.expenseRatio ?? q?.ter ??
            pageProps?.fundData?.ter ?? pageProps?.fundData?.managementFee;
          if (typeof rawTer === "number" && rawTer > 0) {
            // Boursorama retourne le TER en pourcentage (0.20 = 0.20 %)
            const fraction = rawTer > 0.5 ? rawTer / 100 : rawTer;
            if (fraction >= 0.0001 && fraction <= 0.05) {
              result.ter = fraction;
            }
          }
        }

        if (result.quote || result.holdings || result.ter) return result;
      } catch {
        // Parsing JSON raté → on continue
      }
    }

    // ─── 2. Embedded JSON blobs ────────────────────────────────────────────────
    // Cherche des objets JSON contenant des données de cotation
    const jsonBlobs = html.matchAll(/"lastPrice"\s*:\s*([\d.]+)/g);
    for (const m of jsonBlobs) {
      const price = parseNum(m[1]);
      if (price && price > 0) {
        result.quote = { price };
        break;
      }
    }

    // ─── 3. HTML classique ────────────────────────────────────────────────────
    if (!result.quote) {
      // Prix courant — différents sélecteurs CSS utilisés par Boursorama/Boursobank
      const pricePatterns = [
        /class="[^"]*faceplate__price[^"]*"[^>]*>\s*<[^>]+>\s*([\d\s,.]+)/,
        /class="[^"]*c-instrument__value[^"]*"[^>]*>\s*([\d\s,.]+)/,
        /"lastPrice"\s*:\s*([\d.]+)/,
        /"price"\s*:\s*([\d.]+)/,
        /data-value="([\d.]+)"/,
      ];

      for (const pat of pricePatterns) {
        const price = extractNum(html, pat);
        if (price && price > 0) {
          result.quote = { price };
          break;
        }
      }

      if (result.quote) {
        result.quote.change1dPercent = extractNum(
          html,
          /([+-]?[\d,.]+)\s*%.*variation/i
        );
        result.quote.volume = extractNum(html, /volume[^:]*:\s*([\d\s]+)/i);
      }
    }

    // ─── 4. TER depuis le HTML ─────────────────────────────────────────────────
    if (!result.ter) {
      const terPatterns = [
        /(?:Frais\s+de\s+gestion|Frais\s+courants|Total\s+Expense\s+Ratio|TER)\s*(?:<[^>]*>)*\s*([\d,.]+)\s*%/i,
        /(?:frais|gestion|expense)[^<]*(?:<[^>]*>)*\s*([\d,.]+)\s*%/i,
      ];
      for (const pat of terPatterns) {
        const m = html.match(pat);
        if (m?.[1]) {
          const pct = parseNum(m[1]);
          if (pct !== undefined && pct > 0 && pct < 5) {
            // Convertir en fraction décimale
            result.ter = pct / 100;
            break;
          }
        }
      }
    }

    // ─── 5. Composition depuis le HTML ────────────────────────────────────────
    if (!result.holdings) {
      // Essaie de trouver un tableau de composition
      const holdingPattern =
        /<tr[^>]*>[\s\S]*?<td[^>]*>([\w\s&;-]{3,60})<\/td>[\s\S]*?<td[^>]*>([\d,.]+)\s*%/g;
      const holdings: BoursobankHolding[] = [];
      let hm: RegExpExecArray | null;
      while ((hm = holdingPattern.exec(html)) !== null && holdings.length < 10) {
        const name = hm[1].trim().replace(/&amp;/g, "&");
        const weight = parseNum(hm[2]);
        if (name.length > 2 && weight !== undefined && weight > 0 && weight <= 100) {
          holdings.push({ name, weight });
        }
      }
      if (holdings.length > 0) result.holdings = holdings;
    }

    return result;
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : "Erreur réseau";
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Historical prices fallback (Boursorama chart API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches historical weekly prices from Boursorama's chart endpoint.
 * Used as fallback when Yahoo Finance returns no data (delisted symbols).
 *
 * @param yahooTicker - Ticker in Yahoo format (e.g. "UIMT.PA")
 * @param yearsBack - Number of years of history to fetch (max ~10)
 */
export async function fetchBoursoHistoricalPrices(
  yahooTicker: string,
  yearsBack: number = 5,
): Promise<PricePoint[]> {
  const symbol = getBoursoTicker(yahooTicker);
  // length = nombre de points hebdomadaires (~52 par an)
  const length = Math.min(yearsBack * 52, 520);

  // Endpoint EOD (End of Day) avec period=0 (daily) — on sous-échantillonnera en weekly
  const url = `${BASE}/bourse/action/graph/ws/GetTicksEOD?symbol=${symbol}&length=${length}&period=0&guid=`;

  try {
    const res = await fetch(url, {
      headers: {
        ...HEADERS,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${BASE}/bourse/trackers/cours/${symbol}/`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];

    const json = await res.json();

    // Format: { d: [ { d: "2024-01-15", o: 10.5, h: 11, l: 10, c: 10.8, v: 1234 }, ... ] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ticks: any[] = json?.d ?? [];
    if (!Array.isArray(ticks) || ticks.length === 0) return [];

    // Convertir en PricePoint et sous-échantillonner ~1 point par semaine
    const daily: PricePoint[] = ticks
      .filter((t) => t?.d && typeof t.c === "number" && t.c > 0)
      .map((t) => ({
        date: typeof t.d === "string" ? t.d.split("T")[0] : new Date(t.d).toISOString().split("T")[0],
        close: t.c,
      }));

    if (daily.length === 0) return [];

    // Sous-échantillonnage hebdomadaire : garder 1 point par semaine (le dernier jour)
    const weekly: PricePoint[] = [];
    let lastWeek = -1;
    for (const p of daily) {
      const d = new Date(p.date);
      const week = Math.floor(d.getTime() / (7 * 86_400_000));
      if (week !== lastWeek) {
        weekly.push(p);
        lastWeek = week;
      }
    }

    console.info(`[Boursorama] ${yahooTicker} → ${weekly.length} weekly prices (fallback)`);
    return weekly;
  } catch (e) {
    console.warn(`[Boursorama] Failed to fetch history for ${yahooTicker}:`, e);
    return [];
  }
}
