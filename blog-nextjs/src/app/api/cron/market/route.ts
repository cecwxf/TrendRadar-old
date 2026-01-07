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
    // 注意：为了方便手动触发，暂时移除认证检查
    // 如果需要安全性，可以添加其他验证方式（如 API key）

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
      console.log("📊 开始获取股票数据...");
      const stockFetcher = createStockFetcher({
        usePredefinedIndices: true,
        customStocks: [
          // 美股个股
          "TSLA",      // 特斯拉
          "GOOGL",     // Google
          "META",      // Meta
          // 港股个股
          "0700.HK",   // 腾讯控股
          "9660.HK",   // 地平线机器人
          "9988.HK",   // 阿里巴巴
          // A股个股
          "688047.SS", // 龙芯中科（科创板）
          "301536.SZ", // 星宸科技（创业板）
        ],
      });

      const stockItems = await stockFetcher.fetchCurrent();
      results.stocks.count = Object.keys(stockItems).length;
      console.log(`📊 成功获取 ${results.stocks.count} 个股票数据`);

      if (results.stocks.count > 0) {
        // 保存到数据库
        const saveResult = await saveStockData(stockItems);
        results.stocks.success = saveResult.success;
        results.stocks.error = saveResult.error || null;

        if (saveResult.success) {
          console.log(`✅ 成功保存 ${results.stocks.count} 条股票数据`);
        } else {
          console.error(`❌ 保存股票数据失败:`, saveResult.error);
        }

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
      } else {
        console.warn("⚠️ 未获取到任何股票数据");
      }
    } catch (error: any) {
      console.error("❌ 获取股票数据失败:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      results.stocks.error = String(error.message || error);
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
 * 允许通过浏览器直接访问来手动触发数据更新
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
