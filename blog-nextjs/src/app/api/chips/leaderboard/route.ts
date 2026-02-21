/**
 * AI 芯片排行榜 API
 *
 * GET /api/chips/leaderboard
 */

import { NextResponse } from "next/server";
import { fetchAIChipLeaderboardData } from "@/lib/chips/chip-leaderboard-fetcher";
import type { AIChipLeaderboardResponse } from "@/types/chips";

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await fetchAIChipLeaderboardData();

    const response: AIChipLeaderboardResponse = {
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
    console.error("获取 AI 芯片排行榜失败:", error);

    const response: AIChipLeaderboardResponse = {
      success: false,
      error: "Failed to fetch AI chip leaderboard data",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
