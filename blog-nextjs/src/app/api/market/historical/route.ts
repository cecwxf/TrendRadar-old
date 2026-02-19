/**
 * 市场历史数据 API - 获取近1年日线数据
 *
 * GET /api/market/historical
 *
 * 返回 BTC、ETH、S&P 500、上证指数、恒生指数、恒生科技近1年的日线历史价格
 */

import { NextResponse } from "next/server";
import type { PricePoint } from "@/types/market";

export const revalidate = 86400; // 缓存24小时

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp_ms, price]
}

interface EastmoneyKlineResponse {
  rc?: number;
  data?: {
    klines?: string[];
  } | null;
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

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function keepRecentYear(points: PricePoint[]): PricePoint[] {
  const cutoff = Date.now() - ONE_YEAR_MS;
  const recent = points.filter((point) => {
    const ts = new Date(point.timestamp).getTime();
    return !Number.isNaN(ts) && ts >= cutoff;
  });

  if (recent.length > 0) {
    return recent;
  }

  // If date parsing/format fails for a provider, keep a bounded tail.
  return points.slice(-365);
}

/**
 * 从 CoinGecko 获取加密货币历史数据
 */
async function fetchCryptoHistorical(coinId: string): Promise<PricePoint[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const response = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      console.error(`CoinGecko ${coinId} 请求失败: ${response.status}`);
      return [];
    }

    const data: CoinGeckoMarketChartResponse = await response.json();
    const prices = data.prices || [];

    const points = prices
      .map(([timestampMs, price]) => ({
        timestamp: new Date(timestampMs).toISOString().split("T")[0],
        price,
      }))
      .filter(
        (p) => p.price != null && !isNaN(p.price)
      );

    return keepRecentYear(points);
  } catch (error) {
    console.error(`获取 ${coinId} 历史数据失败:`, error);
    return [];
  }
}

/**
 * 从 Binance 获取加密货币历史数据（CoinGecko 失败时回退）
 */
async function fetchCryptoHistoricalFromBinance(coinId: string): Promise<PricePoint[]> {
  const symbolMap: Record<string, string> = {
    bitcoin: "BTCUSDT",
    ethereum: "ETHUSDT",
  };
  const pair = symbolMap[coinId];
  if (!pair) return [];

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=365`;
    const response = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      console.error(`Binance ${pair} 请求失败: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    const points: PricePoint[] = [];
    for (const entry of data as unknown[]) {
      if (!Array.isArray(entry) || entry.length < 5) continue;
      const openTime = Number(entry[0]);
      const close = Number(entry[4]);
      if (Number.isNaN(openTime) || Number.isNaN(close)) continue;
      points.push({
        timestamp: new Date(openTime).toISOString().split("T")[0],
        price: close,
      });
    }

    return keepRecentYear(points);
  } catch (error) {
    console.error(`获取 ${pair} 历史数据失败:`, error);
    return [];
  }
}

async function fetchStockHistoricalFromEastmoney(secid: string): Promise<PricePoint[]> {
  try {
    const url =
      `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${encodeURIComponent(secid)}` +
      "&fields1=f1,f2,f3,f4,f5,f6" +
      "&fields2=f51,f52,f53,f54,f55,f56,f57,f58" +
      "&klt=101&fqt=0&beg=20200101&end=20990101";

    const response = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      console.error(`Eastmoney ${secid} 请求失败: ${response.status}`);
      return [];
    }

    const data: EastmoneyKlineResponse = await response.json();
    const klines = data.data?.klines || [];
    if (!Array.isArray(klines) || klines.length === 0) {
      return [];
    }

    const points = klines
      .map((line) => {
        const parts = line.split(",");
        const date = parts[0];
        const close = Number(parts[2]);
        if (!date || Number.isNaN(close)) return null;
        return { timestamp: date, price: close };
      })
      .filter((point): point is PricePoint => point !== null);

    return keepRecentYear(points);
  } catch (error) {
    console.error(`获取 Eastmoney ${secid} 历史数据失败:`, error);
    return [];
  }
}

async function fetchStockHistoricalFromStooq(stooqSymbol: string): Promise<PricePoint[]> {
  try {
    const end = new Date();
    const start = new Date(Date.now() - ONE_YEAR_MS);
    const toYmd = (dt: Date) =>
      `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
    const d1 = toYmd(start);
    const d2 = toYmd(end);
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d&d1=${d1}&d2=${d2}`;
    const response = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 86400 },
    });
    if (!response.ok) {
      console.error(`Stooq ${stooqSymbol} 请求失败: ${response.status}`);
      return [];
    }

    const csv = await response.text();
    if (!csv || csv.includes("No data")) {
      return [];
    }

    const lines = csv.trim().split("\n");
    if (lines.length <= 1) return [];

    const points = lines
      .slice(1)
      .map((line) => {
        const parts = line.split(",");
        const date = parts[0];
        const close = Number(parts[4]);
        if (!date || Number.isNaN(close)) return null;
        return { timestamp: date, price: close };
      })
      .filter((point): point is PricePoint => point !== null);

    return keepRecentYear(points);
  } catch (error) {
    console.error(`获取 Stooq ${stooqSymbol} 历史数据失败:`, error);
    return [];
  }
}

/**
 * 从 Yahoo Finance 获取股票历史数据（最后回退）
 */
async function fetchStockHistoricalFromYahoo(symbol: string): Promise<PricePoint[]> {
  try {
    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=1y&interval=1d`;
    const response = await fetch(url, {
      headers: {
        ...HEADERS,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      next: { revalidate: 86400 },
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

    return keepRecentYear(points);
  } catch (error) {
    console.error(`获取 ${symbol} 历史数据失败:`, error);
    return [];
  }
}

/**
 * 多源实时获取股票历史数据
 */
async function fetchStockHistorical(symbol: string): Promise<PricePoint[]> {
  const eastmoneyMap: Record<string, string> = {
    "000001.SS": "1.000001",
    "^HSI": "100.HSI",
    "3032.HK": "116.03032",
  };

  const stooqMap: Record<string, string> = {
    "^GSPC": "^spx",
    "^HSI": "^hsi",
    "3032.HK": "3032.hk",
  };

  const eastmoneySecid = eastmoneyMap[symbol];
  if (eastmoneySecid) {
    const points = await fetchStockHistoricalFromEastmoney(eastmoneySecid);
    if (points.length > 0) return points;
  }

  const stooqSymbol = stooqMap[symbol];
  if (stooqSymbol) {
    const points = await fetchStockHistoricalFromStooq(stooqSymbol);
    if (points.length > 0) return points;
  }

  return fetchStockHistoricalFromYahoo(symbol);
}

export async function GET() {
  try {
    const [btcFromCg, ethFromCg, sp500, sse, hsi, hstech] = await Promise.all([
      fetchCryptoHistorical("bitcoin"),
      fetchCryptoHistorical("ethereum"),
      fetchStockHistorical("^GSPC"),
      fetchStockHistorical("000001.SS"),
      fetchStockHistorical("^HSI"),
      fetchStockHistorical("3032.HK"), // 恒生科技ETF（^HSTECH Yahoo Finance无数据）
    ]);

    const [btc, eth] = await Promise.all([
      btcFromCg.length > 0 ? Promise.resolve(btcFromCg) : fetchCryptoHistoricalFromBinance("bitcoin"),
      ethFromCg.length > 0 ? Promise.resolve(ethFromCg) : fetchCryptoHistoricalFromBinance("ethereum"),
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
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
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
