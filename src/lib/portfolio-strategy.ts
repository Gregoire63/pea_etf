/**
 * Stratégie ETF PEA dynamique — fondée sur TOUS les piliers de l'investissement.
 *
 * Piliers intégrés dans l'algorithme :
 *  1. DIVERSIFICATION géographique & sectorielle (pas d'overlap, 3+ zones)
 *  2. ACC vs DIST selon la phase de vie (capitalisation → ACC, retrait → DIST)
 *  3. CORRÉLATION : slots conçus pour minimiser la corrélation inter-ETFs
 *  4. VOLATILITY DRAG : rendements ajustés de la volatilité (return - vol²/2)
 *  5. AUM & LIQUIDITÉ : ETFs à gros encours préférés (spread + risque fermeture)
 *  6. TER & COÛT TOTAL : pris en compte via le score composite
 *  7. LEVERAGE : pénalité forte (-30%) car le drag quotidien est dévastateur
 *  8. REBALANCING : slots fixes avec poids cibles pour faciliter le rééquilibrage
 *  9. FISCALITÉ PEA 2026 : PS à 18.6%, ACC optimal en capitalisation
 * 10. OVERLAP : World exclut les catégories US pures des slots complémentaires
 *
 * Profils :
 *  - Agressif  : horizon >= 20 ans ET âge <= 50
 *  - Équilibré : horizon >= 10 ans
 *  - Défensif  : horizon < 10 ans (proche de la retraite)
 */

import type { UserProfile } from "@/hooks/use-user-profile";
import type { EtfCategory, EtfRankedEntry } from "@/types/etf";
import type { BrokerId } from "@/types/broker";
import { hasReducedFeesForBroker, ALL_FREE_BROKER_IDS } from "./broker-partnerships";
import { getBrokerById, estimateTradeFee } from "./brokers";

const CURRENT_YEAR = new Date().getFullYear();

/** Score minimum pour qu'un ETF soit proposé dans la stratégie.
 *  En dessous, l'ETF est considéré trop faible (mauvais TER, perf, AUM, Sharpe ou drawdown). */
const MIN_SCORE_THRESHOLD = 40;

export type RiskProfile = "agressif" | "équilibré" | "défensif";
export type EtfRole = "Cœur" | "Complément" | "Satellite";

export interface StrategyEtf {
  isin: string;
  ticker: string;
  shortName: string;
  index: string;
  weight: number; // 0–100
  role: EtfRole;
  reason: string;
}

