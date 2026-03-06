/**
 * Couche d'accès aux données courtiers.
 *
 * Données de base : src/data/pea-brokers.ts (10 courtiers).
 * Couche dynamique : auto-expiration des promotions + drift scraper (cache 24h).
 *
 * getBrokers() est le point d'entrée async recommandé pour les routes serveur.
 * Les exports sync (ALL_BROKERS, etc.) servent aux composants client.
 */

import { PEA_BROKERS, type PeaBroker, type FeeModel } from "@/data/pea-brokers";
import type { BrokerId } from "@/types/broker";
import type { ExtractedFees, Confidence } from "./broker-fee-extractor";
import type { ExtractedPartnerships } from "./broker-partnership-extractor";
import type { BrokerDiscoveryResult } from "./broker-discovery";

// ─────────────────────────────────────────────────────────────────────────────
// Auto-expiration des promotions
// ─────────────────────────────────────────────────────────────────────────────

function cleanExpiredPromotions(broker: PeaBroker): PeaBroker {
  const now = new Date();
  const activePromos = broker.promotions.filter((p) => {
    if (!p.validUntil) return true; // Pas de date de fin → permanente
    return new Date(p.validUntil) >= now;
  });

  if (activePromos.length === broker.promotions.length) return broker;
  return { ...broker, promotions: activePromos };
}

/** PEA_BROKERS avec promotions expirées retirées (sync, au moment de l'import). */
const PROCESSED_BROKERS: PeaBroker[] = PEA_BROKERS.map(cleanExpiredPromotions);

// ─────────────────────────────────────────────────────────────────────────────
// Listes filtrées (sync, pour composants client)
// ─────────────────────────────────────────────────────────────────────────────

/** Courtiers avec gestion libre (l'utilisateur passe ses ordres). */
export const SELF_DIRECTED_BROKERS: PeaBroker[] = PROCESSED_BROKERS.filter(
  (b) => b.type !== "gestion_pilotee",
);

/** Courtiers en gestion pilotée (Yomoni, Ramify). */
export const MANAGED_BROKERS: PeaBroker[] = PROCESSED_BROKERS.filter(
  (b) => b.type === "gestion_pilotee",
);

/** Tous les courtiers (promotions expirées retirées). */
export const ALL_BROKERS: PeaBroker[] = PROCESSED_BROKERS;

// ─────────────────────────────────────────────────────────────────────────────
// getBrokers() — point d'entrée async (routes serveur, API)
// ─────────────────────────────────────────────────────────────────────────────

export interface BrokerOverride {
  field: string;
  confidence: Confidence;
  oldValue: string;
  newValue: string;
  source: string;
}

export interface BrokerFreshness {
  /** Jours depuis la dernière vérification manuelle */
  daysSinceCheck: number;
  /** true si > 30 jours */
  stale: boolean;
  /** Avertissements du drift scraper (si disponible) */
  driftWarnings: string[];
  /** Overrides appliqués automatiquement (confidence high) */
  overrides: BrokerOverride[];
}

export interface FreshBroker extends PeaBroker {
  freshness: BrokerFreshness;
}

interface ScraperResult {
  driftMap: Map<string, string[]>;
  overrideMap: Map<string, ExtractedFees>;
  partnershipMap: Map<string, ExtractedPartnerships>;
  discovery: BrokerDiscoveryResult | null;
}

const g = globalThis as unknown as {
  __brokerDriftCache?: {
    data: ScraperResult;
    timestamp: number;
  } | null;
  __brokerDriftPending?: Promise<ScraperResult> | null;
};

const DRIFT_CACHE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Retourne les courtiers avec métadonnées de fraîcheur.
 * Lance le scraper en background (cache 24h) pour la détection de drift
 * et l'extraction automatique des frais.
 *
 * Les frais extraits avec confidence "high" sont fusionnés automatiquement.
 * Les frais "medium"/"low" sont reportés dans driftWarnings sans modifier les données.
 */
export async function getBrokers(): Promise<FreshBroker[]> {
  const { driftMap, overrideMap, discovery } = await getScraperResult();
  const now = new Date();

  const results: FreshBroker[] = PROCESSED_BROKERS.map((broker) => {
    const lastChecked = new Date(broker.lastChecked);
    const daysSinceCheck = Math.floor(
      (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60 * 24),
    );

    const extracted = overrideMap.get(broker.id);
    const { merged, overrides, lowConfidenceWarnings } = applyOverrides(broker, extracted);

    const driftWarnings = [
      ...(driftMap.get(broker.id) ?? []),
      ...lowConfidenceWarnings,
    ];

    return {
      ...merged,
      freshness: {
        daysSinceCheck,
        stale: daysSinceCheck > 30,
        driftWarnings,
        overrides,
      },
    };
  });

  // Merge discovered brokers (stubs) into the list
  if (discovery?.newBrokers) {
    const knownIds = new Set(PROCESSED_BROKERS.map((b) => b.id));
    for (const db of discovery.newBrokers) {
      if (db.brokerStub && !knownIds.has(db.brokerStub.id)) {
        knownIds.add(db.brokerStub.id);
        results.push({
          ...db.brokerStub,
          freshness: {
            daysSinceCheck: 0,
            stale: false,
            driftWarnings: ["Courtier decouvert automatiquement — donnees partielles"],
            overrides: [],
          },
        });
      }
    }
  }

  return results;
}

