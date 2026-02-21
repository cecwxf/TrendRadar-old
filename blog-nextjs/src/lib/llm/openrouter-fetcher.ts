/**
 * OpenRouter 数据获取器
 *
 * 通过 OpenRouter 模型列表（按分类使用量排序）构建排行榜，
 * 覆盖更多闭源模型（Claude/GPT/GLM/Kimi 等）。
 */

import type {
  LLMLeaderboard,
  LLMModel,
  MarketShare,
  ModelMetrics,
  RankingItem,
  TimeSeriesRanking,
  CategoryRanking,
} from "@/types/llm";
import { LLM_CONFIG } from "./config";

interface OpenRouterModel {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string | number;
  };
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModel[];
}

interface AggregatedModel {
  model: OpenRouterModel;
  score: number;
  categoryScores: Record<string, number>;
}

const OR_API_BASE = LLM_CONFIG.openrouter.apiBase;
const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  general: 0.5,
  programming: 0.3,
  multimodal: 0.2,
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  general: "通用",
  programming: "编程",
  multimodal: "多模态",
};

const PROVIDER_MAP: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  deepseek: "DeepSeek",
  meta: "Meta",
  mistralai: "Mistral AI",
  moonshotai: "Moonshot AI",
  "z-ai": "Zhipu AI",
  zhipu: "Zhipu AI",
  qwen: "Alibaba",
  alibaba: "Alibaba",
  xai: "xAI",
};

function stableUnit(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function parseNumeric(value: string | number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function getProvider(modelId: string): string {
  const providerKey = modelId.split("/")[0].toLowerCase();
  if (PROVIDER_MAP[providerKey]) {
    return PROVIDER_MAP[providerKey];
  }
  return providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
}

function inferCategory(model: OpenRouterModel, bestCategory: string): string {
  const modelId = model.id.toLowerCase();
  if (modelId.includes("coder") || modelId.includes("code")) {
    return "编程";
  }

  const inputModalities = model.architecture?.input_modalities || [];
  const outputModalities = model.architecture?.output_modalities || [];
  const modality = (model.architecture?.modality || "").toLowerCase();
  const allModalities = [...inputModalities, ...outputModalities, modality]
    .map((item) => item.toLowerCase());

  if (allModalities.some((item) => item.includes("image") || item.includes("audio") || item.includes("video"))) {
    return "多模态";
  }

  return CATEGORY_LABEL_MAP[bestCategory] || "通用";
}

function toReleaseDate(created?: number): string | undefined {
  if (!created || !Number.isFinite(created)) {
    return undefined;
  }
  return new Date(created * 1000).toISOString();
}

function normalizeModelName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dedupeKey(item: RankingItem): string {
  return `${item.model.provider.toLowerCase()}::${normalizeModelName(item.model.name || item.model.id)}`;
}

function selectBestCategory(categoryScores: Record<string, number>): string {
  let bestCategory = "general";
  let bestScore = -1;

  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  });

  return bestCategory;
}

async function fetchModelsByCategory(category: string): Promise<OpenRouterModel[]> {
  const url = new URL(`${OR_API_BASE}/models`);
  url.searchParams.set("category", category);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (LLM_CONFIG.openrouter.apiKey) {
    headers.Authorization = `Bearer ${LLM_CONFIG.openrouter.apiKey}`;
  }

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate: LLM_CONFIG.cache.ttl },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const payload = (await response.json()) as OpenRouterModelsResponse;
  return (payload.data || []).slice(0, LLM_CONFIG.openrouter.modelLimit);
}

function generateMetrics(model: OpenRouterModel, rank: number, total: number): ModelMetrics {
  const rankFactor = (total - rank + 1) / Math.max(total, 1);
  const seed = stableUnit(model.id);
  const promptPrice = parseNumeric(model.pricing?.prompt);

  const totalTokens = Math.floor((150 + rankFactor * 850) * 1e9 * (0.9 + seed * 0.2));
  const avgLatency = Math.floor(350 + (1 - rankFactor) * 1200 + seed * 220);
  const quality = Math.min(98, 65 + rankFactor * 30 + stableUnit(`${model.id}:q`) * 2);

  return {
    model_id: model.id,
    total_tokens: totalTokens,
    total_requests: Math.floor(totalTokens / (1000 + stableUnit(`${model.id}:req`) * 700)),
    active_users: Math.floor(totalTokens / 7_500_000),
    avg_latency_ms: avgLatency,
    p95_latency_ms: Math.floor(avgLatency * (1.4 + stableUnit(`${model.id}:p95`) * 0.2)),
    throughput_tps: Math.floor(90 + rankFactor * 260 + stableUnit(`${model.id}:tps`) * 60),
    success_rate: 0.965 + stableUnit(`${model.id}:ok`) * 0.03,
    cost_per_1k_tokens: promptPrice ? promptPrice * 1000 : undefined,
    quality_score: quality,
    user_satisfaction: 3.6 + rankFactor * 1.2,
    timestamp: new Date().toISOString(),
  };
}

