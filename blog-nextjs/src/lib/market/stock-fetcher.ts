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
    // 使用 query1 替代 query2，添加更多 headers 模拟浏览器
    this.client = axios.create({
      baseURL: "https://query1.finance.yahoo.com",
      timeout: 20000, // 增加超时时间
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://finance.yahoo.com",
        "Origin": "https://finance.yahoo.com",
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

    try {
      // 批量获取股票数据（Yahoo Finance 支持一次请求多个股票）
      const symbolsParam = symbolList.join(",");
      console.log(`🔗 请求 URL: ${this.client.defaults.baseURL}/v7/finance/quote?symbols=${symbolsParam}`);

      const response = await this.client.get<YahooQuoteResponse>("/v7/finance/quote", {
        params: {
          symbols: symbolsParam,
        },
      });

      console.log(`📥 API 响应状态: ${response.status}`);
      console.log(`📥 API 响应数据:`, JSON.stringify(response.data, null, 2));

      const quotes = response.data.quoteResponse.result;
      console.log(`📊 获取到 ${quotes?.length || 0} 条股票数据`);

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

          // 避免请求过快
          await this.sleep(200);
        } catch (error) {
          console.error(`❌ 解析 ${quote.symbol} 数据失败:`, error);
          continue;
        }
      }
    } catch (error: any) {
      console.error("❌ 批量获取股票数据失败:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        stack: error.stack,
      });
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