async function getScraperResult(): Promise<ScraperResult> {
  const cached = g.__brokerDriftCache;
  if (cached && Date.now() - cached.timestamp < DRIFT_CACHE_MS) {
    return cached.data;
  }

  // Dédup des requêtes concurrentes
  if (!g.__brokerDriftPending) {
    g.__brokerDriftPending = runDriftScraper().finally(() => {
      g.__brokerDriftPending = null;
    });
  }

  return g.__brokerDriftPending;
}

async function runDriftScraper(): Promise<ScraperResult> {
  const driftMap = new Map<string, string[]>();
  const overrideMap = new Map<string, ExtractedFees>();
  const partnershipMap = new Map<string, ExtractedPartnerships>();

  try {
    const { scrapeAllBrokerPages } = await import("./broker-scraper");
    const { extractBrokerFees } = await import("./broker-fee-extractor");
    const { extractBrokerPartnerships } = await import("./broker-partnership-extractor");
    console.info("[Brokers] Lancement du drift scraper + extraction de frais + partenariats…");
    const results = await scrapeAllBrokerPages(PEA_BROKERS);

    // Build a broker name lookup
    const brokerNames = new Map(PEA_BROKERS.map((b) => [b.id, b.name]));

    for (const result of results) {
      // ── Drift warnings ──
      const warnings = result.drift
        .filter((d) => d.severity === "warning" || d.severity === "critical")
        .map((d) => `${d.field}: ${d.scraped}`);

      if (result.error) {
        warnings.push(`Scraping échoué: ${result.error}`);
      }

      if (warnings.length > 0) {
        driftMap.set(result.brokerId, warnings);
      }

      if (result.combinedText) {
        const compText = result.comparisonFindings
          .map((cf) => cf.fees.join(" ") + " " + cf.managedMentions.join(" "))
          .join(" ");

        // ── Fee extraction ──
        const extracted = extractBrokerFees(result.brokerId, result.combinedText, compText);
        if (Object.keys(extracted).length > 0) {
          overrideMap.set(result.brokerId, extracted);
        }

        // ── Partnership extraction ──
        const partnerships = extractBrokerPartnerships(
          result.brokerId,
          brokerNames.get(result.brokerId) ?? result.brokerId,
          result.combinedText,
          compText,
        );
        if (partnerships.deals.length > 0 || partnerships.allFree) {
          partnershipMap.set(result.brokerId, partnerships);
        }
      }
    }

    const highCount = [...overrideMap.values()].filter((e) =>
      Object.values(e).some((f) => f?.confidence === "high"),
    ).length;
    const partnershipCount = [...partnershipMap.values()].reduce(
      (sum, p) => sum + p.deals.length, 0,
    );
    console.info(
      `[Brokers] Scraper terminé : ${driftMap.size} drift(s), ${overrideMap.size} extraction(s), ${highCount} haute confiance, ${partnershipCount} partenariat(s)`,
    );
  } catch (error) {
    console.error("[Brokers] Drift scraper échoué :", error);
  }

  // ── Broker discovery (run in parallel, non-blocking) ──
  let discovery: BrokerDiscoveryResult | null = null;
  try {
    const { discoverNewPeaBrokers } = await import("./broker-discovery");
    discovery = await discoverNewPeaBrokers(PEA_BROKERS);
  } catch (error) {
    console.error("[Brokers] Broker discovery échoué :", error);
  }

  const scraperResult: ScraperResult = { driftMap, overrideMap, partnershipMap, discovery };
  g.__brokerDriftCache = { data: scraperResult, timestamp: Date.now() };
  return scraperResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Override merging — applique les frais extraits haute confiance
// ─────────────────────────────────────────────────────────────────────────────

function feeModelLabel(m: FeeModel): string {
  switch (m.type) {
    case "free": return "free";
    case "fixed": return `fixed ${m.amount}€`;
    case "percentage": return `${m.rate * 100}% [${m.min ?? 0}€–${m.max ?? "∞"}€]`;
    case "tiered": return `tiered ${m.tiers.map((t) => `≤${t.upTo}€:${t.fee}€`).join("/")}`;
    case "first_free_monthly": return `1st free + ${feeModelLabel(m.afterFirst)}`;
  }
}

function applyOverrides(
  broker: PeaBroker,
  extracted: ExtractedFees | undefined,
): { merged: PeaBroker; overrides: BrokerOverride[]; lowConfidenceWarnings: string[] } {
  if (!extracted) return { merged: broker, overrides: [], lowConfidenceWarnings: [] };

  let merged = { ...broker };
  const overrides: BrokerOverride[] = [];
  const lowConfidenceWarnings: string[] = [];

  // feeModel
  if (extracted.feeModel) {
    if (extracted.feeModel.confidence === "high") {
      overrides.push({
        field: "feeModel",
        confidence: "high",
        oldValue: feeModelLabel(broker.feeModel),
        newValue: feeModelLabel(extracted.feeModel.value),
        source: extracted.feeModel.source,
      });
      merged = { ...merged, feeModel: extracted.feeModel.value };
    } else {
      lowConfidenceWarnings.push(
        `[auto] feeModel: ${feeModelLabel(extracted.feeModel.value)} (${extracted.feeModel.confidence})`,
      );
    }
  }

  // effectiveMinOrder
  if (extracted.effectiveMinOrder) {
    if (extracted.effectiveMinOrder.confidence === "high") {
      overrides.push({
        field: "effectiveMinOrder",
        confidence: "high",
        oldValue: `${broker.effectiveMinOrder}€`,
        newValue: `${extracted.effectiveMinOrder.value}€`,
        source: extracted.effectiveMinOrder.source,
      });
      merged = { ...merged, effectiveMinOrder: extracted.effectiveMinOrder.value };
    } else {
      lowConfidenceWarnings.push(
        `[auto] effectiveMinOrder: ${extracted.effectiveMinOrder.value}€ (${extracted.effectiveMinOrder.confidence})`,
      );
    }
  }

  // feeShortLabel
  if (extracted.feeShortLabel) {
    if (extracted.feeShortLabel.confidence === "high") {
      overrides.push({
        field: "feeShortLabel",
        confidence: "high",
        oldValue: broker.feeShortLabel,
        newValue: extracted.feeShortLabel.value,
        source: extracted.feeShortLabel.source,
      });
      merged = { ...merged, feeShortLabel: extracted.feeShortLabel.value };
    } else {
      lowConfidenceWarnings.push(
        `[auto] feeShortLabel: "${extracted.feeShortLabel.value}" (${extracted.feeShortLabel.confidence})`,
      );
    }
  }

  // etfCount (in features)
  if (extracted.etfCount) {
    if (extracted.etfCount.confidence === "high") {
      overrides.push({
        field: "features.etfCount",
        confidence: "high",
        oldValue: String(broker.features.etfCount ?? "null"),
        newValue: String(extracted.etfCount.value),
        source: extracted.etfCount.source,
      });
      merged = {
        ...merged,
        features: { ...merged.features, etfCount: extracted.etfCount.value },
      };
    } else {
      lowConfidenceWarnings.push(
        `[auto] etfCount: ${extracted.etfCount.value} (${extracted.etfCount.confidence})`,
      );
    }
  }

  return { merged, overrides, lowConfidenceWarnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup
// ─────────────────────────────────────────────────────────────────────────────

export function getBrokerById(id: BrokerId): PeaBroker {
  const broker = PROCESSED_BROKERS.find((b) => b.id === id);
  if (!broker) {
    // Check discovered brokers from cache
    const cached = g.__brokerDriftCache;
    if (cached?.data.discovery?.newBrokers) {
      const discovered = cached.data.discovery.newBrokers.find(
        (db) => db.brokerStub?.id === id,
      );
      if (discovered?.brokerStub) return discovered.brokerStub;
    }
    throw new Error(`Courtier inconnu : ${id}`);
  }
  return broker;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcul des frais
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule les frais pour un FeeModel donné.
 */
function computeFee(model: FeeModel, amount: number, orderIndexInMonth: number): number {
  switch (model.type) {
    case "free":
      return 0;
    case "fixed":
      return model.amount;
    case "percentage": {
      const fee = amount * model.rate;
      return Math.round(Math.min(Math.max(fee, model.min ?? 0), model.max ?? Infinity) * 100) / 100;
    }
    case "tiered": {
      for (const tier of model.tiers) {
        if (amount <= tier.upTo) return tier.fee;
      }
      return model.aboveRate ? Math.round(amount * model.aboveRate * 100) / 100 : model.tiers[model.tiers.length - 1].fee;
    }
    case "first_free_monthly": {
      if (orderIndexInMonth === 0) return 0;
      return computeFee(model.afterFirst, amount, orderIndexInMonth);
    }
  }
}

/**
 * Estime les frais pour un ordre Euronext donné chez un courtier.
 * Le calcul est entièrement data-driven via broker.feeModel.
 *
 * @param broker             PeaBroker depuis pea-brokers.ts
 * @param amount             Montant de l'ordre en EUR
 * @param orderIndexInMonth  Index de l'ordre dans le mois (0-based)
 */
export function estimateTradeFee(
  broker: PeaBroker,
  amount: number,
  orderIndexInMonth: number = 0,
): number {
  // DCA gratuit : si le courtier propose des plans programmés gratuits, le
  // premier ordre du mois (DCA) est à 0 €.
  if (broker.features.freeSavingsPlan && orderIndexInMonth === 0) return 0;
  return computeFee(broker.feeModel, amount, orderIndexInMonth);
}

/**
 * Montant minimum effectif pour un ordre chez un courtier.
 * Data-driven via broker.effectiveMinOrder.
 */
export function getEffectiveMinOrder(broker: PeaBroker): number {
  return broker.effectiveMinOrder;
}

/** Résumé court des frais pour l'affichage dans le sélecteur. Data-driven. */
export function getBrokerFeeLabel(broker: PeaBroker): string {
  return broker.feeShortLabel;
}

/** Le courtier permet la gestion libre (l'utilisateur passe ses ordres). */
export function isSelfDirected(broker: PeaBroker): boolean {
  return broker.type !== "gestion_pilotee";
}

/** Le courtier propose la gestion profilée en option (en plus de la gestion libre). */
export function hasManagedOption(broker: PeaBroker): boolean {
  return broker.managedOption !== null;
}

/**
 * Estime le taux de frais annuels de la gestion profilée (en décimal).
 * Retourne 0 si le courtier ne propose pas de gestion profilée.
 *
 * Pour les frais hybrides (ex: Fortuneo avec frais de performance),
 * on estime un coût moyen raisonnable.
 */
export function estimateManagedFeeRate(broker: PeaBroker): number {
  const opt = broker.managedOption;
  if (!opt) return 0;

  // Frais fixes annuels
  if (opt.annualFee) {
    return ((opt.annualFee.min + opt.annualFee.max) / 2) / 100;
  }

  // Frais uniquement à la performance (ex: Fortuneo) — estimation conservatrice
  // On estime 5 % de perf moyenne × 15 % commission = ~0.75 %/an
  // Plus frais sous-jacents OPCVM ~1.5 %/an
  if (opt.performanceFee) {
    return 0.015 + 0.05 * opt.performanceFee;
  }

  return 0;
}

/**
 * Estime le taux de frais annuels récurrents du courtier (en décimal).
 *
 * Inclut uniquement les frais qui impactent le rendement du portefeuille :
 * - Gestion pilotée : frais de gestion annuels (tout compris)
 * - Droits de garde annuels (si applicables)
 *
 * Les frais de courtage par ordre ne sont PAS inclus ici (déjà visibles
 * dans le plan d'achat mensuel).
 *
 * @returns Taux annuel en décimal (ex: 0.016 pour 1.60 %)
 */

/**
 * Retourne les partenariats extraits dynamiquement par le scraper.
 * Utilisé par broker-partnerships.ts pour fusionner avec les données hardcodées.
 * Retourne une Map vide si le scraper n'a pas encore tourné.
 */
export async function getScrapedPartnerships(): Promise<Map<string, ExtractedPartnerships>> {
  const result = await getScraperResult();
  return result.partnershipMap;
}

/**
 * Retourne les résultats de la découverte de nouveaux courtiers PEA.
 * null si la découverte n'a pas encore tourné ou a échoué.
 */
export async function getBrokerDiscoveryResult(): Promise<BrokerDiscoveryResult | null> {
  const result = await getScraperResult();
  return result.discovery;
}

/**
 * Estime le taux de frais annuels recurrents du courtier (en decimal).
 * Inclut gestion pilotee + droits de garde. Les frais de courtage par ordre
 * ne sont PAS inclus ici.
 */
export function estimateAnnualFeeRate(broker: PeaBroker): number {
  // Gestion pilotée : frais de gestion all-inclusive (Yomoni, Ramify)
  // Uniquement pour les courtiers de type "gestion_pilotee" — les banques en
  // ligne qui proposent une gestion profilée optionnelle ne sont PAS impactées.
  if (broker.type === "gestion_pilotee" && broker.fees.managementFee) {
    const fee = broker.fees.managementFee;
    return ((fee.min + fee.max) / 2) / 100;
  }

  // Droits de garde annuels (si un courtier en applique)
  if (broker.fees.custody.max > 0) {
    return broker.fees.custody.max / 100;
  }

  return 0;
}
