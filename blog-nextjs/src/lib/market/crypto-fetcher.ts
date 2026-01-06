/**
 * 加密货币数据抓取器
 *
 * 使用 CoinGecko 公开 API 获取 BTC/ETH 等加密货币的实时价格和历史数据
 * CoinGecko API 免费，无需密钥，在中国大陆可访问
 */

import axios, { AxiosInstance } from "axios";
import type {
  CryptoItem,
  PricePoint,
  CryptoFetcherConfig,
  CoinGeckoSimplePriceResponse,
  CoinGeckoMarketChartResponse,
} from "@/types/market";

/**
 * CoinGecko 币种ID映射
 */
const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",    // 公链
  SOL: "solana",         // 公链
  AVAX: "avalanche-2",   // 公链
  MATIC: "matic-network", // 公链
  UNI: "uniswap",        // DeFi
  AAVE: "aave",          // DeFi
  LINK: "chainlink",     // DeFi/Oracle
  XRP: "ripple",
};

/**
 * 加密货币数据抓取器
 *
 * 功能：
 * - 获取实时价格
 * - 获取24小时涨跌幅
 * - 获取24小时交易量
 * - 获取历史价格数据（用于图表）
 */
export class CryptoFetcher {
  private readonly BASE_URL = "https://api.coingecko.com/api/v3";
  private readonly symbols: string[];
  private readonly client: AxiosInstance;

  constructor(config?: CryptoFetcherConfig) {
    this.symbols = config?.symbols || ["BTC", "ETH"];

    // 创建 axios 实例
    this.client = axios.create({
      baseURL: this.BASE_URL,
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // 设置代理（如果提供）
    if (config?.proxyUrl) {
      this.client.defaults.proxy = {
        host: new URL(config.proxyUrl).hostname,
        port: parseInt(new URL(config.proxyUrl).port),
      };
    }
  }

  /**
   * 获取当前价格和24小时统计数据
   *
   * @returns 加密货币数据字典
   */
  async fetchPrices(): Promise<Record<string, CryptoItem>> {
    const result: Record<string, CryptoItem> = {};

    for (const symbol of this.symbols) {
      try {
        const item = await this.fetchSinglePrice(symbol);
        if (item) {
          result[symbol] = item;
          console.log(
            `✅ 获取 ${symbol} 成功: $${item.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (${item.price_change_24h >= 0 ? "+" : ""}${item.price_change_24h.toFixed(2)}%)`
          );
        }

        // 避免请求过快
        await this.sleep(100);
      } catch (error) {
        console.error(`❌ 获取 ${symbol} 失败:`, error);
        continue;
      }
    }

    return result;
  }

  /**
   * 获取单个加密货币的价格
   *
   * @param symbol - 加密货币符号（如 "BTC", "ETH"）
   * @returns CryptoItem 或 null
   */
  private async fetchSinglePrice(symbol: string): Promise<CryptoItem | null> {
    // 获取 CoinGecko 的币种ID
    const coinId = COIN_IDS[symbol];
    if (!coinId) {
      console.warn(`⚠️ 不支持的币种: ${symbol}`);
      return null;
    }

    try {
      // CoinGecko API: /simple/price
      const response = await this.requestWithRetry<CoinGeckoSimplePriceResponse>(
        "/simple/price",
        {
          ids: coinId,
          vs_currencies: "usd",
          include_24hr_change: "true",
          include_24hr_vol: "true",
        }
      );

      if (!response) {
        return null;
      }

      // CoinGecko 返回格式: {"bitcoin": {"usd": 42000, "usd_24h_change": 2.5, "usd_24h_vol": 1000000000}}
      const coinData = response[coinId];
      if (!coinData) {
        console.warn(`⚠️ ${symbol} 无数据`);
        return null;
      }

      // 解析数据
      return {
        symbol,
        price: coinData.usd || 0,
        price_change_24h: coinData.usd_24h_change || 0,
        volume_24h: coinData.usd_24h_vol || 0,
        timestamp: new Date().toISOString(),
        exchange: "CoinGecko",
        price_history: [], // 稍后通过 fetchHistorical 填充
      };
    } catch (error) {
      console.error(`解析 ${symbol} 数据失败:`, error);
      return null;
    }
  }

  /**
   * 获取历史价格数据（用于绘制图表）
   *
   * 使用CoinGecko免费API获取历史数据
   * API: /coins/{id}/market_chart?vs_currency=usd&days={days}
   *
   * @param symbol - 加密货币符号（如 "BTC"）
   * @param days - 历史天数 (1=24h, 7=7d, 30=30d, 365=1y, max=全部历史)
   * @param interval - 时间间隔 ("hourly" 或 "daily")
   * @returns 历史价格数据列表
   */
  async fetchHistorical(
    symbol: string,
    days: number = 1,
    interval: "hourly" | "daily" = "hourly"
  ): Promise<PricePoint[]> {
    const coinId = COIN_IDS[symbol];
    if (!coinId) {
      console.warn(`⚠️ ${symbol} 不在支持列表中`);
      return [];
    }

    try {
      // CoinGecko market_chart API
      const response = await this.client.get<CoinGeckoMarketChartResponse>(
        `/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: "usd",
            days,
            interval: days <= 90 ? interval : "daily", // >90天自动切换到daily
          },
        }
      );

      const data = response.data;

      // 解析价格数据: data.prices = [[timestamp_ms, price], ...]
      const prices = data.prices || [];
      if (prices.length === 0) {
        return [];
      }

      // 转换格式
      const history: PricePoint[] = prices.map(([timestampMs, price]) => {
        const dt = new Date(timestampMs);
        return {
          timestamp: dt.toISOString().replace("T", " ").substring(0, 19),
          price,
        };
      });

      return history;
    } catch (error) {
      console.error(`❌ 获取 ${symbol} 历史数据失败:`, error);
      return [];
    }
  }

  /**
   * 带重试机制的HTTP请求
   *
   * @param url - 请求URL（相对路径）
   * @param params - 请求参数
   * @param maxRetries - 最大重试次数
   * @returns 响应数据或 null
   */
  private async requestWithRetry<T>(
    url: string,
    params: Record<string, string>,
    maxRetries: number = 2
  ): Promise<T | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.get<T>(url, { params });
        return response.data;
      } catch (error) {
        if (attempt < maxRetries) {
          // 指数退避 + 随机抖动
          const waitTime = 2 ** attempt * 1000 + Math.random() * 1000;
          console.warn(
            `⚠️ 请求失败，${(waitTime / 1000).toFixed(1)}秒后重试... (尝试 ${attempt + 1}/${maxRetries})`
          );
          await this.sleep(waitTime);
        } else {
          console.error(`❌ 请求失败（已重试${maxRetries}次）:`, error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 创建加密货币抓取器实例（工厂函数）
 */
export function createCryptoFetcher(config?: CryptoFetcherConfig): CryptoFetcher {
  return new CryptoFetcher(config);
}
