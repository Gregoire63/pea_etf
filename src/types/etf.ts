export type EtfCategory =
  | "World"
  | "US"
  | "Europe"
  | "Eurozone"
  | "France"
  | "Emerging"
  | "Asia"
  | "Japan"
  | "Sector"
  | "Leveraged";

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
}

export interface EtfRankedEntry extends PeaEtfCatalogEntry, EtfLiveData {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rank: number;
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
