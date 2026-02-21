/**
 * LLM 排行榜模拟数据生成器
 *
 * 生成类似 OpenRouter Rankings 的模拟数据
 * 后续可替换为真实数据源（API、数据库等）
 */

import type {
  LLMModel,
  ModelMetrics,
  RankingItem,
  TimeSeriesRanking,
  MarketShare,
  CategoryRanking,
  LLMLeaderboard,
} from "@/types/llm";

// 模拟的 LLM 模型列表
const MOCK_MODELS: LLMModel[] = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    category: "通用",
    context_length: 200000,
    release_date: "2025-12-01",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    category: "通用",
    context_length: 200000,
    release_date: "2025-12-01",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    category: "通用",
    context_length: 128000,
    release_date: "2024-04-01",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    category: "多模态",
    context_length: 128000,
    release_date: "2024-05-13",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    category: "通用",
    context_length: 1000000,
    release_date: "2024-12-11",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    category: "编程",
    context_length: 64000,
    release_date: "2024-12-26",
  },
  {
    id: "qwen-2.5-coder",
    name: "Qwen 2.5 Coder",
    provider: "Alibaba",
    category: "编程",
    context_length: 32000,
    release_date: "2024-11-01",
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    category: "通用",
    context_length: 128000,
    release_date: "2024-12-06",
  },
  {
    id: "grok-2",
    name: "Grok 2",
    provider: "xAI",
    category: "通用",
    context_length: 131072,
    release_date: "2024-08-13",
  },
  {
    id: "mistral-large-2",
    name: "Mistral Large 2",
    provider: "Mistral AI",
    category: "通用",
    context_length: 128000,
    release_date: "2024-07-24",
  },
];

/**
 * 生成随机指标数据
 */
function generateMetrics(modelId: string, baseMultiplier: number): ModelMetrics {
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  return {
    model_id: modelId,
    total_tokens: Math.floor(random(50, 500) * baseMultiplier * 1e9), // 数十亿到数千亿
    total_requests: Math.floor(random(1, 10) * baseMultiplier * 1e6),
    active_users: Math.floor(random(1000, 50000) * baseMultiplier),
    avg_latency_ms: Math.floor(random(200, 2000)),
    p95_latency_ms: Math.floor(random(500, 5000)),
    throughput_tps: Math.floor(random(50, 500)),
    success_rate: random(0.95, 0.999),
    cost_per_1k_tokens: random(0.001, 0.05),
    quality_score: random(70, 95),
    user_satisfaction: random(3.5, 4.9),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 生成排名数据
 */
export function generateRankings(): RankingItem[] {
  return MOCK_MODELS.map((model, index) => {
    const baseMultiplier = MOCK_MODELS.length - index; // 排名越高，使用量越大
    const metrics = generateMetrics(model.id, baseMultiplier);

    return {
      rank: index + 1,
      model,
      metrics,
      trend: index % 3 === 0 ? "up" : index % 3 === 1 ? "down" : "stable",
      rank_change: index % 3 === 0 ? Math.floor(Math.random() * 3) + 1 : index % 3 === 1 ? -Math.floor(Math.random() * 3) - 1 : 0,
    };
  });
}

/**
 * 生成时间序列数据（最近30天）
 */
export function generateUsageTrends(): TimeSeriesRanking[] {
  const days = 30;
  const trends: TimeSeriesRanking[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const timestamp = date.toISOString().split("T")[0];

    const rankings: { [key: string]: number } = {};
    MOCK_MODELS.forEach((model, index) => {
      const baseValue = (MOCK_MODELS.length - index) * 10e9;
      const trend = Math.sin((i / days) * Math.PI * 2) * 0.2 + 1; // 正弦波动
      const noise = Math.random() * 0.1 + 0.95; // 随机噪声
      rankings[model.id] = Math.floor(baseValue * trend * noise);
    });

    trends.push({ timestamp, rankings });
  }

  return trends;
}

/**
 * 生成市场份额数据
 */
export function generateMarketShares(): MarketShare[] {
  const providers = ["Anthropic", "OpenAI", "Google", "DeepSeek", "Meta", "Others"];
  const shares = [25, 30, 15, 10, 8, 12]; // 百分比

  return providers.map((provider, index) => ({
    provider,
    share_percent: shares[index],
    total_tokens: Math.floor(shares[index] * 10e9),
    model_count: provider === "Others" ? 50 : Math.floor(Math.random() * 5) + 1,
  }));
}

/**
 * 生成分类排名数据
 */
export function generateCategoryRankings(): CategoryRanking[] {
  const categories = ["通用", "编程", "多模态"];

  return categories.map((category) => {
    const categoryModels = MOCK_MODELS.filter((m) => m.category === category);
    const topModels = categoryModels.slice(0, 5).map((model, index) => {
      const baseMultiplier = categoryModels.length - index;
      return {
        rank: index + 1,
        model,
        metrics: generateMetrics(model.id, baseMultiplier),
        trend: "stable" as const,
      };
    });

    const totalUsage = topModels.reduce((sum, item) => sum + (item.metrics.total_tokens || 0), 0);

    return {
      category,
      top_models: topModels,
      total_usage: totalUsage,
    };
  });
}

/**
 * 生成完整的排行榜数据
 */
export function generateLeaderboardData(): LLMLeaderboard {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    overall_rankings: generateRankings(),
    usage_trends: generateUsageTrends(),
    market_shares: generateMarketShares(),
    category_rankings: generateCategoryRankings(),
    last_updated: now.toISOString(),
    data_period: {
      start: weekAgo.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    },
  };
}