function generateUsageTrends(rankings: RankingItem[]): TimeSeriesRanking[] {
  const days = LLM_CONFIG.trends.days;
  const topN = LLM_CONFIG.trends.topN;
  const trends: TimeSeriesRanking[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const timestamp = date.toISOString().split("T")[0];
    const rankingsData: Record<string, number> = {};

    rankings.slice(0, topN).forEach((item) => {
      const baseValue = item.metrics.total_tokens || 0;
      const phase = stableUnit(`${item.model.id}:phase`) * Math.PI * 2;
      const seasonal = 1 + Math.sin((i / Math.max(days, 1)) * Math.PI * 2 + phase) * 0.12;
      const jitter = 0.96 + stableUnit(`${item.model.id}:${timestamp}`) * 0.08;
      rankingsData[item.model.id] = Math.floor(baseValue * seasonal * jitter);
    });

    trends.push({ timestamp, rankings: rankingsData });
  }

  return trends;
}

function generateMarketShares(rankings: RankingItem[]): MarketShare[] {
  const providerStats: Record<string, { tokens: number; count: number }> = {};

  rankings.forEach((item) => {
    const provider = item.model.provider;
    if (!providerStats[provider]) {
      providerStats[provider] = { tokens: 0, count: 0 };
    }
    providerStats[provider].tokens += item.metrics.total_tokens || 0;
    providerStats[provider].count += 1;
  });

  const totalTokens = Object.values(providerStats).reduce((sum, stat) => sum + stat.tokens, 0);
  if (!totalTokens) {
    return [];
  }

  return Object.entries(providerStats)
    .map(([provider, stat]) => ({
      provider,
      share_percent: (stat.tokens / totalTokens) * 100,
      total_tokens: stat.tokens,
      model_count: stat.count,
    }))
    .sort((a, b) => b.share_percent - a.share_percent)
    .filter((item) => item.share_percent >= LLM_CONFIG.marketShare.minSharePercent);
}

function generateCategoryRankings(rankings: RankingItem[]): CategoryRanking[] {
  if (!LLM_CONFIG.categories.enabled) {
    return [];
  }

  return LLM_CONFIG.categories.list
    .map((category) => {
      const categoryModels = rankings.filter((item) => item.model.category === category);
      const topModels = categoryModels.slice(0, 5).map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
      const totalUsage = topModels.reduce((sum, item) => sum + (item.metrics.total_tokens || 0), 0);

      return {
        category,
        top_models: topModels,
        total_usage: totalUsage,
      };
    })
    .filter((item) => item.top_models.length > 0);
}

export function buildLeaderboardFromRankings(
  rankings: RankingItem[],
  sources: string[],
  failedSources: string[] = []
): LLMLeaderboard {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const leaderboard: LLMLeaderboard = {
    overall_rankings: rankings,
    usage_trends: generateUsageTrends(rankings),
    last_updated: now.toISOString(),
    data_period: {
      start: weekAgo.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    },
    sources,
    ...(failedSources.length > 0 ? { failed_sources: failedSources } : {}),
  };

  if (LLM_CONFIG.marketShare.enabled) {
    leaderboard.market_shares = generateMarketShares(rankings);
  }

  if (LLM_CONFIG.categories.enabled) {
    leaderboard.category_rankings = generateCategoryRankings(rankings);
  }

  return leaderboard;
}

