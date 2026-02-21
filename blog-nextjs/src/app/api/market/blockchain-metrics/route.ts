/**
 * 区块链宏观指标 API
 *
 * GET /api/market/blockchain-metrics
 */

import { NextResponse } from "next/server";
import { fetchBlockchainMacroMetrics } from "@/lib/market/blockchain-metrics";

export const revalidate = 300; // 5分钟

export async function GET() {
  try {
    const metrics = await fetchBlockchainMacroMetrics();
    return NextResponse.json(
      {
        metrics,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("获取区块链宏观指标失败:", error);
    return NextResponse.json(
      {
        metrics: {},
        error: "Failed to fetch blockchain metrics",
      },
      { status: 500 }
    );
  }
}