export interface PortfolioStrategy {
  riskProfile: RiskProfile;
  computedProfile: RiskProfile;
  timeHorizon: number;
  currentAge: number;
  expectedReturnMin: number;
  expectedReturnMax: number;
  rationale: string;
  etfs: StrategyEtf[];
  simplify: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slot : un emplacement dans la stratégie à remplir dynamiquement
// ─────────────────────────────────────────────────────────────────────────────

interface StrategySlot {
  /** Label pour la génération de raisons */
  label: string;
  categories: EtfCategory[];
  /** Préférence de distribution pour ce slot (null = pas de préférence) */
  distribution?: "ACC" | "DIST";
  excludeLeveraged: boolean;
  weight: number;
  role: EtfRole;
  /** ISIN de fallback si aucun ETF scoré n'est trouvé */
  fallbackIsin: string;
  /** Explication détaillée du rôle de diversification de ce slot */
  diversificationReason: string;
  /** Filtrer uniquement les ETFs dont l'index contient l'un de ces termes (case-insensitive) */
  allowedIndices?: string[];
  /** Exclure les ETFs dont l'index contient l'un de ces termes */
  excludeIndices?: string[];
  /** Poids minimum (pour l'optimisation broker) */
  minWeight?: number;
  /** Poids maximum (pour l'optimisation broker) */
  maxWeight?: number;
}

// Rendements de référence long terme par catégorie (nominaux, historiques)
const CATEGORY_HISTORICAL_RETURNS: Partial<Record<EtfCategory, number>> = {
  World: 0.08,
  US: 0.10,
  Europe: 0.07,
  Eurozone: 0.065,
  France: 0.07,
  Emerging: 0.06,
  Asia: 0.065,
  Japan: 0.05,
  Sector: 0.07,
  Leveraged: 0.12,
};

// Volatilités historiques de référence par catégorie (pour le volatility drag)
const CATEGORY_HISTORICAL_VOL: Partial<Record<EtfCategory, number>> = {
  World: 0.15,
  US: 0.16,
  Europe: 0.17,
  Eurozone: 0.18,
  France: 0.19,
  Emerging: 0.22,
  Asia: 0.21,
  Japan: 0.19,
  Sector: 0.20,
  Leveraged: 0.35,
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback catalogue (utilisé uniquement si aucune donnée live n'est fournie)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_ETF: Record<string, { isin: string; ticker: string; shortName: string; index: string }> = {
  WPEA:  { isin: "IE0002XZSHO1", ticker: "WPEA.PA",  shortName: "Amundi MSCI World PEA",              index: "MSCI World" },
  PSP5:  { isin: "FR0011871128", ticker: "PSP5.PA",  shortName: "Amundi PEA S&P 500",                 index: "S&P 500" },
  ETZ:   { isin: "FR0011550193", ticker: "ETZ.PA",   shortName: "Amundi STOXX Europe 600",            index: "STOXX Europe 600" },
  MEUD:  { isin: "FR0007054358", ticker: "MEUD.PA",  shortName: "Amundi EURO STOXX 50 (Distribuant)", index: "EURO STOXX 50" },
  PAEEM: { isin: "FR0013412020", ticker: "PAEEM.PA", shortName: "Amundi MSCI Emerging Markets PEA",   index: "MSCI Emerging Markets" },
  TPXE:  { isin: "FR0011411980", ticker: "TPXE.PA",  shortName: "Amundi PEA Japan TOPIX",             index: "TOPIX" },
  HLT:   { isin: "LU1834986900", ticker: "HLT.PA",   shortName: "Amundi STOXX Europe 600 Health Care", index: "STOXX Europe 600 Health Care" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sélection dynamique : meilleur ETF pour un slot donné
//
// Tient compte de :
//  - Catégorie & distribution (filtre)
//  - Exclusion des leviers (filtre)
//  - Unicité inter-slots (alreadySelected)
//  - Score composite comme critère de classement principal
//  - Bonus ACC (+3 pts) en phase de capitalisation (pilier ACC vs DIST)
// ─────────────────────────────────────────────────────────────────────────────

// ── Score bonus par type de deal courtier ──────────────────────────────────
// free/all_free = 0 € de frais → gros avantage, +5 pts
// capped = frais plafonnés (ex: 0,99 €) → avantage modéré, +3 pts
// reimbursed = 1er ordre remboursé/mois → avantage ponctuel, +2 pts
const BROKER_DEAL_BONUS: Record<string, number> = {
  all_free: 5,
  free: 5,
  capped: 3,
  reimbursed: 2,
};

/** Info sur le deal courtier qui a pu influencer la selection. */
interface SlotSelection {
  etf: EtfRankedEntry;
  /** Type de deal courtier applique (null si aucun) */
  dealType: string | null;
  /** Bonus de score applique grace au deal (0 si aucun) */
  dealBonus: number;
  /** true si sans le deal, un autre ETF aurait ete selectionne */
  dealChangedPick: boolean;
  /** ETF qui aurait ete choisi sans le deal courtier (null si meme ETF) */
  neutralPick: EtfRankedEntry | null;
}

function selectBestForSlot(
  rankedEtfs: EtfRankedEntry[],
  slot: StrategySlot,
  alreadySelected: Set<string>,
  preferAcc: boolean,
  brokerId?: string,
): SlotSelection | null {
  const baseCandidates = rankedEtfs
    .filter((etf) => slot.categories.includes(etf.category))
    .filter((etf) => !slot.excludeLeveraged || !etf.leveraged)
    .filter((etf) => !slot.distribution || etf.distribution === slot.distribution)
    .filter((etf) => !alreadySelected.has(etf.isin))
    .filter((etf) => etf.score >= MIN_SCORE_THRESHOLD)
    .filter((etf) => {
      if (slot.allowedIndices) {
        return slot.allowedIndices.some((t) => etf.index.toLowerCase().includes(t.toLowerCase()));
      }
      return true;
    })
    .filter((etf) => {
      if (slot.excludeIndices) {
        return !slot.excludeIndices.some((t) => etf.index.toLowerCase().includes(t.toLowerCase()));
      }
      return true;
    });

  if (baseCandidates.length === 0) return null;

  // Score sans bonus courtier (pour comparer)
  const neutralScored = baseCandidates
    .map((etf) => {
      let score = etf.score;
      if (preferAcc && !slot.distribution && etf.distribution === "ACC") score += 3;
      return { etf, score };
    })
    .sort((a, b) => b.score - a.score);

  const neutralBest = neutralScored[0].etf;

  // Score avec bonus courtier
  const scored = baseCandidates
    .map((etf) => {
      let adjustedScore = etf.score;
      let dealType: string | null = null;
      let dealBonus = 0;

      if (preferAcc && !slot.distribution) {
        if (etf.distribution === "ACC") adjustedScore += 3;
      }

      if (brokerId) {
        const dt = hasReducedFeesForBroker(etf.issuer, brokerId);
        if (dt) {
          dealType = dt;
          dealBonus = BROKER_DEAL_BONUS[dt] ?? 0;
          adjustedScore += dealBonus;
        }
      }

      return { etf, adjustedScore, dealType, dealBonus };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);

  const best = scored[0];
  const dealChangedPick = best.etf.isin !== neutralBest.isin;

  return {
    etf: best.etf,
    dealType: best.dealType,
    dealBonus: best.dealBonus,
    dealChangedPick,
    neutralPick: dealChangedPick ? neutralBest : null,
  };
}

function etfToStrategy(
  etf: EtfRankedEntry,
  weight: number,
  role: EtfRole,
  reason: string,
): StrategyEtf {
  return {
    isin: etf.isin,
    ticker: etf.yahooTicker ?? etf.ticker,
    shortName: etf.shortName ?? etf.name,
    index: etf.index,
    weight,
    role,
    reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Génération de raisons dynamiques à partir des données réelles
// ─────────────────────────────────────────────────────────────────────────────

function fmtPct(v: number | null): string {
  if (v === null) return "N/A";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

function fmtTer(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtAum(v: number | null): string {
  if (v === null) return "N/A";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md€`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M€`;
  return `${Math.round(v).toLocaleString("fr-FR")} €`;
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  all_free: "0 \u20ac de frais de courtage",
  free: "0 \u20ac de frais de courtage",
  capped: "frais de courtage plafonn\u00e9s",
  reimbursed: "1er ordre rembours\u00e9 chaque mois",
};

function generateBrokerNote(selection: SlotSelection, brokerId?: string): string {
  if (!brokerId || !selection.dealType) return "";

  const dealLabel = DEAL_TYPE_LABELS[selection.dealType] ?? selection.dealType;

  if (selection.dealChangedPick && selection.neutralPick) {
    // Le deal a change la selection — expliquer pourquoi
    const neutral = selection.neutralPick;
    const scoreDiff = selection.etf.score - neutral.score;
    if (scoreDiff < 0) {
      // L'ETF choisi a un score brut inferieur mais est privilegie grace aux frais
      return (
        ` \u2B50 Privil\u00e9gi\u00e9 gr\u00e2ce aux ${dealLabel} chez votre courtier (${selection.etf.issuer}).` +
        ` Sans cet avantage, ${neutral.shortName ?? neutral.name} (score ${neutral.score}/100) aurait \u00e9t\u00e9 choisi,` +
        ` mais l'\u00e9conomie de frais compense la diff\u00e9rence de score (${Math.abs(scoreDiff)} pts).`
      );
    }
    return ` \u2B50 Bonus suppl\u00e9mentaire : ${dealLabel} chez votre courtier (${selection.etf.issuer}).`;
  }

  if (selection.dealType) {
    // Le deal n'a pas change la selection — c'etait deja le meilleur ETF
    return ` \u2B50 Avantage courtier : ${dealLabel} (${selection.etf.issuer}) — c'est aussi le meilleur ETF sur les fondamentaux.`;
  }

  return "";
}

function generateReason(
  etf: EtfRankedEntry,
  role: EtfRole,
  slot: StrategySlot,
  selection?: SlotSelection,
  brokerId?: string,
  brokerOptimized?: boolean,
): string {
  const perf = etf.return5y ?? etf.return3y ?? etf.return1y;
  const perfLabel = etf.return5y !== null ? "5 ans" : etf.return3y !== null ? "3 ans" : "1 an";
  const divReason = slot.diversificationReason;

  // Note ACC/DIST
  const distNote = etf.distribution === "DIST"
    ? " Distribuant \u2014 dividendes vers\u00e9s en cash pour pr\u00e9parer le retrait."
    : etf.distribution === "ACC"
    ? " Capitalisant \u2014 dividendes r\u00e9investis automatiquement (optimal en phase d'\u00e9pargne)."
    : "";

  // Note courtier
  const brokerNote = selection ? generateBrokerNote(selection, brokerId) : "";

  if (role === "C\u0153ur") {
    const parts = [
      `Meilleur score (${etf.score}/100) parmi les ETF ${slot.label}`,
      `TER ${fmtTer(etf.ter)}`,
    ];
    if (perf !== null) parts.push(`rendement ${perfLabel} ${fmtPct(perf)}`);
    if (etf.aum !== null) parts.push(`encours ${fmtAum(etf.aum)}`);
    return parts.join(", ") + "." + distNote + brokerNote + " " + divReason;
  }

  if (role === "Compl\u00e9ment") {
    const parts: string[] = [divReason];
    parts.push(`Score ${etf.score}/100, TER ${fmtTer(etf.ter)}`);
    if (perf !== null) parts.push(`perf. ${perfLabel} : ${fmtPct(perf)}`);
    return parts.join(". ") + "." + distNote + brokerNote;
  }

  // Satellite
  const parts: string[] = [divReason];
  parts.push(`Score ${etf.score}/100`);
  if (perf !== null) parts.push(`${fmtPct(perf)} sur ${perfLabel}`);
  return parts.join(". ") + "." + distNote + brokerNote;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcul du rendement attendu pondéré avec ajustement volatilité
//
// Formule : rendement_composé_réel ≈ rendement_arithmétique - (volatilité² / 2)
// Cela corrige le "volatility drag" qui fait que le rendement réel composé
// est toujours inférieur au rendement arithmétique moyen.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estime le coût annuel de transaction (en fraction du capital) pour un ETF
 * chez un courtier donné. Basé sur 12 ordres/an (DCA mensuel).
 *
 * @param monthlyAmount  Montant investi par mois sur cet ETF (en €)
 * @param brokerId       ID du courtier sélectionné
 * @param issuer         Émetteur de l'ETF (pour les deals partenaires)
 * @param capitalEstimate Capital estimé dans cet ETF (pour calculer le taux)
 */
function estimateAnnualTxCostRate(
  monthlyAmount: number,
  brokerId: string | undefined,
  issuer: string,
  capitalEstimate: number,
): number {
  if (!brokerId || capitalEstimate <= 0) return 0;

  // Courtiers tout-gratuit : 0 frais
  if (ALL_FREE_BROKER_IDS.has(brokerId)) return 0;

  // Deal partenaire actif → frais réduits/nuls
  const dealType = hasReducedFeesForBroker(issuer, brokerId);
  if (dealType === "free" || dealType === "all_free") return 0;
  // "reimbursed" → 1 ordre gratuit/mois, le seul ordre DCA = gratuit
  if (dealType === "reimbursed") return 0;

  // Calcul réel via le modèle de frais du courtier
  try {
    const broker = getBrokerById(brokerId as BrokerId);
    const feePerOrder = estimateTradeFee(broker, monthlyAmount, 0);
    const annualFees = feePerOrder * 12;
    return capitalEstimate > 0 ? annualFees / capitalEstimate : 0;
  } catch {
    return 0;
  }
}

function computeWeightedReturn(
  etfs: Array<{ etf: EtfRankedEntry; weight: number }>,
  monthlyInvestment?: number,
  brokerId?: string,
): { min: number; max: number } {
  let weightedReturn = 0;
  let weightedTer = 0;
  let weightedVolDrag = 0;
  let weightedTxCost = 0;
  let totalWeight = 0;

  for (const { etf, weight } of etfs) {
    const w = weight / 100;
    const perf = etf.return5y ?? etf.return3y ?? etf.return1y ?? (CATEGORY_HISTORICAL_RETURNS[etf.category] ?? 0.07);
    const vol = etf.volatility1y ?? (CATEGORY_HISTORICAL_VOL[etf.category] ?? 0.15);
    weightedReturn += perf * w;
    weightedTer += etf.ter * w;
    // Volatility drag : vol²/2, plafonné à la moitié du rendement
    weightedVolDrag += Math.min((vol * vol) / 2, Math.abs(perf) * 0.5) * w;

    // Frais de transaction annuels estimés (si courtier sélectionné)
    if (monthlyInvestment && brokerId) {
      const monthlyAmount = monthlyInvestment * w;
      // Capital estimé après 1 an (approximation simple)
      const capitalEstimate = monthlyAmount * 12;
      weightedTxCost += estimateAnnualTxCostRate(
        monthlyAmount, brokerId, etf.issuer, capitalEstimate,
      ) * w;
    }

    totalWeight += w;
  }

  if (totalWeight === 0) return { min: 0.06, max: 0.08 };

  // Rendement net = rendement brut - TER - frais de transaction - volatility drag
  const netReturn = weightedReturn - weightedTer - weightedTxCost;
  // Le rendement réel composé est encore réduit par le volatility drag
  const compoundReturn = netReturn - weightedVolDrag;

  // Fourchette : le min est le rendement composé (réaliste), le max est le rendement net (optimiste)
  const min = Math.max(0.03, compoundReturn);
  const max = Math.min(0.15, netReturn + 0.01);

  return {
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcul du profil automatique
// ─────────────────────────────────────────────────────────────────────────────

export function computeRiskProfile(profile: UserProfile): RiskProfile {
  const currentAge = CURRENT_YEAR - profile.birthYear;
  const timeHorizon = profile.retirementAge - currentAge;
  if (timeHorizon >= 20 && currentAge <= 50) return "agressif";
  if (timeHorizon >= 10) return "équilibré";
  return "défensif";
}

/**
 * Détermine si le portefeuille doit être simplifié (moins de positions).
 *
 * Logique : si les frais de courtage dépassent ~2% du montant mensuel investi,
 * il vaut mieux réduire le nombre de positions pour limiter le coût.
 * Un courtier sans frais (Trade Republic, XTB) permet de diversifier
 * même avec un petit budget.
 *
 * @param monthlyInvestment Montant mensuel en €
 * @param brokerId ID du courtier (null = seuil par défaut 200€)
 * @param nbSlots Nombre de positions cibles (5 en standard)
 */
function shouldSimplify(
  monthlyInvestment: number,
  brokerId?: string,
  nbSlots = 5,
): boolean {
  // Sans courtier connu, seuil conservateur
  if (!brokerId) return monthlyInvestment < 200;

  // Courtiers tout-gratuit : on peut diversifier même avec peu
  if (ALL_FREE_BROKER_IDS.has(brokerId)) {
    return monthlyInvestment < 50;
  }

  // Estimer le coût par ordre chez ce courtier
  try {
    const broker = getBrokerById(brokerId as BrokerId);
    const avgOrderAmount = monthlyInvestment / nbSlots;
    const feePerOrder = estimateTradeFee(broker, avgOrderAmount, 0);
    const totalMonthlyFees = feePerOrder * nbSlots;
    const feeRatio = totalMonthlyFees / monthlyInvestment;

    // Si les frais > 2% du montant investi, simplifier
    // Si frais > 5%, on simplifie à 1-2 positions
    if (feeRatio > 0.05) return true;
    if (feeRatio > 0.02) return true;

    return false;
  } catch {
    return monthlyInvestment < 200;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Définition des slots par profil — clé de la diversification
//
// Principes de construction (issus du guide expert) :
//  - Au minimum 3 zones géographiques distinctes (standard)
//  - Aucune zone > 35% du portefeuille dans les allocations explicites
//  - World + Émergents = combinaison de base (corrélation ~0.70)
//  - Europe + Asie/Japon = diversification complémentaire (corrélation ~0.50)
//  - Sectoriel défensif = amortisseur de crises (corrélation ~0.70 avec World)
//  - ACC en phase de capitalisation, DIST en phase de retrait
//  - Pas d'ETF US pur si World est le cœur (overlap > 60%)
// ─────────────────────────────────────────────────────────────────────────────

// Secteurs défensifs : faible beta, résistent aux récessions
const DEFENSIVE_SECTOR_INDICES = ["health", "utilities", "consumer staples", "water", "stapl"];
// Secteurs cycliques : proscrits des slots défensifs
const CYCLICAL_SECTOR_INDICES = ["bank", "technolog", "energy", "real estate", "immob", "luxu", "robot", "ai"];

function getSlots(riskProfile: RiskProfile, simplify: boolean): StrategySlot[] {
  if (riskProfile === "agressif") {
    return simplify
      ? [
          {
            label: "Monde", categories: ["World"], excludeLeveraged: true, distribution: "ACC",
            weight: 80, role: "Cœur", fallbackIsin: "IE0002XZSHO1",
            minWeight: 70, maxWeight: 85,
            diversificationReason: "Base mondiale : 1 500+ entreprises, 23 pays développés, 11 secteurs en un seul ETF. Capitalisant pour maximiser les intérêts composés.",
          },
          {
            label: "Émergents", categories: ["Emerging"], excludeLeveraged: true, distribution: "ACC",
            weight: 20, role: "Complément", fallbackIsin: "FR0013412020",
            minWeight: 15, maxWeight: 30,
            diversificationReason: "Couvre les marchés absents du MSCI World (Chine, Inde, Brésil) — 40% du PIB mondial, corrélation modérée (~0.65) avec les pays développés.",
          },
        ]
      : [
          {
            label: "Monde", categories: ["World"], excludeLeveraged: true, distribution: "ACC",
            weight: 50, role: "Cœur", fallbackIsin: "IE0002XZSHO1",
            minWeight: 40, maxWeight: 60,
            diversificationReason: "Socle diversifié : 1 500+ entreprises dans 23 pays développés couvrant 11 secteurs GICS. ACC = réinvestissement automatique des dividendes.",
          },
          {
            label: "Émergents", categories: ["Emerging"], excludeLeveraged: true, distribution: "ACC",
            weight: 20, role: "Complément", fallbackIsin: "FR0013412020",
            minWeight: 10, maxWeight: 25,
            diversificationReason: "Diversification géographique clé : marchés absents du World (Chine, Inde, Brésil), ~40% du PIB mondial, corrélation modérée (~0.65) avec les développés. Valorisations attractives (P/E ~12x vs ~22x US).",
          },
          {
            label: "Europe Large", categories: ["Europe", "Eurozone"], excludeLeveraged: true, distribution: "ACC",
            weight: 15, role: "Complément", fallbackIsin: "FR0011550193",
            minWeight: 10, maxWeight: 25,
            diversificationReason: "Renforce l'Europe sous-représentée dans le World (~20%). Valorisations attractives (P/E ~14 vs ~22 US), dividendes plus élevés (~3% vs ~1.5% US), secteurs forts : luxe, pharma, industrie.",
          },
          {
            label: "Asie / Japon", categories: ["Japan", "Asia"], excludeLeveraged: true, distribution: "ACC",
            weight: 10, role: "Satellite", fallbackIsin: "FR0011411980",
            minWeight: 5, maxWeight: 15,
            diversificationReason: "Faible corrélation avec les marchés US/Europe (~0.50). Le Japon est la 4e économie mondiale avec des réformes de gouvernance en cours (Tokyo Stock Exchange). Décorrélation structurelle bénéfique pour le portefeuille.",
          },
          {
            label: "Sectoriel défensif", categories: ["Sector"], excludeLeveraged: true, distribution: "ACC",
            weight: 5, role: "Satellite", fallbackIsin: "LU1834986900",
            minWeight: 3, maxWeight: 10,
            allowedIndices: DEFENSIVE_SECTOR_INDICES,
            excludeIndices: CYCLICAL_SECTOR_INDICES,
            diversificationReason: "Secteur défensif (santé, utilities) : résiste aux récessions, décorrélé de la tech (~0.70 avec le World), amortit les chocs du marché. Protection en cas de bear market.",
          },
        ];
  }

  if (riskProfile === "équilibré") {
    return simplify
      ? [
          {
            label: "Monde", categories: ["World"], excludeLeveraged: true, distribution: "ACC",
            weight: 100, role: "Cœur", fallbackIsin: "IE0002XZSHO1",
            minWeight: 100, maxWeight: 100,
            diversificationReason: "Un seul ETF ACC couvrant 1 500+ entreprises dans 23 pays et 11 secteurs — le meilleur compromis coût/diversification pour les petits versements. Les dividendes sont automatiquement réinvestis.",
          },
        ]
      : [
          {
            label: "Monde", categories: ["World"], excludeLeveraged: true, distribution: "ACC",
            weight: 50, role: "Cœur", fallbackIsin: "IE0002XZSHO1",
            minWeight: 40, maxWeight: 60,
            diversificationReason: "Socle mondial diversifié sur 23 pays développés et 11 secteurs GICS. ACC = capitalisation optimale sans friction de réinvestissement.",
          },
          {
            label: "Europe Large", categories: ["Europe", "Eurozone"], excludeLeveraged: true, distribution: "ACC",
            weight: 20, role: "Complément", fallbackIsin: "FR0011550193",
            minWeight: 10, maxWeight: 25,
            diversificationReason: "Réduit la dépendance aux US (~70% du World). Valorisations européennes attractives, dividendes plus élevés (~3% vs ~1.5% US). Pas de risque de change sur la part EUR.",
          },
          {
            label: "Émergents", categories: ["Emerging"], excludeLeveraged: true, distribution: "ACC",
            weight: 15, role: "Complément", fallbackIsin: "FR0013412020",
            minWeight: 10, maxWeight: 20,
            diversificationReason: "Couverture des marchés en forte croissance (Inde, Asie du Sud-Est), absents du MSCI World. Corrélation modérée (~0.65) → réduit la volatilité globale du portefeuille.",
          },
          {
            label: "Zone Euro / France dividendes", categories: ["Eurozone", "France"], excludeLeveraged: true,
            weight: 10, role: "Satellite", fallbackIsin: "FR0007054358",
            minWeight: 5, maxWeight: 15,
            diversificationReason: "Ancrage local zone euro, exposition aux champions européens (LVMH, TotalEnergies, SAP). Pas de risque de change, complément de revenus via dividendes pour les ETFs DIST.",
          },
          {
            label: "Sectoriel défensif", categories: ["Sector"], excludeLeveraged: true, distribution: "ACC",
            weight: 5, role: "Satellite", fallbackIsin: "LU1834986900",
            minWeight: 3, maxWeight: 10,
            allowedIndices: DEFENSIVE_SECTOR_INDICES,
            excludeIndices: CYCLICAL_SECTOR_INDICES,
            diversificationReason: "Protection sectorielle : santé ou utilities résistent aux récessions et sont faiblement corrélés aux indices larges. Amortisseur en cas de crise.",
          },
        ];
  }

  // ── Défensif ──────────────────────────────────────────────────────────────
  // Pilier ACC vs DIST : le profil défensif est le seul qui privilégie DIST
  // pour préparer la phase de retrait. Les dividendes en cash évitent de
  // vendre des parts en marché baissier (risque de séquence de rendements).
  return simplify
    ? [
        {
          label: "Monde", categories: ["World"], excludeLeveraged: true, distribution: "ACC",
          weight: 60, role: "Cœur", fallbackIsin: "IE0002XZSHO1",
          minWeight: 50, maxWeight: 70,
          diversificationReason: "Base mondiale diversifiée pour protéger contre l'inflation et le risque pays, même proche de la retraite. ACC maintenu pour le cœur car l'horizon résiduel reste > 5 ans.",
        },
        {
          label: "Zone Euro dividendes", categories: ["Eurozone"], excludeLeveraged: true, distribution: "DIST",
          weight: 40, role: "Complément", fallbackIsin: "FR0007054358",
          minWeight: 30, maxWeight: 50,
          diversificationReason: "ETF distribuant : dividendes versés en cash chaque trimestre. Prépare la phase de rente avec des revenus réguliers en euros, sans risque de change. Évite de vendre en marché baissier (risque de séquence).",
        },
      ]
    : [
        {
          label: "Monde", categories: ["World"], excludeLeveraged: true, distribution: "ACC",
          weight: 40, role: "Cœur", fallbackIsin: "IE0002XZSHO1",
          minWeight: 35, maxWeight: 50,
          diversificationReason: "Socle mondial même en profil défensif — diversification géographique et sectorielle indispensable. ACC conservé car le capital continue de croître.",
        },
        {
          label: "Europe Large", categories: ["Europe", "Eurozone"], excludeLeveraged: true, distribution: "ACC",
          weight: 20, role: "Complément", fallbackIsin: "FR0011550193",
          minWeight: 15, maxWeight: 25,
          diversificationReason: "Large exposition européenne à volatilité modérée. 600 entreprises, 17 pays. Pas de risque de change, complète les 50 titres de l'EURO STOXX. Volatilité historiquement plus faible qu'un indice mondial.",
        },
        {
          label: "Zone Euro dividendes", categories: ["Eurozone"], excludeLeveraged: true, distribution: "DIST",
          weight: 20, role: "Complément", fallbackIsin: "FR0007054358",
          minWeight: 15, maxWeight: 25,
          diversificationReason: "Distribuant — dividendes en cash trimestriels. Prépare le passage en phase de rente. Permet de recevoir des revenus réguliers sans vendre de parts (protection contre le risque de séquence de rendements).",
        },
        {
          label: "Sectoriel défensif", categories: ["Sector"], excludeLeveraged: true, distribution: "ACC",
          weight: 10, role: "Satellite", fallbackIsin: "LU1834986900",
          minWeight: 5, maxWeight: 15,
          allowedIndices: DEFENSIVE_SECTOR_INDICES,
          excludeIndices: CYCLICAL_SECTOR_INDICES,
          diversificationReason: "Secteur santé ou utilities : amortisseur de crises par excellence. Performance stable même en récession, faible corrélation avec les marchés cycliques. Réduit le max drawdown du portefeuille global.",
        },
        {
          label: "Émergents", categories: ["Emerging"], excludeLeveraged: true, distribution: "ACC",
          weight: 10, role: "Satellite", fallbackIsin: "FR0013412020",
          minWeight: 5, maxWeight: 15,
          diversificationReason: "Même à horizon court, 10% d'émergents protège contre l'inflation et capte la croissance mondiale. Position modeste = impact volatilité limité sur le portefeuille global.",
        },
      ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimisation dynamique des poids selon le courtier et les données live
//
// Calcule un ratio d'efficacité coût/rendement pour chaque slot :
//   efficiency = (rendement_attendu - TER - frais_courtier) / volatilité
// Puis ajuste les poids vers les slots les plus efficients (dans les bornes).
// ─────────────────────────────────────────────────────────────────────────────

interface SlotWithEtf {
  slot: StrategySlot;
  selection: SlotSelection;
}

function optimizeWeightsForBroker(
  filledSlots: SlotWithEtf[],
  monthlyInvestment: number,
  brokerId?: string,
): { weights: number[]; brokerOptimized: boolean } {
  if (filledSlots.length <= 1) {
    return { weights: filledSlots.map((s) => s.slot.weight), brokerOptimized: false };
  }

  // Calculer l'efficacité coût-ajustée pour chaque slot
  const efficiencies: number[] = filledSlots.map(({ slot, selection }) => {
    const etf = selection.etf;
    const expectedReturn = etf.return5y ?? etf.return3y ?? etf.return1y
      ?? (CATEGORY_HISTORICAL_RETURNS[etf.category] ?? 0.07);
    const vol = etf.volatility1y ?? (CATEGORY_HISTORICAL_VOL[etf.category] ?? 0.15);
    const ter = etf.ter;

    // Coût de transaction annuel estimé
    const w = slot.weight / 100;
    const monthlyAmount = monthlyInvestment * w;
    const capitalEstimate = monthlyAmount * 12;
    const txCost = brokerId
      ? estimateAnnualTxCostRate(monthlyAmount, brokerId, etf.issuer, capitalEstimate)
      : 0;

    // Bonus si deal courtier actif (réduction de frais = meilleure efficacité)
    const dealBonus = selection.dealType
      ? (selection.dealType === "free" || selection.dealType === "all_free" ? 0.005
        : selection.dealType === "capped" ? 0.003
        : 0.002)
      : 0;

    // Sharpe-like ratio : rendement net / volatilité
    const netReturn = expectedReturn - ter - txCost + dealBonus;
    const volDrag = Math.min((vol * vol) / 2, Math.abs(expectedReturn) * 0.5);
    return Math.max(0.01, (netReturn - volDrag) / Math.max(vol, 0.05));
  });

  // Moyenne pondérée de l'efficacité
  const avgEff = efficiencies.reduce((s, e) => s + e, 0) / efficiencies.length;
  if (avgEff <= 0) {
    return { weights: filledSlots.map((s) => s.slot.weight), brokerOptimized: false };
  }

  // Ajuster les poids : les slots plus efficients gagnent du poids
  const rawWeights = filledSlots.map(({ slot }, i) => {
    const ratio = efficiencies[i] / avgEff;
    // Facteur d'ajustement modéré : max ±30% du poids de base
    const factor = Math.max(0.7, Math.min(1.3, ratio));
    return slot.weight * factor;
  });

  // Appliquer les bornes min/max
  const clampedWeights = rawWeights.map((w, i) => {
    const slot = filledSlots[i].slot;
    const min = slot.minWeight ?? (slot.weight * 0.5);
    const max = slot.maxWeight ?? (slot.weight * 1.5);
    return Math.max(min, Math.min(max, w));
  });

  // Normaliser à 100%
  const total = clampedWeights.reduce((s, w) => s + w, 0);
  const normalized = clampedWeights.map((w) => Math.round((w / total) * 100));

  // Corriger l'arrondi
  const roundedTotal = normalized.reduce((s, w) => s + w, 0);
  if (roundedTotal !== 100 && normalized.length > 0) {
    normalized[0] += 100 - roundedTotal;
  }

  // Vérifier si l'optimisation a réellement changé les poids
  const baseWeights = filledSlots.map((s) => s.slot.weight);
  const changed = normalized.some((w, i) => w !== baseWeights[i]);

  return { weights: normalized, brokerOptimized: changed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Construction de la stratégie avec données live
// ─────────────────────────────────────────────────────────────────────────────

function buildDynamicStrategy(
  riskProfile: RiskProfile,
  simplify: boolean,
  rankedEtfs: EtfRankedEntry[],
  monthlyInvestment?: number,
  brokerId?: string,
): { etfs: StrategyEtf[]; expectedReturnMin: number; expectedReturnMax: number } {
  const slots = getSlots(riskProfile, simplify);
  const alreadySelected = new Set<string>();

  // Pilier ACC vs DIST : en phase de capitalisation (agressif/équilibré),
  // on donne un bonus aux ETFs ACC pour maximiser les intérêts composés
  const preferAcc = riskProfile !== "défensif";

  // Phase 1 : Sélection des meilleurs ETFs pour chaque slot
  const filledSlots: SlotWithEtf[] = [];
  for (const slot of slots) {
    let selection = selectBestForSlot(rankedEtfs, slot, alreadySelected, preferAcc, brokerId);

    // Fallback : si aucun ETF ne correspond aux filtres du slot,
    // chercher le fallbackIsin dans les données disponibles (même seuil de score)
    if (!selection && slot.fallbackIsin) {
      const fallback = rankedEtfs.find(
        (e) => e.isin === slot.fallbackIsin
          && !alreadySelected.has(e.isin)
          && e.score >= MIN_SCORE_THRESHOLD,
      );
      if (fallback) {
        selection = {
          etf: fallback,
          dealType: null,
          dealBonus: 0,
          dealChangedPick: false,
          neutralPick: null,
        };
      }
    }

    if (selection) {
      alreadySelected.add(selection.etf.isin);
      filledSlots.push({ slot, selection });
    }
  }

  // Phase 2 : Optimisation des poids selon le courtier et les données live
  const { weights, brokerOptimized } = optimizeWeightsForBroker(
    filledSlots,
    monthlyInvestment ?? 200,
    brokerId,
  );

  // Phase 3 : Assemblage final
  const strategyEtfs: StrategyEtf[] = [];
  const returnInputs: Array<{ etf: EtfRankedEntry; weight: number }> = [];

  for (let i = 0; i < filledSlots.length; i++) {
    const { slot, selection } = filledSlots[i];
    const w = weights[i];
    const reason = generateReason(selection.etf, slot.role, slot, selection, brokerId, brokerOptimized);
    strategyEtfs.push(etfToStrategy(selection.etf, w, slot.role, reason));
    returnInputs.push({ etf: selection.etf, weight: w });
  }

  // Sécurité : garantir 100% même si des slots ont été supprimés
  const totalAssigned = strategyEtfs.reduce((s, e) => s + e.weight, 0);
  if (totalAssigned > 0 && totalAssigned < 100) {
    const scale = 100 / totalAssigned;
    for (const etf of strategyEtfs) {
      etf.weight = Math.round(etf.weight * scale);
    }
    const roundedTotal = strategyEtfs.reduce((s, e) => s + e.weight, 0);
    if (roundedTotal !== 100 && strategyEtfs.length > 0) {
      strategyEtfs[0].weight += 100 - roundedTotal;
    }
    for (let i = 0; i < returnInputs.length; i++) {
      returnInputs[i].weight = strategyEtfs[i].weight;
    }
  }

  // Phase 4 : Tri par rôle (Cœur → Complément → Satellite) puis poids décroissant
  const ROLE_ORDER: Record<EtfRole, number> = { "Cœur": 0, "Complément": 1, "Satellite": 2 };
  strategyEtfs.sort((a, b) => {
    const roleA = ROLE_ORDER[a.role] ?? 9;
    const roleB = ROLE_ORDER[b.role] ?? 9;
    if (roleA !== roleB) return roleA - roleB;
    return b.weight - a.weight;
  });

  const { min, max } = computeWeightedReturn(returnInputs, monthlyInvestment, brokerId);

  return { etfs: strategyEtfs, expectedReturnMin: min, expectedReturnMax: max };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback statique (rétrocompatibilité sans données live)
// ─────────────────────────────────────────────────────────────────────────────

function buildStaticStrategy(
  riskProfile: RiskProfile,
  simplify: boolean,
): { etfs: StrategyEtf[]; expectedReturnMin: number; expectedReturnMax: number } {
  const E = FALLBACK_ETF;

  if (riskProfile === "agressif") {
    const etfs: StrategyEtf[] = simplify
      ? [
          { ...E.WPEA,  weight: 80, role: "Cœur",      reason: "Base mondiale ACC : 1 500+ entreprises, 23 pays développés, 11 secteurs. Réinvestissement automatique des dividendes." },
          { ...E.PAEEM, weight: 20, role: "Complément", reason: "Marchés absents du World (Chine, Inde, Brésil) — 40% du PIB mondial, corrélation modérée (~0.65) avec les développés." },
        ]
      : [
          { ...E.WPEA,  weight: 50, role: "Cœur",      reason: "Socle diversifié ACC : 1 500+ entreprises dans 23 pays développés, 11 secteurs. Intérêts composés optimaux." },
          { ...E.PAEEM, weight: 20, role: "Complément", reason: "Diversification géographique clé : Chine, Inde, Brésil — croissance supérieure, corrélation modérée (~0.65). Valorisations attractives (P/E ~12x)." },
          { ...E.ETZ,   weight: 15, role: "Complément", reason: "Renforce l'Europe : 600 entreprises, valorisations attractives (P/E ~14 vs ~22 US), pas de risque de change." },
          { ...E.TPXE,  weight: 10, role: "Satellite",  reason: "Japon : 4e économie mondiale, faible corrélation avec US/Europe (~0.50). Réformes de gouvernance en cours." },
          { ...E.HLT,   weight: 5,  role: "Satellite",  reason: "Secteur santé européen : défensif, résiste aux récessions, décorrélé de la tech." },
        ];
    return { etfs, expectedReturnMin: 0.06, expectedReturnMax: 0.09 };
  }

  if (riskProfile === "équilibré") {
    const etfs: StrategyEtf[] = simplify
      ? [{ ...E.WPEA, weight: 100, role: "Cœur", reason: "Un seul ETF ACC couvrant 1 500+ entreprises, 23 pays, 11 secteurs — meilleur compromis coût/diversification. Dividendes réinvestis automatiquement." }]
      : [
          { ...E.WPEA,  weight: 50, role: "Cœur",      reason: "Socle mondial ACC diversifié sur 23 pays et 11 secteurs. Capitalisation optimale." },
          { ...E.ETZ,   weight: 20, role: "Complément", reason: "Réduit la dépendance aux US (~70% du World). Valorisations européennes attractives, pas de risque de change." },
          { ...E.PAEEM, weight: 15, role: "Complément", reason: "Marchés en forte croissance absents du World. Corrélation modérée (~0.65) → réduit la volatilité." },
          { ...E.MEUD,  weight: 10, role: "Satellite",  reason: "Ancrage zone euro, champions européens, dividendes en cash (DIST) pour complément de revenus." },
          { ...E.HLT,   weight: 5,  role: "Satellite",  reason: "Protection sectorielle : santé résiste aux récessions, amortisseur de crise." },
        ];
    return { etfs, expectedReturnMin: 0.05, expectedReturnMax: 0.08 };
  }

  // Défensif
  const etfs: StrategyEtf[] = simplify
    ? [
        { ...E.WPEA, weight: 60, role: "Cœur",      reason: "Base mondiale ACC diversifiée même proche de la retraite — protection contre l'inflation et le risque pays." },
        { ...E.MEUD, weight: 40, role: "Complément", reason: "ETF distribuant (DIST) : dividendes en cash trimestriels pour préparer la phase de rente. Évite de vendre en marché baissier." },
      ]
    : [
        { ...E.WPEA,  weight: 40, role: "Cœur",      reason: "Socle mondial ACC — diversification géographique et sectorielle indispensable." },
        { ...E.ETZ,   weight: 20, role: "Complément", reason: "Large exposition européenne à volatilité modérée. 600 entreprises, 17 pays, pas de risque de change." },
        { ...E.MEUD,  weight: 20, role: "Complément", reason: "Distribuant (DIST) — dividendes cash trimestriels. TER ultra-bas (0.07%). Prépare la phase de rente sans vendre de parts." },
        { ...E.HLT,   weight: 10, role: "Satellite",  reason: "Secteur santé : amortisseur de crises, performance stable même en récession. Réduit le max drawdown." },
        { ...E.PAEEM, weight: 10, role: "Satellite",  reason: "10% d'émergents protège contre l'inflation et capte la croissance mondiale." },
      ];
  return { etfs, expectedReturnMin: 0.04, expectedReturnMax: 0.06 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale
// ─────────────────────────────────────────────────────────────────────────────

export function computePortfolioStrategy(
  profile: UserProfile,
  override?: RiskProfile,
  rankedEtfs?: EtfRankedEntry[],
  brokerId?: BrokerId | null,
): PortfolioStrategy {
  const currentAge = CURRENT_YEAR - profile.birthYear;
  const timeHorizon = profile.retirementAge - currentAge;
  const simplify = shouldSimplify(profile.monthlyInvestment, brokerId ?? undefined);
  const computedProfile = computeRiskProfile(profile);
  const riskProfile = override ?? computedProfile;

  const useDynamic = rankedEtfs && rankedEtfs.length > 0;
  const { etfs, expectedReturnMin, expectedReturnMax } = useDynamic
    ? buildDynamicStrategy(riskProfile, simplify, rankedEtfs, profile.monthlyInvestment, brokerId ?? undefined)
    : buildStaticStrategy(riskProfile, simplify);

  const brokerName = brokerId ? getBrokerName(brokerId) : null;
  const rationale = generateRationale(riskProfile, timeHorizon, etfs.length, useDynamic ?? false, brokerName);

  return {
    riskProfile,
    computedProfile,
    timeHorizon,
    currentAge,
    expectedReturnMin,
    expectedReturnMax,
    rationale,
    etfs,
    simplify,
  };
}

function getBrokerName(brokerId: string): string | null {
  try {
    return getBrokerById(brokerId as BrokerId).name;
  } catch {
    return null;
  }
}

function generateRationale(
  riskProfile: RiskProfile,
  timeHorizon: number,
  nbEtfs: number,
  dynamic: boolean,
  brokerName: string | null,
): string {
  const diversNote = nbEtfs >= 3
    ? ` Le portefeuille couvre ${nbEtfs} zones/secteurs distincts pour réduire le risque par la diversification.`
    : "";
  const dynamicNote = dynamic
    ? " Les ETFs sont sélectionnés dynamiquement parmi les mieux notés du PEA, avec des poids optimisés selon le rendement net de frais."
    : "";
  const accDistNote = riskProfile === "défensif"
    ? " Les ETFs distribuants préparent la phase de rente avec des dividendes en cash."
    : " Les ETFs capitalisants sont privilégiés pour maximiser les intérêts composés.";
  const brokerNote = brokerName
    ? ` Les poids sont ajustés pour maximiser le rendement net chez ${brokerName} (frais de courtage et partenariats inclus).`
    : "";

  if (riskProfile === "agressif") {
    return (
      `Avec ${timeHorizon} ans d'horizon, vous pouvez absorber la volatilité court terme ` +
      `et profiter pleinement des intérêts composés. La diversification géographique ` +
      `(développés + émergents + Asie) maximise les chances de capter la croissance mondiale. ` +
      `Les rendements affichés tiennent compte du volatility drag et des frais.` +
      accDistNote + diversNote + brokerNote + dynamicNote
    );
  }

  if (riskProfile === "équilibré") {
    return (
      `Avec ${timeHorizon} ans devant vous, l'équilibre entre croissance et sécurité passe par ` +
      `la diversification : marchés développés, Europe, émergents et un secteur défensif. ` +
      `Chaque zone couvre des cycles économiques différents pour lisser la performance.` +
      accDistNote + diversNote + brokerNote + dynamicNote
    );
  }

  return (
    `À ${timeHorizon} an${timeHorizon > 1 ? "s" : ""} de la retraite, la diversification protège ` +
    `votre capital : marchés mondiaux, Europe stable, dividendes réguliers et un secteur défensif.` +
    accDistNote +
    ` L'objectif est de réduire la volatilité tout en maintenant un rendement supérieur à l'inflation.` +
    diversNote + brokerNote + dynamicNote
  );
}
