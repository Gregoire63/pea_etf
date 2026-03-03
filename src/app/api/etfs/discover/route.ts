/**
 * GET /api/etfs/discover
 *
 * Lance la découverte automatique d'ETFs PEA éligibles sur Euronext Paris
 * et compare avec le catalogue existant pour détecter les manquants.
 *
 * Query params :
 *  - enrich=false  → désactiver l'enrichissement JustETF (plus rapide)
 *  - min=60        → score de confiance PEA minimum (défaut: 40)
 */

import { NextResponse } from "next/server";
import {
  discoverMissingPeaEtfs,
  generateCatalogEntries,
} from "@/lib/etf-discovery";

// Cache en mémoire — la découverte est coûteuse (scraping multi-sources)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
let cached: { data: unknown; timestamp: number } | null = null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const enrichMissing = searchParams.get("enrich") !== "false";
    const minConfidence = parseInt(searchParams.get("min") ?? "40", 10);

    // Servir depuis le cache si possible
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    console.info("[Discovery] Lancement de la découverte ETFs PEA…");
    const result = await discoverMissingPeaEtfs({ enrichMissing, minConfidence });

    // Générer les suggestions de catalogue
    const catalogCode = generateCatalogEntries(result.missingHighConfidence);

    const response = {
      summary: {
        totalEuronext: result.totalEuronext,
        peaCandidates: result.peaCandidates,
        alreadyInCatalog: result.alreadyInCatalog,
        missingHighConfidence: result.missingHighConfidence.length,
        missingMediumConfidence: result.missingMediumConfidence.length,
      },
      missingHighConfidence: result.missingHighConfidence.map((e) => ({
        isin: e.isin,
        name: e.name,
        ticker: e.yahooTicker,
        category: e.category,
        index: e.detectedIndex,
        peaConfidence: e.peaConfidence,
        peaReason: e.peaReason,
        ter: e.justEtfData?.ter ?? null,
        fundSize: e.justEtfData?.fundSizeEur ?? null,
        distribution: e.suggestedEntry?.distribution ?? null,
        replication: e.suggestedEntry?.replication ?? null,
      })),
      missingMediumConfidence: result.missingMediumConfidence.map((e) => ({
        isin: e.isin,
        name: e.name,
        ticker: e.yahooTicker,
        category: e.category,
        peaConfidence: e.peaConfidence,
        peaReason: e.peaReason,
      })),
      catalogCodeSuggestion: catalogCode || null,
      timestamp: result.timestamp,
    };

    cached = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Discovery] Erreur:", error);
    return NextResponse.json(
      { error: "Échec de la découverte ETFs" },
      { status: 500 },
    );
  }
}
