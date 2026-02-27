/**
 * Calcule une stratégie ETF personnalisée à partir du profil investisseur.
 *
 * Logique par défaut :
 *  - Agressif  : horizon >= 20 ans ET âge <= 50
 *  - Équilibré : horizon >= 10 ans
 *  - Défensif  : horizon < 10 ans (proche de la retraite)
 *
 * Le paramètre `override` permet à l'utilisateur de forcer un profil différent
 * du profil calculé automatiquement.
 *
 * Pour les petits versements (< 200 €/mois), on simplifie à 1-2 ETFs
 * pour maintenir des frais de courtage raisonnables.
 */

import type { UserProfile } from "@/hooks/use-user-profile";

const CURRENT_YEAR = new Date().getFullYear();

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
  /** Profil effectivement utilisé (peut être une surcharge manuelle) */
  riskProfile: RiskProfile;
  /** Profil calculé automatiquement depuis les données du profil */
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
// Catalogue réduit (données statiques, sans Yahoo Finance)
// ─────────────────────────────────────────────────────────────────────────────

const ETF = {
  WPEA:  { isin: "IE0002XZSHO1", ticker: "WPEA.PA",  shortName: "Amundi MSCI World PEA",             index: "MSCI World"                      },
  PSP5:  { isin: "FR0011871128", ticker: "PSP5.PA",  shortName: "Amundi PEA S&P 500",                index: "S&P 500"                         },
  PUST:  { isin: "FR0011871110", ticker: "PUST.PA",  shortName: "Amundi PEA Nasdaq-100",             index: "Nasdaq-100"                      },
  ETZ:   { isin: "FR0011550193", ticker: "ETZ.PA",   shortName: "Amundi STOXX Europe 600",           index: "STOXX Europe 600"                },
  MSEU:  { isin: "LU1681042609", ticker: "MSEU.PA",  shortName: "Amundi MSCI Europe",                index: "MSCI Europe"                     },
  MEUD:  { isin: "FR0007054358", ticker: "MEUD.PA",  shortName: "Amundi EURO STOXX 50 (Distribuant)", index: "EURO STOXX 50"                   },
  PAEEM: { isin: "FR0013412020", ticker: "PAEEM.PA", shortName: "Amundi MSCI Emerging Markets PEA",  index: "MSCI Emerging Markets"           },
  GOAI:  { isin: "LU2572257124", ticker: "GOAI.PA",  shortName: "Amundi MSCI Robotics & AI ESG",     index: "MSCI ACWI IMI Robotics & AI ESG" },
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale
// ─────────────────────────────────────────────────────────────────────────────

export function computePortfolioStrategy(
  profile: UserProfile,
  override?: RiskProfile
): PortfolioStrategy {
  const currentAge = CURRENT_YEAR - profile.birthYear;
  const timeHorizon = profile.retirementAge - currentAge;
  const simplify = profile.monthlyInvestment < 200;
  const computedProfile = computeRiskProfile(profile);
  const riskProfile = override ?? computedProfile;

  // ── Agressif ────────────────────────────────────────────────────────────────
  if (riskProfile === "agressif") {
    const rationale =
      `Avec ${timeHorizon} ans d'horizon, vous pouvez absorber la volatilité court terme ` +
      `et profiter pleinement des intérêts composés. L'accent est mis sur la croissance ` +
      `mondiale et les marchés émergents pour maximiser la performance long terme.`;

    const etfs: StrategyEtf[] = simplify
      ? [
          { ...ETF.WPEA,  weight: 80, role: "Cœur",      reason: "1 500+ entreprises mondiales en un ETF. Simple, diversifié, TER minimal à 0,20% — idéal pour commencer." },
          { ...ETF.PAEEM, weight: 20, role: "Complément", reason: "Expose aux pays émergents (Inde, Chine, Brésil) absents du MSCI World — potentiel de croissance élevé sur le long terme." },
        ]
      : [
          { ...ETF.WPEA,  weight: 60, role: "Cœur",      reason: "Cœur du portefeuille : 1 500+ entreprises dans 23 pays développés avec un TER parmi les plus bas du PEA." },
          { ...ETF.PAEEM, weight: 20, role: "Complément", reason: "Potentiel de croissance supérieur aux pays développés. Les émergents représentent ~40% du PIB mondial mais < 15% du MSCI World." },
          { ...ETF.PUST,  weight: 15, role: "Satellite",  reason: "Surpondère les 100 leaders technologiques US (Apple, Nvidia, Meta). Volatilité élevée compensée par des rendements historiquement supérieurs." },
          { ...ETF.ETZ,   weight: 5,  role: "Satellite",  reason: "Ancrage européen défensif : valorisations attractives vs US, source de dividendes et contrepoids modérateur." },
        ];

    return { riskProfile, computedProfile, timeHorizon, currentAge, expectedReturnMin: 0.08, expectedReturnMax: 0.10, rationale, etfs, simplify };
  }

  // ── Équilibré ───────────────────────────────────────────────────────────────
  if (riskProfile === "équilibré") {
    const rationale =
      `Avec ${timeHorizon} ans devant vous, un portefeuille équilibré combine croissance mondiale ` +
      `et ancrage européen. Vous capitalisez sur la performance long terme tout en ` +
      `limitant l'exposition aux marchés les plus volatils.`;

    const etfs: StrategyEtf[] = simplify
      ? [
          { ...ETF.WPEA, weight: 100, role: "Cœur", reason: "Un seul ETF bien diversifié est optimal à ce niveau d'investissement. La simplicité favorise la régularité — facteur n°1 de succès." },
        ]
      : [
          { ...ETF.WPEA,  weight: 55, role: "Cœur",      reason: "Base solide : exposition diversifiée aux marchés développés. Réduit le risque de concentration géographique." },
          { ...ETF.PSP5,  weight: 25, role: "Complément", reason: "Renforce l'exposition aux États-Unis, moteur historique de la performance boursière mondiale depuis 40 ans." },
          { ...ETF.MSEU,  weight: 15, role: "Complément", reason: "Rééquilibre vers l'Europe dont les valorisations P/E sont significativement inférieures aux marchés US." },
          { ...ETF.PAEEM, weight: 5,  role: "Satellite",  reason: "Exposition résiduelle aux émergents pour capter leur potentiel de rattrapage économique à moyen terme." },
        ];

    return { riskProfile, computedProfile, timeHorizon, currentAge, expectedReturnMin: 0.07, expectedReturnMax: 0.08, rationale, etfs, simplify };
  }

  // ── Défensif ─────────────────────────────────────────────────────────────────
  const rationale =
    `À ${timeHorizon} an${timeHorizon > 1 ? "s" : ""} de la retraite, la préservation du capital ` +
    `devient prioritaire. Le portefeuille réduit la volatilité et intègre des ETF distribuants ` +
    `pour préparer une source de revenus réguliers lors du décaissement.`;

  const etfs: StrategyEtf[] = simplify
    ? [
        { ...ETF.WPEA, weight: 60, role: "Cœur",      reason: "Maintient une diversification mondiale pour protéger contre l'inflation et le risque pays." },
        { ...ETF.MEUD, weight: 40, role: "Complément", reason: "ETF distribuant : les dividendes versés en cash préparent la transition vers la phase de retrait régulier." },
      ]
    : [
        { ...ETF.WPEA, weight: 50, role: "Cœur",      reason: "Diversification mondiale pour éviter les risques de concentration. Volatilité contenue grâce à la large diversification." },
        { ...ETF.MEUD, weight: 30, role: "Complément", reason: "ETF distribuant (DIST) : les dividendes sont versés en cash, prêts à être utilisés. Prépare le passage en phase de rente." },
        { ...ETF.ETZ,  weight: 20, role: "Complément", reason: "Large exposition européenne avec une volatilité historiquement modérée. Complète le MEUD sur les grandes et moyennes caps." },
      ];

  return { riskProfile, computedProfile, timeHorizon, currentAge, expectedReturnMin: 0.05, expectedReturnMax: 0.06, rationale, etfs, simplify };
}
