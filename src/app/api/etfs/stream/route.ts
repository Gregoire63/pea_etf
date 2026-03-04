/**
 * SSE streaming endpoint — renvoie les données ETF progressivement par batch de 5.
 *
 * Événements SSE :
 *   - { type: "batch",    etfs: EtfRankedEntry[], progress: number }  → batch partiel (score=0)
 *   - { type: "status",   message: string, progress: number }         → étape en cours
 *   - { type: "complete", etfs: EtfRankedEntry[], progress: 100 }     → données finales scorées
 *   - { type: "error",    message: string }                           → erreur
 */

import { getCachedEtfs, setCachedEtfs } from "@/lib/cache";
import { getCatalog, extractIssuer } from "@/lib/etf-catalog";
import type { BaseCatalogEntry } from "@/lib/etf-catalog";
import { fetchEtfQuote, fetchHistoricalPrices } from "@/lib/yahoo-finance";
import { resolveAllMetadata } from "@/lib/data-resolver";
import { getActiveDealsForIssuer } from "@/lib/broker-partnerships";
import { computeScore, computeDynamicBenchmarks } from "@/lib/scoring";
import type { ScoringInput } from "@/lib/scoring";
import {
  annualizedReturn,
  maxDrawdown as calcMaxDrawdown,
  annualizedVolatility,
  sharpeRatio as calcSharpeRatio,
  ytdReturn as calcYtdReturn,
} from "@/lib/calculations";
import type { EtfRankedEntry, PricePoint } from "@/types/etf";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 10;
const DELAY_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Validation helpers ──────────────────────────────────────────────────────

function clampReturn(v: number | null): number | null {
  if (v === null || !Number.isFinite(v) || v < -0.9 || v > 2.0) return null;
  return v;
}
function clampDrawdown(v: number | null): number | null {
  if (v === null || !Number.isFinite(v) || v > 0 || v < -1) return null;
  return v;
}
function clampVolatility(v: number | null): number | null {
  if (v === null || !Number.isFinite(v) || v < 0 || v > 2.0) return null;
  return v;
}
function clampSharpe(v: number | null): number | null {
  if (v === null || !Number.isFinite(v) || v < -5 || v > 5) return null;
  return v;
}

// ── Build partial entry (score=0, catalog TER) ─────────────────────────────

interface RawEtfData {
  base: BaseCatalogEntry;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: Record<string, any> | null;
  prices: PricePoint[];
}

function buildPartialEntry(raw: RawEtfData): EtfRankedEntry {
  const { base, quote, prices } = raw;

  const rawLongName: string = quote?.longName ?? quote?.shortName ?? "";
  const rawShortName: string = quote?.shortName ?? "";
  const isRedirect = (s: string) => /^\*\*\s*SEE\b/i.test(s);
  const longName =
    isRedirect(rawLongName) || !rawLongName
      ? isRedirect(rawShortName) || !rawShortName
        ? base.yahooTicker
        : rawShortName
      : rawLongName;
  const shortName =
    isRedirect(rawShortName) || !rawShortName
      ? longName.substring(0, 50)
      : rawShortName;

  const r1y = clampReturn(annualizedReturn(prices, 1));
  const r3y = clampReturn(annualizedReturn(prices, 3));
  const r5y = clampReturn(annualizedReturn(prices, 5));
  const r10y = clampReturn(annualizedReturn(prices, 10));
  const mdd = clampDrawdown(prices.length > 0 ? calcMaxDrawdown(prices) : null);
  const vol = clampVolatility(annualizedVolatility(prices));
  const sr = clampSharpe(calcSharpeRatio(r5y ?? r3y ?? r1y, vol));
  const ytd = clampReturn(calcYtdReturn(prices));

  const netAssets = quote?.netAssets as number | undefined;
  const marketCap = quote?.marketCap as number | undefined;
  const yahooAum =
    (netAssets && netAssets > 0 ? netAssets : undefined) ??
    (marketCap && marketCap > 0 ? marketCap : undefined) ??
    null;

  const issuer = extractIssuer(longName);
  const deals = getActiveDealsForIssuer(issuer);

  return {
    isin: base.isin,
    ticker: base.yahooTicker.replace(".PA", ""),
    yahooTicker: base.yahooTicker,
    name: longName,
    shortName,
    issuer,
    ter: base.ter,
    category: base.category,
    distribution: base.distribution,
    replication: base.replication,
    currency: (quote?.currency as string | undefined) ?? "EUR",
    index: base.index,
    launchDate: "",
    leveraged: base.leveraged,
    leverageMultiplier: base.leverageMultiplier,
    currentPrice: (quote?.regularMarketPrice as number | undefined) ?? null,
    aum: yahooAum,
    volume: (quote?.regularMarketVolume as number | undefined) ?? null,
    fiftyTwoWeekHigh: (quote?.fiftyTwoWeekHigh as number | undefined) ?? null,
    fiftyTwoWeekLow: (quote?.fiftyTwoWeekLow as number | undefined) ?? null,
    ytdReturn: ytd,
    return1y: r1y,
    return3y: r3y,
    return5y: r5y,
    return10y: r10y,
    maxDrawdown: mdd,
    sharpeRatio: sr,
    volatility1y: vol,
    lastUpdated: new Date().toISOString(),
    score: 0,
    scoreBreakdown: {
      terScore: 0,
      performanceScore: 0,
      aumScore: 0,
      sharpeScore: 0,
      drawdownScore: 0,
    },
    rank: 0,
    brokerDeals: deals.length > 0 ? deals : undefined,
  };
}

