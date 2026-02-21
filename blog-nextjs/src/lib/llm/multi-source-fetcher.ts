/**
 * LLM 多数据源聚合入口
 *
 * 支持:
 * - openrouter: 闭源+开源混合覆盖
 * - huggingface: 以开源模型为主
 * - hybrid: 优先 OpenRouter，补充 HuggingFace
 * - mock: 演示数据
 */

import type { LLMLeaderboard, RankingItem } from "@/types/llm";
import { LLM_CONFIG } from "./config";
import { fetchLeaderboardData as fetchHuggingFaceLeaderboard } from "./huggingface-fetcher";
import {
  buildLeaderboardFromRankings,
  fetchOpenRouterLeaderboardData,
} from "./openrouter-fetcher";
import { generateLeaderboardData } from "./mock-data";

function normalizeModelName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dedupeKey(item: RankingItem): string {
  return `${item.model.provider.toLowerCase()}::${normalizeModelName(item.model.name || item.model.id)}`;
}

function withSourceMeta(
  data: LLMLeaderboard,
  sources: string[],
  failedSources: string[] = []
): LLMLeaderboard {
  const mergedSources = Array.from(new Set([...(data.sources || []), ...sources]));
  const mergedFailed = Array.from(new Set([...(data.failed_sources || []), ...failedSources]));

  return {
    ...data,
    sources: mergedSources,
    ...(mergedFailed.length > 0 ? { failed_sources: mergedFailed } : {}),
  };
}

function mergeRankings(primary: RankingItem[], secondary: RankingItem[]): RankingItem[] {
  const seen = new Set<string>();
  const merged: RankingItem[] = [];

  primary.forEach((item) => {
    const key = dedupeKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  secondary.forEach((item) => {
    const key = dedupeKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  return merged
    .slice(0, LLM_CONFIG.hybrid.modelLimit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

async function fetchHybridLeaderboardData(): Promise<LLMLeaderboard> {
  const [openRouterResult, huggingFaceResult] = await Promise.allSettled([
    fetchOpenRouterLeaderboardData(),
    fetchHuggingFaceLeaderboard(),
  ]);

  if (
    openRouterResult.status === "rejected" &&
    huggingFaceResult.status === "rejected"
  ) {
    throw new Error("OpenRouter 与 HuggingFace 均不可用");
  }

  if (
    openRouterResult.status === "fulfilled" &&
    huggingFaceResult.status === "rejected"
  ) {
    return withSourceMeta(openRouterResult.value, ["OpenRouter"], ["HuggingFace"]);
  }

  if (
    openRouterResult.status === "rejected" &&
    huggingFaceResult.status === "fulfilled"
  ) {
    return withSourceMeta(huggingFaceResult.value, ["HuggingFace"], ["OpenRouter"]);
  }

  const openRouterData = (openRouterResult as PromiseFulfilledResult<LLMLeaderboard>).value;
  const huggingFaceData = (huggingFaceResult as PromiseFulfilledResult<LLMLeaderboard>).value;
  const mergedRankings = mergeRankings(
    openRouterData.overall_rankings,
    huggingFaceData.overall_rankings
  );

  return buildLeaderboardFromRankings(mergedRankings, ["OpenRouter", "HuggingFace"]);
}

export async function fetchLeaderboardDataByConfig(): Promise<LLMLeaderboard> {
  switch (LLM_CONFIG.dataSource) {
    case "openrouter":
      return fetchOpenRouterLeaderboardData();
    case "huggingface":
      return fetchHuggingFaceLeaderboard();
    case "hybrid":
      return fetchHybridLeaderboardData();
    case "mock":
      return {
        ...generateLeaderboardData(),
        sources: ["Mock"],
      };
    default:
      return fetchHybridLeaderboardData();
  }
}
