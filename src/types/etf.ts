export type EtfCategory =
  | "World"
  | "US"
  | "Europe"
  | "Eurozone"
  | "France"
  | "Emerging"
  | "Asia"
  | "Japan"
  | "UK"
  | "Germany"
  | "Nordic"
  | "Sector"
  | "Dividend"
  | "Leveraged"
  | "Other";

export interface PeaEtfCatalogEntry {
  isin: string;
  ticker: string;
  yahooTicker: string;
  name: string;
  shortName: string;
  issuer: string;
  ter: number;
  category: EtfCategory;
  distribution: "ACC" | "DIST";
  replication: "Physical" | "Synthetic";
  currency: string;
  index: string;
  launchDate: string;
  leveraged: boolean;
  leverageMultiplier?: number;
}

export interface EtfLiveData {
  isin: string;
  currentPrice: number | null;
  aum: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  ytdReturn: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
  return10y: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  volatility1y: number | null;
  lastUpdated: string;
}

export interface ScoreBreakdown {
  terScore: number;
  performanceScore: number;
  aumScore: number;
  sharpeScore: number;
  drawdownScore: number;
  /** Nombre de métriques disponibles sur 4 (perf, AUM, Sharpe, drawdown). TER toujours dispo. */
  dataCoverage: number;
}

// ── Provenance des données multi-sources ─────────────────────────────────────

export type DataSourceName = "justetf" | "boursobank" | "yahoo" | "catalog";

export interface DataProvenance {
  ter: DataSourceName;
  aum: DataSourceName;
}

// ── Offres partenaires courtiers ─────────────────────────────────────────────

export interface BrokerDealInfo {
  brokerId: string;
  brokerName: string;
  /** Label court pour badges (ex: "0 € frais", "Max 0,99 €") */
  badgeLabel: string;
  description: string;
  dealType: "free" | "capped" | "reimbursed";
  conditions?: string;
  /** Date d'expiration ISO (null = permanent) */
  validUntil: string | null;
}

// ── Entrée classée ──────────────────────────────────────────────────────────

export interface EtfRankedEntry extends PeaEtfCatalogEntry, EtfLiveData {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rank: number;
  dataSources?: DataProvenance;
  /** Offres partenaires courtiers basées sur l'émetteur */
  brokerDeals?: BrokerDealInfo[];
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface EtfListResponse {
  etfs: EtfRankedEntry[];
  lastUpdated: string;
  totalCount: number;
}

export interface CompareResponse {
  etfs: EtfRankedEntry[];
  historicalPrices: Record<string, PricePoint[]>;
}
