/**
 * 区块链市值排行榜 API
 *
 * GET /api/market/blockchain-leaderboard?limit=20
 */

import { NextResponse } from "next/server";
import { fetchBlockchainMarketCapLeaderboard } from "@/lib/market/blockchain-leaderboard";

export const revalidate = 300; // 5分钟

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") || "20");
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 20;

    const rankings = await fetchBlockchainMarketCapLeaderboard(limit);

    return NextResponse.json(
      {
        rankings,
        count: rankings.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("获取区块链市值排行榜失败:", error);
    return NextResponse.json(
      {
        rankings: [],
        error: "Failed to fetch blockchain market cap leaderboard",
      },
      { status: 500 }
    );
  }
}

