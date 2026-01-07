/**
 * 种子数据插入 API（开发/演示用）
 *
 * POST /api/seed-market-data
 *
 * 插入模拟的加密货币和股票数据，用于测试和演示
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saveCryptoData,
  saveStockData,
} from "@/lib/market/market-service";
import type { CryptoItem, StockItem } from "@/types/market";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("🌱 开始插入种子数据...");

    // 模拟加密货币数据
    const cryptoItems: Record<string, CryptoItem> = {
      BTC: {
        symbol: "BTC",
        price: 43250.50,
        price_change_24h: 2.35,
        volume_24h: 28500000000,
        exchange: "CoinGecko",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
      ETH: {
        symbol: "ETH",
        price: 2285.75,
        price_change_24h: -1.25,
        volume_24h: 15200000000,
        exchange: "CoinGecko",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
      BNB: {
        symbol: "BNB",
        price: 312.40,
        price_change_24h: 3.15,
        volume_24h: 980000000,
        exchange: "CoinGecko",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
      SOL: {
        symbol: "SOL",
        price: 98.65,
        price_change_24h: 5.80,
        volume_24h: 2100000000,
        exchange: "CoinGecko",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
    };

    // 模拟股票数据
    const stockItems: Record<string, StockItem> = {
      "^GSPC": {
        symbol: "^GSPC",
        name: "S&P 500",
        price: 4783.35,
        change: 28.50,
        change_percent: 0.60,
        volume: 0,
        market: "US",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
      "^DJI": {
        symbol: "^DJI",
        name: "道琼斯",
        price: 37863.80,
        change: -45.20,
        change_percent: -0.12,
        volume: 0,
        market: "US",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
      "^IXIC": {
        symbol: "^IXIC",
        name: "纳斯达克",
        price: 15311.62,
        change: 98.45,
        change_percent: 0.65,
        volume: 0,
        market: "US",
        timestamp: new Date().toISOString(),
        price_history: [],
      },
    };

    const results = {
      crypto: { success: false, count: 0, error: null as string | null },
      stocks: { success: false, count: 0, error: null as string | null },
    };

    // 保存加密货币数据
    try {
      const cryptoResult = await saveCryptoData(cryptoItems);
      results.crypto.success = cryptoResult.success;
      results.crypto.count = Object.keys(cryptoItems).length;
      results.crypto.error = cryptoResult.error || null;
      console.log("✅ 加密货币数据已插入:", results.crypto);
    } catch (error) {
      console.error("❌ 插入加密货币数据失败:", error);
      results.crypto.error = String(error);
    }

    // 保存股票数据
    try {
      const stockResult = await saveStockData(stockItems);
      results.stocks.success = stockResult.success;
      results.stocks.count = Object.keys(stockItems).length;
      results.stocks.error = stockResult.error || null;
      console.log("✅ 股票数据已插入:", results.stocks);
    } catch (error) {
      console.error("❌ 插入股票数据失败:", error);
      results.stocks.error = String(error);
    }

    console.log("🎉 种子数据插入完成!");

    return NextResponse.json(
      {
        success: true,
        message: "种子数据插入成功",
        results,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 插入种子数据失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET 方法也支持（方便测试）
export async function GET(request: NextRequest) {
  return POST(request);
}
