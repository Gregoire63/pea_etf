/**
 * Catalogue dynamique des ETF PEA.
 *
 * Les données de marché (prix, AUM, performances) sont récupérées depuis Yahoo Finance.
 * Seuls les champs structurels propres à chaque ETF (ISIN, catégorie, indice, TER de référence,
 * type de réplication) sont définis ici — ils changent très rarement.
 *
 * Pour ajouter un nouvel ETF PEA : ajouter une ligne dans BASE_CATALOG.
 */

import type { EtfCategory } from "@/types/etf";

export type BaseCatalogEntry = {
  isin: string;
  /** Ticker Yahoo Finance (ex: WPEA.PA) */
  yahooTicker: string;
  category: EtfCategory;
  /** Indice répliqué */
  index: string;
  /** TER de référence (fallback si Yahoo Finance n'a pas la donnée) */
  ter: number;
  distribution: "ACC" | "DIST";
  replication: "Physical" | "Synthetic";
  leveraged: boolean;
  leverageMultiplier?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Base catalog — chaque entrée correspond à un ETF PEA coté sur Euronext Paris.
// Les données financières (prix, encours, performances) sont récupérées en temps
// réel depuis Yahoo Finance par getAllEtfsRanked() dans etf-data.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_CATALOG: BaseCatalogEntry[] = [
  // ── Monde ──────────────────────────────────────────────────────────────────
  { isin: "IE0002XZSHO1", yahooTicker: "WPEA.PA",  category: "World",    index: "MSCI World",                          ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR001400U5Q4", yahooTicker: "DCAM.PA",  category: "World",    index: "MSCI World",                          ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1681043599", yahooTicker: "CW8.PA",   category: "World",    index: "MSCI World",                          ter: 0.0038, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1781541179", yahooTicker: "LCWD.PA",  category: "World",    index: "MSCI World",                          ter: 0.0012, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── États-Unis ─────────────────────────────────────────────────────────────
  { isin: "FR0011871128", yahooTicker: "PSP5.PA",  category: "US",       index: "S&P 500",                             ter: 0.0012, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011550185", yahooTicker: "ESE.PA",   category: "US",       index: "S&P 500",                             ter: 0.0014, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1681038326", yahooTicker: "MUSA.PA",  category: "US",       index: "MSCI USA",                            ter: 0.0028, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011871110", yahooTicker: "PUST.PA",  category: "US",       index: "Nasdaq-100",                          ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1681038672", yahooTicker: "RS2K.PA",  category: "US",       index: "Russell 2000",                        ter: 0.0035, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── Europe ─────────────────────────────────────────────────────────────────
  { isin: "FR0011550193", yahooTicker: "ETZ.PA",   category: "Europe",   index: "STOXX Europe 600",                    ter: 0.0019, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── Zone Euro ──────────────────────────────────────────────────────────────
  { isin: "LU1681040223", yahooTicker: "CEU.PA",   category: "Eurozone", index: "EURO STOXX 50",                       ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0007054358", yahooTicker: "MEUD.PA",  category: "Eurozone", index: "EURO STOXX 50",                       ter: 0.0007, distribution: "DIST", replication: "Physical",  leveraged: false },

  // ── France ─────────────────────────────────────────────────────────────────
  { isin: "FR0013380607", yahooTicker: "CACC.PA",  category: "France",   index: "CAC 40",                              ter: 0.0025, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1681047236", yahooTicker: "C50.PA",   category: "France",   index: "CAC 40",                              ter: 0.0025, distribution: "ACC",  replication: "Physical",  leveraged: false },
  { isin: "FR0011041334", yahooTicker: "CACM.PA",  category: "France",   index: "CAC Mid 60",                          ter: 0.0040, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── Marchés Émergents ──────────────────────────────────────────────────────
  { isin: "FR0013412020", yahooTicker: "PAEEM.PA", category: "Emerging", index: "MSCI Emerging Markets",               ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1681044480", yahooTicker: "CEMU.PA",  category: "Emerging", index: "MSCI Emerging Markets",               ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011869296", yahooTicker: "PLEM.PA",  category: "Emerging", index: "MSCI EM Latin America",               ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── Asie ───────────────────────────────────────────────────────────────────
  { isin: "FR0013412012", yahooTicker: "PAASI.PA", category: "Asia",     index: "MSCI Emerging Markets Asia",          ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1681043086", yahooTicker: "CP9.PA",   category: "Asia",     index: "MSCI Pacific ex Japan",               ter: 0.0045, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011869320", yahooTicker: "PINR.PA",  category: "Asia",     index: "MSCI India",                          ter: 0.0085, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── Japon ──────────────────────────────────────────────────────────────────
  { isin: "FR0011869312", yahooTicker: "PKRW.PA",  category: "Asia",     index: "MSCI Korea",                         ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011411980", yahooTicker: "TPXE.PA",  category: "Japan",    index: "TOPIX",                               ter: 0.0020, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── Sectoriels ─────────────────────────────────────────────────────────────
  { isin: "FR0013412269", yahooTicker: "PANX.PA",  category: "Sector",   index: "Solactive ISS ESG US Tech 100",       ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834987890", yahooTicker: "TNOW.PA",  category: "Sector",   index: "STOXX Europe 600 Technology",         ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834986900", yahooTicker: "HLT.PA",   category: "Sector",   index: "STOXX Europe 600 Health Care",        ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834988351", yahooTicker: "CD8.PA",   category: "Sector",   index: "STOXX Europe 600 Banks",              ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834988088", yahooTicker: "CU2.PA",   category: "Sector",   index: "STOXX Europe 600 Utilities",          ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834988161", yahooTicker: "C6E.PA",   category: "Sector",   index: "STOXX Europe 600 Energy",             ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU1834988245", yahooTicker: "EPRE.PA",  category: "Sector",   index: "STOXX Europe 600 Real Estate",        ter: 0.0030, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "FR0011869379", yahooTicker: "PNRJ.PA",  category: "Sector",   index: "World Alternative Energy",            ter: 0.0060, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU2572257124", yahooTicker: "GOAI.PA",  category: "Sector",   index: "MSCI ACWI IMI Robotics & AI ESG",     ter: 0.0040, distribution: "ACC",  replication: "Synthetic", leveraged: false },
  { isin: "LU2089238302", yahooTicker: "WATC.PA",  category: "Sector",   index: "MSCI ACWI IMI Water ESG",             ter: 0.0035, distribution: "ACC",  replication: "Synthetic", leveraged: false },

  // ── ETF à effet de levier ──────────────────────────────────────────────────
  { isin: "FR0010755611", yahooTicker: "CL2.PA",   category: "Leveraged", index: "MSCI USA Daily 2x Leveraged",        ter: 0.0050, distribution: "ACC",  replication: "Synthetic", leveraged: true, leverageMultiplier: 2 },
  { isin: "FR0010342592", yahooTicker: "LQQ.PA",   category: "Leveraged", index: "Nasdaq-100 Daily 2x Leveraged",      ter: 0.0060, distribution: "ACC",  replication: "Synthetic", leveraged: true, leverageMultiplier: 2 },
  { isin: "LU1681044050", yahooTicker: "CE8.PA",   category: "Leveraged", index: "EURO STOXX 50 Daily 2x Leveraged",   ter: 0.0050, distribution: "ACC",  replication: "Synthetic", leveraged: true, leverageMultiplier: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — dérivent des informations depuis les noms Yahoo Finance
// ─────────────────────────────────────────────────────────────────────────────

export function extractIssuer(name: string): string {
  if (/\biShares\b/i.test(name)) return "iShares";
  if (/\bAmundi\b/i.test(name)) return "Amundi";
  if (/\bBNP\b/i.test(name)) return "BNP Paribas";
  if (/\bLyxor\b/i.test(name)) return "Lyxor";
  if (/\bInvesco\b/i.test(name)) return "Invesco";
  if (/\bVanguard\b/i.test(name)) return "Vanguard";
  if (/\bXtrackers\b/i.test(name)) return "DWS";
  if (/\bSPDR\b/i.test(name)) return "SPDR";
  const firstWord = name.split(" ")[0];
  return firstWord ?? "—";
}
