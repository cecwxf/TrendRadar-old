/**
 * AI 芯片排行榜类型定义
 */

export type ChipSegment = "ADAS市场" | "座舱市场" | "IOT/机器人端侧市场" | "服务器市场";

export interface AIChipModel {
  id: string;
  name: string;
  vendor: string;
  segment: ChipSegment;
  parent_ticker?: string;
  architecture?: string;
  process_nm?: number;
  release_date?: string;
}

export interface AIChipMetrics {
  chip_id: string;
  benchmark_index: number;          // 推理性能指数（0-100）
  efficiency_index: number;         // 能效指数（0-100）
  deployment_index: number;         // 装机指数（相对值）
  segment_share_percent: number;    // 分市场装机份额
  composite_score: number;          // 质量参考分（不用于份额计算）
  market_cap_usd?: number;          // 仅辅助披露：母公司市值
  daily_volume?: number;            // 仅辅助披露：当日成交量
  price_change_percent?: number;    // 仅辅助披露：24h 涨跌幅
  latest_revenue_usd?: number;      // 仅辅助披露：最近营收（若可得）
  timestamp: string;
}

export interface AIChipRankingItem {
  rank: number;
  chip: AIChipModel;
  metrics: AIChipMetrics;
  trend?: "up" | "down" | "stable";
  rank_change?: number;
}

export interface AIChipSegmentRanking {
  segment: ChipSegment;
  top_chips: AIChipRankingItem[];
  total_deployment_index: number;
}

export interface AIChipMarketRanking {
  market: ChipSegment;
  market_label: string;
  top_chips: AIChipRankingItem[];
  total_deployment_index: number;
}

export interface AIChipVendorShare {
  vendor: string;
  share_percent: number;
  total_deployment_index: number;
  chip_count: number;
}

export interface AIChipMarketVendorShare {
  market: ChipSegment;
  market_label: string;
  vendor_shares: AIChipVendorShare[];
}

export interface AIChipDataSource {
  name: string;
  type: "live" | "reference";
  url?: string;
  status: "ok" | "degraded";
  note?: string;
}

export interface AIChipLeaderboard {
  overall_rankings: AIChipRankingItem[];
  market_rankings: AIChipMarketRanking[];
  segment_rankings: AIChipSegmentRanking[];
  vendor_shares: AIChipVendorShare[];
  market_vendor_shares: AIChipMarketVendorShare[];
  last_updated: string;
  data_period: {
    start: string;
    end: string;
  };
  data_sources: AIChipDataSource[];
  failed_sources?: string[];
}

export interface AIChipLeaderboardResponse {
  success: boolean;
  data?: AIChipLeaderboard;
  error?: string;
  timestamp: string;
}
