/**
 * 市场数据 API - 获取最新数据
 *
 * GET /api/market/latest
 *
 * 返回最新的加密货币和股票数据
 */

import { NextResponse } from "next/server";
import { getLatestCryptoData, getLatestStockData } from "@/lib/market/market-service";

export const revalidate = 60; // 缓存 60 秒

export async function GET() {
  try {
    // 并行获取加密货币和股票数据
    const [crypto, stocks] = await Promise.all([
      getLatestCryptoData(),
      getLatestStockData(),
    ]);

    return NextResponse.json(
      {
        crypto,
        stocks,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("获取最新市场数据失败:", error);

    return NextResponse.json(
      {
        crypto: [],
        stocks: [],
        error: "Failed to fetch market data",
      },
      {
        status: 500,
      }
    );
  }
}