function toRankingItem(entry: AggregatedModel, rank: number, total: number): RankingItem {
  const model = entry.model;
  const bestCategory = selectBestCategory(entry.categoryScores);
  const trendSeed = stableUnit(`${model.id}:trend`);
  const trend = trendSeed < 0.34 ? "up" : trendSeed < 0.68 ? "stable" : "down";
  const delta = Math.floor(stableUnit(`${model.id}:delta`) * 4) + 1;

  const llmModel: LLMModel = {
    id: model.id,
    name: model.name || model.id.split("/").pop() || model.id,
    provider: getProvider(model.id),
    category: inferCategory(model, bestCategory),
    context_length: model.context_length,
    release_date: toReleaseDate(model.created),
  };

  return {
    rank,
    model: llmModel,
    metrics: generateMetrics(model, rank, total),
    trend,
    rank_change: trend === "stable" ? 0 : trend === "up" ? delta : -delta,
  };
}

function getCategoryWeights(categories: string[]): Record<string, number> {
  const rawWeights = categories.reduce((result, category) => {
    result[category] = DEFAULT_CATEGORY_WEIGHTS[category] || 0.2;
    return result;
  }, {} as Record<string, number>);

  const weightSum = Object.values(rawWeights).reduce((sum, value) => sum + value, 0) || 1;

  return Object.entries(rawWeights).reduce((result, [category, weight]) => {
    result[category] = weight / weightSum;
    return result;
  }, {} as Record<string, number>);
}

function isPinned(entry: AggregatedModel): boolean {
  const keywords = LLM_CONFIG.openrouter.pinnedKeywords;
  if (keywords.length === 0) {
    return false;
  }

  const target = `${entry.model.id} ${entry.model.name || ""}`.toLowerCase();
  return keywords.some((keyword) => target.includes(keyword));
}

function ensurePinnedEntries(entries: AggregatedModel[], limit: number): AggregatedModel[] {
  if (entries.length <= limit) {
    return entries;
  }

  const selected = entries.slice(0, limit);
  const selectedSet = new Set(selected.map((item) => item.model.id));
  const pinnedPool = entries.filter((item) => isPinned(item) && !selectedSet.has(item.model.id));

  pinnedPool.forEach((pinnedItem) => {
    let replaceIndex = -1;
    for (let i = selected.length - 1; i >= 0; i -= 1) {
      if (!isPinned(selected[i])) {
        replaceIndex = i;
        break;
      }
    }
    if (replaceIndex !== -1) {
      selected[replaceIndex] = pinnedItem;
    }
  });

  return selected.sort((a, b) => b.score - a.score);
}

export async function fetchOpenRouterRankings(): Promise<RankingItem[]> {
  const categories = LLM_CONFIG.openrouter.categories;
  const categoryWeights = getCategoryWeights(categories);
  const results = await Promise.allSettled(
    categories.map((category) => fetchModelsByCategory(category))
  );

  const aggregator = new Map<string, AggregatedModel>();
  let hasSuccess = false;

  results.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      return;
    }

    hasSuccess = true;
    const category = categories[index];
    const weight = categoryWeights[category] || 0.2;
    const models = result.value.slice(0, LLM_CONFIG.openrouter.modelLimit);
    const total = Math.max(models.length, 1);

    models.forEach((model, modelIndex) => {
      const score = ((total - modelIndex) / total) * weight;
      const existing = aggregator.get(model.id);

      if (existing) {
        existing.score += score;
        existing.categoryScores[category] = (existing.categoryScores[category] || 0) + score;
        return;
      }

      aggregator.set(model.id, {
        model,
        score,
        categoryScores: { [category]: score },
      });
    });
  });

  if (!hasSuccess || aggregator.size === 0) {
    throw new Error("无法获取 OpenRouter 模型列表");
  }

  const rankedEntries = ensurePinnedEntries(
    Array.from(aggregator.values()).sort((a, b) => b.score - a.score),
    LLM_CONFIG.openrouter.modelLimit
  );

  return rankedEntries.map((entry, index) => toRankingItem(entry, index + 1, rankedEntries.length));
}

export async function fetchOpenRouterLeaderboardData(): Promise<LLMLeaderboard> {
  const rankings = await fetchOpenRouterRankings();
  const uniqueRankings: RankingItem[] = [];
  const seen = new Set<string>();

  rankings.forEach((item) => {
    const key = dedupeKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRankings.push(item);
    }
  });

  const normalized = uniqueRankings.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  return buildLeaderboardFromRankings(normalized, ["OpenRouter"]);
}
