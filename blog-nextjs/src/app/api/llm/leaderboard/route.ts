/**
 * LLM 排行榜 API - 获取排行榜数据
 *
 * GET /api/llm/leaderboard
 *
 * 返回 LLM 模型排行榜数据，包括排名、使用趋势、市场份额等
 * 数据来源: OpenRouter / HuggingFace / Hybrid / Mock（可配置）
 */

import { NextResponse } from "next/server";
import { fetchLeaderboardDataByConfig } from "@/lib/llm/multi-source-fetcher";
import { generateLeaderboardData } from "@/lib/llm/mock-data";
import type { LLMLeaderboardResponse } from "@/types/llm";

export const revalidate = 3600; // 缓存 1 小时

export async function GET() {
  try {
    // 根据配置选择数据源，失败时回退到模拟数据
    let data;
    try {
      data = await fetchLeaderboardDataByConfig();
      console.log("✅ 成功获取 LLM 排行榜真实数据");
    } catch (sourceError) {
      console.warn("⚠️ 真实数据源获取失败，使用模拟数据:", sourceError);
      data = {
        ...generateLeaderboardData(),
        sources: ["Mock"],
      };
    }

    const response: LLMLeaderboardResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("获取 LLM 排行榜数据失败:", error);

    const response: LLMLeaderboardResponse = {
      success: false,
      error: "Failed to fetch LLM leaderboard data",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 500,
    });
  }
}
