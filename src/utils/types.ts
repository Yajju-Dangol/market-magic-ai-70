
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface StockRecommendation {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reason: string;
  timeFrame: 'short' | 'medium' | 'long';
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface PortfolioStock {
  symbol: string;
  shares: number;
  buyPrice: number;
  purchaseDate?: string;
}

export interface MarketSummary {
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  averagePrice: number;
  topGainer: Stock | null;
  topLoser: Stock | null;
}
