/**
 * 市场历史数据 API - 获取近1年日线数据
 *
 * GET /api/market/historical
 *
 * 返回 BTC、ETH、S&P 500、上证指数、恒生指数、恒生科技近1年的日线历史价格
 */

import { NextResponse } from "next/server";
import type { PricePoint } from "@/types/market";

export const revalidate = 3600; // 缓存1小时

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp_ms, price]
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
      };
    }>;
  };
}

/**
 * 从 CoinGecko 获取加密货币历史数据
 */
async function fetchCryptoHistorical(coinId: string): Promise<PricePoint[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const response = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`CoinGecko ${coinId} 请求失败: ${response.status}`);
      return [];
    }

    const data: CoinGeckoMarketChartResponse = await response.json();
    const prices = data.prices || [];

    return prices
      .map(([timestampMs, price]) => ({
        timestamp: new Date(timestampMs).toISOString().split("T")[0],
        price,
      }))
      .filter(
        (p) => p.price != null && !isNaN(p.price)
      );
  } catch (error) {
    console.error(`获取 ${coinId} 历史数据失败:`, error);
    return [];
  }
}

/**
 * 从 Yahoo Finance 获取股票历史数据
 */
async function fetchStockHistorical(symbol: string): Promise<PricePoint[]> {
  try {
    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=1y&interval=1d`;
    const response = await fetch(url, {
      headers: {
        ...HEADERS,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance ${symbol} 请求失败: ${response.status}`);
      return [];
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      console.error(`Yahoo Finance ${symbol} 无数据`);
      return [];
    }

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const price = closes[i];
      if (price != null && !isNaN(price)) {
        points.push({
          timestamp: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
          price,
        });
      }
    }

    return points;
  } catch (error) {
    console.error(`获取 ${symbol} 历史数据失败:`, error);
    return [];
  }
}

export async function GET() {
  try {
    const [btc, eth, sp500, sse, hsi, hstech] = await Promise.all([
      fetchCryptoHistorical("bitcoin"),
      fetchCryptoHistorical("ethereum"),
      fetchStockHistorical("^GSPC"),
      fetchStockHistorical("000001.SS"),
      fetchStockHistorical("^HSI"),
      fetchStockHistorical("^HSTECH"),
    ]);

    return NextResponse.json(
      {
        btc,
        eth,
        sp500,
        sse,
        hsi,
        hstech,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("获取历史市场数据失败:", error);

    return NextResponse.json(
      {
        btc: [],
        eth: [],
        sp500: [],
        sse: [],
        hsi: [],
        hstech: [],
        error: "Failed to fetch historical market data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