// ── SSE route handler ───────────────────────────────────────────────────────

export async function GET() {
  const cached = getCachedEtfs();
  if (cached) {
    const body = `data: ${JSON.stringify({ type: "complete", etfs: cached, progress: 100 })}\n\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  async function send(data: object) {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      /* stream closed by client */
    }
  }

  // Process in background, stream results
  (async () => {
    try {
      // ── Phase 0 : chargement du catalogue ───────────────────────────────
      await send({
        type: "status",
        step: "catalog",
        message: "Chargement du catalogue ETF éligibles PEA…",
        progress: 2,
      });

      const catalog = await getCatalog();
      const totalBatches = Math.ceil(catalog.length / BATCH_SIZE);
      const allRaw: RawEtfData[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allQuotes = new Map<string, Record<string, any> | null>();

      await send({
        type: "status",
        step: "quotes",
        message: `Récupération des cours en temps réel — 0/${catalog.length} ETF…`,
        progress: 5,
        loaded: 0,
        total: catalog.length,
      });

      // ── Phase 1 : récupération des cours + historiques ─────────────────
      for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
        const batch = catalog.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

        // Fetch quotes + historical prices in parallel for this batch
        const batchResults = await Promise.all(
          batch.map(async (base) => {
            const [quote, prices] = await Promise.all([
              fetchEtfQuote(base.yahooTicker).catch(() => null),
              fetchHistoricalPrices(base.yahooTicker, 5).catch(
                () => [] as PricePoint[]
              ),
            ]);
            return {
              base,
              quote: quote as Record<string, never> | null,
              prices,
            };
          })
        );

        // Build partial entries
        const batchEntries: EtfRankedEntry[] = [];
        for (const raw of batchResults) {
          allRaw.push(raw);
          allQuotes.set(raw.base.yahooTicker, raw.quote);
          if (raw.quote || raw.prices.length > 0) {
            batchEntries.push(buildPartialEntry(raw));
          }
        }

        const loaded = Math.min(i + batch.length, catalog.length);
        const progress = Math.round((loaded / catalog.length) * 80) + 5;
        if (batchEntries.length > 0) {
          await send({
            type: "batch",
            step: "quotes",
            etfs: batchEntries,
            progress,
            loaded,
            total: catalog.length,
            batchIndex,
            totalBatches,
          });
        }

        if (i + BATCH_SIZE < catalog.length) {
          await delay(DELAY_MS);
        }
      }

      // ── Phase 2 : résolution métadonnées (TER, encours, sources) ──────
      await send({
        type: "status",
        step: "metadata",
        message: "Vérification des frais (TER) et encours depuis JustETF…",
        progress: 88,
      });

      const resolvedMap = await resolveAllMetadata({
        catalog,
        yahooQuotes: allQuotes,
      });

      // ── Phase 3 : scoring avec benchmarks dynamiques ──────────────────
      await send({
        type: "status",
        step: "scoring",
        message: "Calcul des scores et classement des ETF…",
        progress: 95,
      });

      const preScoredEntries: {
        entry: EtfRankedEntry;
        input: ScoringInput;
      }[] = [];

      for (const raw of allRaw) {
        if (!raw.quote && raw.prices.length === 0) continue;

        const entry = buildPartialEntry(raw);
        const resolved = resolvedMap.get(raw.base.isin);
        if (resolved) {
          entry.ter = resolved.ter;
          entry.aum = resolved.aum ?? entry.aum;
          entry.dataSources = resolved.sources;
        }

        preScoredEntries.push({
          entry,
          input: {
            ter: entry.ter,
            return5y: entry.return5y,
            return3y: entry.return3y,
            return1y: entry.return1y,
            aum: entry.aum,
            sharpeRatio: entry.sharpeRatio,
            maxDrawdown: entry.maxDrawdown,
            leveraged: entry.leveraged,
          },
        });
      }

      const benchmarks = computeDynamicBenchmarks(
        preScoredEntries.map((e) => e.input)
      );

      const finalEntries: EtfRankedEntry[] = preScoredEntries.map(
        ({ entry, input }) => {
          const { score, breakdown } = computeScore(input, benchmarks);
          return { ...entry, score, scoreBreakdown: breakdown };
        }
      );

      finalEntries.sort((a, b) => b.score - a.score);
      finalEntries.forEach((e, i) => (e.rank = i + 1));

      setCachedEtfs(finalEntries);
      await send({ type: "complete", step: "complete", etfs: finalEntries, progress: 100 });
    } catch (err) {
      console.error("[etfs/stream] Error:", err);
      await send({ type: "error", message: "Erreur lors du chargement des données ETF." });
    } finally {
      try {
        await writer.close();
      } catch {
        /* already closed */
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
