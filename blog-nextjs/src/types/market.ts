/**
 * 市场数据类型定义
 *
 * 包含加密货币、股票和市场数据的TypeScript类型
 */

/**
 * 价格历史数据点
 */
export interface PricePoint {
  timestamp: string; // ISO格式时间戳
  price: number;     // 价格
}

/**
 * 加密货币数据项
 */
export interface CryptoItem {
  symbol: string;              // 交易对符号，如 "BTC", "ETH"
  price: number;               // 当前价格（USD）
  price_change_24h: number;    // 24小时价格变化百分比
  volume_24h: number;          // 24小时交易量（USD）
  timestamp: string;           // 时间戳（ISO格式）
  exchange: string;            // 交易所名称，默认 "CoinGecko"
  price_history: PricePoint[]; // 价格历史（用于图表）
}

/**
 * 区块链市值榜数据项
 */
export interface BlockchainMarketCapItem {
  rank: number;                 // 市值排名
  id: string;                   // CoinGecko id
  symbol: string;               // 币种符号
  name: string;                 // 币种名称
  image?: string;               // 图标
  price: number;                // 当前价格（USD）
  market_cap: number;           // 市值（USD）
  fully_diluted_valuation: number; // 完全稀释估值（USD）
  volume_24h: number;           // 24h 成交额（USD）
  price_change_24h: number;     // 24h 涨跌幅（%）
  circulating_supply: number;   // 流通量
  total_supply: number;         // 总供应量
  max_supply: number;           // 最大供应量
  last_updated: string;         // 更新时间
  source: string;               // 数据源
}

/**
 * 股票数据项
 */
export interface StockItem {
  symbol: string;              // 股票代码，如 "^GSPC", "AAPL"
  name: string;                // 股票名称，如 "S&P 500"
  price: number;               // 当前价格
  change: number;              // 价格变化（绝对值）
  change_percent: number;      // 价格变化百分比
  volume: number;              // 成交量
  timestamp: string;           // 时间戳（ISO格式）
  market: "US" | "HK" | "CN";  // 市场类型
  price_history: PricePoint[]; // 价格历史（用于图表）
}

/**
 * 统一的市场数据容器
 *
 * 包含加密货币、股票数据，以及失败的数据源列表
 */
export interface MarketData {
  date: string;                             // 日期（YYYY-MM-DD）
  crawl_time: string;                       // 爬取时间（HH:MM）
  crypto_items: Record<string, CryptoItem>; // 加密货币数据，key为symbol
  stock_items: Record<string, StockItem>;   // 股票数据，key为symbol
  failed_sources: string[];                 // 失败的数据源
}

/**
 * 市场数据统计
 */
export interface MarketStats {
  total_items: number;
  has_crypto_data: boolean;
  has_stock_data: boolean;
  has_any_data: boolean;
}

/**
 * CoinGecko API 响应类型
 */
export interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol: number;
  };
}

/**
 * CoinGecko 历史数据响应类型
 */
export interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp_ms, price]
  market_caps?: [number, number][];
  total_volumes?: [number, number][];
}

/**
 * 加密货币抓取配置
 */
export interface CryptoFetcherConfig {
  symbols: string[];      // 要监控的币种列表
  proxyUrl?: string;      // 代理URL（可选）
}

/**
 * 股票抓取配置
 */
export interface StockFetcherConfig {
  customStocks?: string[];       // 自定义股票代码
  usePredefinedIndices?: boolean; // 是否使用预定义指数
}
