/**
 * 股票数据抓取器
 *
 * 使用 Yahoo Finance API 获取美股、港股、A股的指数和个股数据
 */

import axios, { AxiosInstance } from "axios";
import type { StockItem, StockFetcherConfig, PricePoint } from "@/types/market";

/**
 * 预定义的主要指数
 */
const PREDEFINED_INDICES: Record<
  string,
  { name: string; market: "US" | "HK" | "CN" }
> = {
  // 美股三大指数
  "^GSPC": { name: "S&P 500", market: "US" },
  "^IXIC": { name: "Nasdaq", market: "US" },
  "^DJI": { name: "道琼斯指数", market: "US" },

  // 港股
  "^HSI": { name: "恒生指数", market: "HK" },

  // A股
  "000001.SS": { name: "上证指数", market: "CN" },
  "399001.SZ": { name: "深证成指", market: "CN" },
  "399006.SZ": { name: "创业板指", market: "CN" },
};

/**
 * Yahoo Finance API 响应类型
 */
interface YahooQuoteResponse {
  quoteResponse: {
    result: Array<{
      symbol: string;
      longName?: string;
      shortName?: string;
      regularMarketPrice?: number;
      regularMarketPreviousClose?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      regularMarketVolume?: number;
    }>;
    error: any;
  };
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
    error: any;
  };
}

/**
 * 股票数据抓取器
 *
 * 功能：
 * - 获取美股主要指数（S&P 500, Nasdaq, Dow Jones）
 * - 获取港股恒生指数
 * - 获取A股三大指数（上证、深证、创业板）
 * - 获取自定义个股
 * - 获取历史价格数据
 */
export class StockFetcher {
  private readonly symbols: Record<string, { name: string; market: "US" | "HK" | "CN" }>;
  private readonly client: AxiosInstance;

  constructor(config?: StockFetcherConfig) {
    this.symbols = {};

    // 添加预定义指数
    if (config?.usePredefinedIndices !== false) {
      Object.assign(this.symbols, PREDEFINED_INDICES);
    }

    // 添加自定义股票
    if (config?.customStocks && config.customStocks.length > 0) {
      for (const symbol of config.customStocks) {
        this.symbols[symbol] = {
          name: symbol, // 稍后会从API获取完整名称
          market: this.detectMarket(symbol),
        };
      }
    }

    // 创建 axios 实例
    // Yahoo Finance v7 API 经常返回 401
    // 尝试使用 yh-finance.p.rapidapi.com 作为备用（如果有 API key）
    // 或者使用 Finnhub/Alpha Vantage
    this.client = axios.create({
      baseURL: "https://query1.finance.yahoo.com",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });
  }

