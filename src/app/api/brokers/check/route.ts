/**
 * GET /api/brokers/check
 *
 * Vérifie que les données courtiers sont à jour en scrapant les pages
 * tarifaires officielles. Retourne les extraits trouvés, les alertes
 * et les drifts détectés par rapport aux données stockées.
 *
 * Utilise le scraper v2 avec :
 *   - URLs multiples par courtier (peaUrl + tariffUrl)
 *   - Patterns spécifiques par courtier
 *   - Comparaison automatique stored vs scraped (drift detection)
 */

import { NextResponse } from "next/server";
import { ALL_BROKERS } from "@/lib/brokers";
import { scrapeAllBrokerPages } from "@/lib/broker-scraper";

export const dynamic = "force-dynamic";

// ── Cache en mémoire (1h TTL) ──────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure
let cachedResult: { data: unknown; timestamp: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // Retourner le cache si encore valide
  if (!forceRefresh && cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedResult.data);
  }

  try {
    const results = await scrapeAllBrokerPages(ALL_BROKERS);

    const totalDrifts = results.reduce((sum, r) => sum + r.drift.length, 0);
    const criticalDrifts = results.reduce(
      (sum, r) => sum + r.drift.filter((d) => d.severity === "critical").length,
      0,
    );
    const warningDrifts = results.reduce(
      (sum, r) => sum + r.drift.filter((d) => d.severity === "warning").length,
      0,
    );

    // Résumé gestion profilée
    const managedOptionDetections = results
      .filter((r) => r.findings.managedOption?.detected)
      .map((r) => {
        const broker = ALL_BROKERS.find((b) => b.id === r.brokerId);
        return {
          brokerId: r.brokerId,
          brokerName: broker?.name ?? r.brokerId,
          hasStoredData: broker?.managedOption !== null,
          feeMatch: r.findings.managedOption?.feeMatch ?? null,
          profilesMatch: r.findings.managedOption?.profilesMatch ?? [],
        };
      });

    const summary = {
      checkedAt: new Date().toISOString(),
      brokerCount: ALL_BROKERS.length,
      health: {
        totalDrifts,
        criticalDrifts,
        warningDrifts,
        status:
          criticalDrifts > 0
            ? "critical"
            : warningDrifts > 0
              ? "warning"
              : "ok",
      },
      managedOptions: {
        detected: managedOptionDetections.length,
        brokers: managedOptionDetections,
      },
      results: results.map((r) => {
        const broker = ALL_BROKERS.find((b) => b.id === r.brokerId);
        return {
          brokerId: r.brokerId,
          brokerName: broker?.name ?? r.brokerId,
          urls: r.urls,
          lastStored: broker?.lastChecked ?? null,
          findings: r.findings,
          comparisonFindings: r.comparisonFindings,
          drift: r.drift,
          warnings: r.warnings,
          error: r.error ?? null,
        };
      }),
      errors: results.filter((r) => r.error).map((r) => r.brokerId),
    };

    // Mettre en cache le résultat
    cachedResult = { data: summary, timestamp: Date.now() };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[brokers/check] Error:", error);
    return NextResponse.json(
      { error: "Failed to check broker data" },
      { status: 500 },
    );
  }
}
