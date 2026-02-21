/**
 * LLM 排行榜数据类型定义
 *
 * 包含模型排名、性能指标、使用统计等数据结构
 */

/**
 * 时间序列数据点
 */
export interface TimeSeriesPoint {
  timestamp: string; // ISO格式时间戳或日期字符串
  value: number;     // 指标值（token数、请求数等）
}

/**
 * LLM 模型基本信息
 */
export interface LLMModel {
  id: string;                    // 模型唯一标识，如 "gpt-4-turbo"
  name: string;                  // 显示名称
  provider: string;              // 提供商，如 "OpenAI", "Anthropic"
  category?: string;             // 分类，如 "通用", "编程", "多模态"
  context_length?: number;       // 上下文长度
  release_date?: string;         // 发布日期
}

/**
 * 模型性能指标
 */
export interface ModelMetrics {
  model_id: string;              // 关联的模型ID

  // 使用量指标
  total_tokens?: number;         // 总token数
  total_requests?: number;       // 总请求数
  active_users?: number;         // 活跃用户数

  // 性能指标
  avg_latency_ms?: number;       // 平均延迟（毫秒）
  p95_latency_ms?: number;       // P95延迟
  throughput_tps?: number;       // 吞吐量（tokens/秒）
  success_rate?: number;         // 成功率（0-1）

  // 成本指标
  cost_per_1k_tokens?: number;   // 每1K tokens成本（USD）
  total_cost?: number;           // 总成本

  // 质量指标
  quality_score?: number;        // 质量评分（0-100）
  user_satisfaction?: number;    // 用户满意度（0-5）

  timestamp: string;             // 数据时间戳
}

/**
 * 模型排名项
 */
export interface RankingItem {
  rank: number;                  // 排名
  model: LLMModel;               // 模型信息
  metrics: ModelMetrics;         // 性能指标
  trend?: "up" | "down" | "stable"; // 排名趋势
  rank_change?: number;          // 排名变化（正数表示上升）
}

/**
 * 时间序列排名数据（用于趋势图）
 */
export interface TimeSeriesRanking {
  timestamp: string;             // 时间点
  rankings: {                    // 各模型的指标值
    [modelId: string]: number;
  };
}

/**
 * 市场份额数据
 */
export interface MarketShare {
  provider: string;              // 提供商名称
  share_percent: number;         // 市场份额百分比
  total_tokens: number;          // 总token数
  model_count: number;           // 模型数量
}

/**
 * 分类排名数据
 */
export interface CategoryRanking {
  category: string;              // 分类名称
  top_models: RankingItem[];     // 该分类下的top模型
  total_usage: number;           // 该分类总使用量
}

/**
 * 排行榜完整数据
 */
export interface LLMLeaderboard {
  // 基础排名
  overall_rankings: RankingItem[];        // 总体排名

  // 时间序列数据
  usage_trends: TimeSeriesRanking[];      // 使用量趋势
  latency_trends?: TimeSeriesRanking[];   // 延迟趋势

  // 市场分析
  market_shares: MarketShare[];           // 市场份额

  // 分类排名
  category_rankings?: CategoryRanking[];  // 按分类的排名

  // 元数据
  last_updated: string;                   // 最后更新时间
  data_period: {                          // 数据周期
    start: string;
    end: string;
  };
}

/**
 * 排行榜筛选选项
 */
export interface LeaderboardFilters {
  category?: string;             // 按分类筛选
  provider?: string;             // 按提供商筛选
  time_range?: "day" | "week" | "month"; // 时间范围
  metric?: "usage" | "latency" | "cost" | "quality"; // 排序指标
  limit?: number;                // 返回数量限制
}

/**
 * API 响应格式
 */
export interface LLMLeaderboardResponse {
  success: boolean;
  data?: LLMLeaderboard;
  error?: string;
  timestamp: string;
}