  /**
   * 根据股票代码检测所属市场
   */
  private detectMarket(symbol: string): "US" | "HK" | "CN" {
    if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) {
      return "CN"; // A股
    } else if (symbol.endsWith(".HK")) {
      return "HK"; // 港股
    } else {
      return "US"; // 默认美股
    }
  }

  /**
   * 获取所有配置股票的当前价格
   *
   * @returns 股票数据字典
   */
  async fetchCurrent(): Promise<Record<string, StockItem>> {
    const result: Record<string, StockItem> = {};
    const symbolList = Object.keys(this.symbols);

    if (symbolList.length === 0) {
      console.warn("⚠️ 没有配置任何股票代码");
      return result;
    }

    console.log(`📊 准备获取 ${symbolList.length} 只股票数据:`, symbolList);

    // 分批获取，每批最多5只股票，避免触发反爬虫
    const BATCH_SIZE = 5;
    const batches: string[][] = [];
    for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
      batches.push(symbolList.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 分为 ${batches.length} 批次获取，每批最多 ${BATCH_SIZE} 只股票`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📊 获取第 ${batchIndex + 1}/${batches.length} 批:`, batch);

      try {
        // 尝试使用 v8 chart API 作为替代方案
        // 对每个股票单独请求以避免批量请求被拒绝
        const quotes: any[] = [];

        for (const symbol of batch) {
          try {
            console.log(`🔗 请求 ${symbol}...`);

            // 使用 v8/finance/chart API，只获取最新数据点
            const chartResponse = await this.client.get(`/v8/finance/chart/${symbol}`, {
              params: {
                interval: "1d",
                range: "1d",
              },
            });

            const chartResult = chartResponse.data?.chart?.result?.[0];
            if (!chartResult) {
              console.warn(`⚠️ ${symbol} 无图表数据`);
              continue;
            }

            const meta = chartResult.meta;
            const quote: any = {
              symbol: symbol,
              longName: meta.longName,
              shortName: meta.shortName || meta.symbol,
              regularMarketPrice: meta.regularMarketPrice,
              regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose,
              regularMarketChange: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice),
              regularMarketChangePercent: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice)) / (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice)) * 100,
              regularMarketVolume: 0,
            };

            quotes.push(quote);
            console.log(`✓ ${symbol} 获取成功`);

            // 避免请求过快
            await this.sleep(300);
          } catch (error: any) {
            console.error(`❌ ${symbol} 获取失败:`, error.message);
            continue;
          }
        }

        console.log(`📊 第 ${batchIndex + 1} 批获取到 ${quotes.length} 条数据`);

          for (const quote of quotes) {
          try {
            const symbol = quote.symbol;
            const symbolInfo = this.symbols[symbol];

            if (!symbolInfo) continue;

            // 获取当前价格
            const price = quote.regularMarketPrice || quote.regularMarketPreviousClose || 0;

            if (!price) {
              console.warn(`⚠️ ${symbol} 无法获取价格数据`);
              continue;
            }

            // 获取价格变化
            const previousClose = quote.regularMarketPreviousClose || price;
            const change = quote.regularMarketChange || price - previousClose;
            const changePercent = quote.regularMarketChangePercent || (change / previousClose) * 100;

            // 获取成交量
            const volume = quote.regularMarketVolume || 0;

            // 获取完整名称
            const name = quote.longName || quote.shortName || symbolInfo.name;

            const stockItem: StockItem = {
              symbol,
              name,
              price,
              change,
              change_percent: changePercent,
              volume,
              timestamp: new Date().toISOString(),
              market: symbolInfo.market,
              price_history: [],
            };

            result[symbol] = stockItem;

            const changeSymbol = changePercent >= 0 ? "▲" : "▼";
            console.log(
              `✅ 获取 ${name} 成功: ${price.toFixed(2)} ${changeSymbol} ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`
            );
          } catch (error) {
            console.error(`❌ 解析 ${quote.symbol} 数据失败:`, error);
            continue;
          }
        }

        // 批次之间延迟，避免触发频率限制
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ 等待 1 秒后继续下一批...`);
          await this.sleep(1000);
        }
      } catch (error: any) {
        console.error(`❌ 第 ${batchIndex + 1} 批获取失败:`, {
          batch,
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
        });
        // 继续处理下一批
        continue;
      }
    }

    console.log(`✅ 最终返回 ${Object.keys(result).length} 只股票数据`);
    return result;
  }

  /**
   * 获取历史价格数据（用于绘制图表）
   *
   * @param symbol - 股票代码
   * @param period - 时间周期：1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
   * @param interval - 数据间隔：1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
   * @returns 价格历史列表
   */
  async fetchHistorical(
    symbol: string,
    period: string = "1d",
    interval: string = "1h"
  ): Promise<PricePoint[]> {
    try {
      const response = await this.client.get<YahooChartResponse>(`/v8/finance/chart/${symbol}`, {
        params: {
          range: period,
          interval,
        },
      });

      const chartData = response.data.chart.result?.[0];

      if (!chartData || !chartData.timestamp || !chartData.indicators.quote[0]) {
        console.warn(`⚠️ ${symbol} 无历史数据`);
        return [];
      }

      const timestamps = chartData.timestamp;
      const prices = chartData.indicators.quote[0].close;

      // 组合时间戳和价格
      const history: PricePoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (prices[i] !== null && prices[i] !== undefined) {
          const dt = new Date(timestamps[i] * 1000);
          history.push({
            timestamp: dt.toISOString(),
            price: prices[i],
          });
        }
      }

      console.log(`✅ 获取 ${symbol} 历史数据成功: ${history.length} 个数据点`);
      return history;
    } catch (error) {
      console.error(`❌ 获取 ${symbol} 历史数据失败:`, error);
      return [];
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 创建股票抓取器实例（工厂函数）
 */
export function createStockFetcher(config?: StockFetcherConfig): StockFetcher {
  return new StockFetcher(config);
}
