/**
 * 市场数据定时更新 API
 *
 * POST /api/cron/market
 *
 * 由 Vercel Cron Jobs 定时调用，获取最新市场数据并保存到 Supabase
 *
 * vercel.json 配置示例：
 * {
 *   "crons": [{
 *     "path": "/api/cron/market",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createCryptoFetcher } from "@/lib/market/crypto-fetcher";
import { createStockFetcher } from "@/lib/market/stock-fetcher";
import {
  saveCryptoData,
  saveStockData,
  savePriceHistory,
} from "@/lib/market/market-service";

export const runtime = "nodejs";
export const maxDuration = 60; // 最长运行 60 秒

export async function POST(request: NextRequest) {
  try {
    // 检查是否是手动触发
    const url = new URL(request.url);
    const isManualTrigger = url.searchParams.get('manual') === 'true';

    // 验证 Cron Secret（仅在生产环境且非手动触发时）
    if (process.env.NODE_ENV === "production" && !isManualTrigger) {
      const authHeader = request.headers.get("authorization");
      const cronSecret = process.env.CRON_SECRET;

      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("🔄 开始更新市场数据...");

    const results = {
      crypto: { success: false, count: 0, error: null as string | null },
      stocks: { success: false, count: 0, error: null as string | null },
      priceHistory: { success: false, count: 0, error: null as string | null },
    };

    // 1. 获取加密货币数据
    try {
      const cryptoFetcher = createCryptoFetcher({
        symbols: ["BTC", "ETH", "BNB", "SOL"], // 可配置
        proxyUrl: process.env.HTTP_PROXY || process.env.HTTPS_PROXY,
      });

      const cryptoItems = await cryptoFetcher.fetchPrices();
      results.crypto.count = Object.keys(cryptoItems).length;

      if (results.crypto.count > 0) {
        // 保存到数据库
        const saveResult = await saveCryptoData(cryptoItems);
        results.crypto.success = saveResult.success;
        results.crypto.error = saveResult.error || null;

        // 保存价格历史（24小时）
        for (const [symbol, item] of Object.entries(cryptoItems)) {
          try {
            const history = await cryptoFetcher.fetchHistorical(symbol, 1, "hourly");
            if (history.length > 0) {
              await savePriceHistory(symbol, "crypto", history);
              results.priceHistory.count += history.length;
            }
          } catch (error) {
            console.error(`获取 ${symbol} 历史数据失败:`, error);
          }
        }
        results.priceHistory.success = true;
      }
    } catch (error) {
      console.error("获取加密货币数据失败:", error);
      results.crypto.error = String(error);
    }

    // 2. 获取股票数据
    try {
      const stockFetcher = createStockFetcher({
        usePredefinedIndices: true,
      });

      const stockItems = await stockFetcher.fetchCurrent();
      results.stocks.count = Object.keys(stockItems).length;

      if (results.stocks.count > 0) {
        // 保存到数据库
        const saveResult = await saveStockData(stockItems);
        results.stocks.success = saveResult.success;
        results.stocks.error = saveResult.error || null;

        // 保存价格历史（当日）
        for (const [symbol, item] of Object.entries(stockItems)) {
          try {
            const history = await stockFetcher.fetchHistorical(symbol, "1d", "1h");
            if (history.length > 0) {
              await savePriceHistory(symbol, "stock", history);
              results.priceHistory.count += history.length;
            }
          } catch (error) {
            console.error(`获取 ${symbol} 历史数据失败:`, error);
          }
        }
      }
    } catch (error) {
      console.error("获取股票数据失败:", error);
      results.stocks.error = String(error);
    }

    console.log("✅ 市场数据更新完成:", results);

    return NextResponse.json(
      {
        success: true,
        message: "Market data updated successfully",
        results,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Cron job 执行失败:", error);

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

/**
 * GET 方法用于手动触发更新
 *
 * 允许手动触发数据更新（不需要认证）
 * Vercel Cron Jobs 会使用 POST 方法（带认证）
 */
export async function GET(request: NextRequest) {
  // 允许手动触发，跳过认证检查
  // 创建一个新的请求对象，设置一个标记表示是手动触发
  const url = new URL(request.url);
  url.searchParams.set('manual', 'true');

  // 直接执行更新逻辑（跳过 POST 的认证）
  return POST(request);
}
