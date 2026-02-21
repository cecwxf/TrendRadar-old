/**
 * 市场仪表盘页面
 *
 * 显示加密货币和股票的完整数据
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { getLatestCryptoData, getLatestStockData } from "@/lib/market/market-service";
import { fetchBlockchainMarketCapLeaderboard } from "@/lib/market/blockchain-leaderboard";
import { fetchBlockchainMacroMetrics } from "@/lib/market/blockchain-metrics";
import type { BlockchainMarketCapItem, BlockchainMacroMetrics } from "@/types/market";
import { MiniChart } from "@/components/market/MiniChart";

export const metadata: Metadata = {
  title: "市场仪表盘",
  description: "实时加密货币和股票市场数据",
};

export const revalidate = 60; // 每分钟重新验证

export default async function MarketDashboard() {
  // 获取最新数据
  const [cryptoData, stockData, blockchainLeaderboard, blockchainMetrics] = await Promise.all([
    getLatestCryptoData(),
    getLatestStockData(),
    fetchBlockchainMarketCapLeaderboard(20),
    fetchBlockchainMacroMetrics(),
  ]);

  const hasData =
    cryptoData.length > 0 || stockData.length > 0 || blockchainLeaderboard.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <Activity className="h-10 w-10 text-primary" />
              市场仪表盘
            </h1>
            <p className="text-muted-foreground">
              实时加密货币和股票市场数据，每分钟更新
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回首页</span>
          </Link>
        </div>

        {!hasData ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto bg-muted/50 p-8 rounded-xl">
              <h2 className="text-2xl font-bold mb-4">市场数据未配置</h2>
              <p className="text-muted-foreground mb-6">
                请先配置 Supabase 并运行 Cron Job 来获取市场数据
              </p>
              <div className="text-left space-y-4">
                <div>
                  <h3 className="font-bold mb-2">配置步骤：</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>创建 Supabase 项目</li>
                    <li>执行 supabase/schema.sql</li>
                    <li>配置环境变量</li>
                    <li>部署到 Vercel 并设置 Cron Job</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="h-8 w-1 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full" />
                链上与周期指标
              </h2>
              <BlockchainMacroCards metrics={blockchainMetrics} />
            </section>

            {/* 区块链市值排行榜 */}
            {blockchainLeaderboard.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                  区块链市值排行榜
                </h2>
                <BlockchainMarketCapTable data={blockchainLeaderboard} />
              </section>
            )}

            {/* 加密货币区域 */}
            {cryptoData.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="h-8 w-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full" />
                  加密货币
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cryptoData.map((crypto) => (
                    <CryptoCard key={crypto.symbol} crypto={crypto} />
                  ))}
                </div>
              </section>
            )}

            {/* 股票区域 */}
            {stockData.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
                  股票市场
                </h2>

                {/* 按市场分组 */}
                {["US", "HK", "CN"].map((market) => {
                  const stocks = stockData.filter((s) => s.market === market);
                  if (stocks.length === 0) return null;

                  const marketNames = {
                    US: "美股",
                    HK: "港股",
                    CN: "A股",
                  };

                  return (
                    <div key={market} className="mb-8 last:mb-0">
                      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                        {marketNames[market as keyof typeof marketNames]}
                      </h3>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {stocks.map((stock) => (
                          <StockCard key={stock.symbol} stock={stock} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        )}

        {/* 数据更新时间 */}
        {hasData && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            区块链市值榜每5分钟更新 · 其他市场数据每分钟更新 · 最后更新:{" "}
            {new Date().toLocaleString("zh-CN")}
          </div>
        )}
      </div>
    </main>
  );
}

function formatUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatCompactNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(0);
}

function fearGreedColor(value: number): string {
  if (value < 25) return "from-red-500 to-red-600";
  if (value < 45) return "from-orange-500 to-orange-600";
  if (value < 55) return "from-yellow-500 to-yellow-600";
  if (value < 75) return "from-lime-500 to-lime-600";
  return "from-green-500 to-green-600";
}

function BlockchainMacroCards({ metrics }: { metrics: BlockchainMacroMetrics }) {
  const fearGreed = metrics.fear_greed_value;
  const fearGreedWidth = typeof fearGreed === "number" ? Math.max(0, Math.min(100, fearGreed)) : 0;
  const ratio = metrics.btc_price_to_ma200d;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs text-muted-foreground mb-2">恐惧贪婪指数</div>
        <div className="text-3xl font-bold tabular-nums">
          {typeof fearGreed === "number" ? fearGreed.toFixed(0) : "N/A"}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {metrics.fear_greed_classification || "N/A"}
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${fearGreedColor(fearGreed || 0)}`}
            style={{ width: `${fearGreedWidth}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs text-muted-foreground mb-2">全市场总市值</div>
        <div className="text-3xl font-bold tabular-nums">
          {typeof metrics.total_market_cap_usd === "number"
            ? formatUsd(metrics.total_market_cap_usd)
            : "N/A"}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          24h 成交额:{" "}
          {typeof metrics.total_volume_usd === "number" ? formatUsd(metrics.total_volume_usd) : "N/A"}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs text-muted-foreground mb-2">市值占比</div>
        <div className="text-3xl font-bold tabular-nums">
          BTC {typeof metrics.btc_dominance_percent === "number" ? metrics.btc_dominance_percent.toFixed(2) : "N/A"}%
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          ETH {typeof metrics.eth_dominance_percent === "number" ? metrics.eth_dominance_percent.toFixed(2) : "N/A"}%
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs text-muted-foreground mb-2">BTC 与 200日均线</div>
        <div className="text-xl font-bold tabular-nums">
          现价 {typeof metrics.btc_price_usd === "number" ? formatUsd(metrics.btc_price_usd) : "N/A"}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          MA200D {typeof metrics.btc_ma200d_usd === "number" ? formatUsd(metrics.btc_ma200d_usd) : "N/A"}
        </div>
        <div
          className={`text-sm font-medium mt-2 ${
            typeof ratio === "number"
              ? ratio >= 1
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
        >
          比值 {typeof ratio === "number" ? ratio.toFixed(3) : "N/A"}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs text-muted-foreground mb-2">比特币减半倒计时</div>
        <div className="text-3xl font-bold tabular-nums">
          {typeof metrics.halving_blocks_remaining === "number"
            ? formatCompactNumber(metrics.halving_blocks_remaining)
            : "N/A"}{" "}
          blocks
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          约{" "}
          {typeof metrics.halving_days_remaining === "number"
            ? metrics.halving_days_remaining.toFixed(1)
            : "N/A"}{" "}
          天
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-xs text-muted-foreground mb-2">市场覆盖</div>
        <div className="text-3xl font-bold tabular-nums">
          {typeof metrics.active_cryptocurrencies === "number"
            ? formatCompactNumber(metrics.active_cryptocurrencies)
            : "N/A"}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          市场数量 {typeof metrics.markets === "number" ? formatCompactNumber(metrics.markets) : "N/A"}
        </div>
      </div>
    </div>
  );
}

function BlockchainMarketCapTable({ data }: { data: BlockchainMarketCapItem[] }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                排名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                项目
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                价格
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                市值
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                24h涨跌
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                24h成交额
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => {
              const isPositive = item.price_change_24h >= 0;
              return (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums">#{item.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.symbol} className="h-6 w-6 rounded-full" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted" />
                      )}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatUsd(item.price)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                    {formatUsd(item.market_cap)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-medium tabular-nums ${
                      isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {item.price_change_24h.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatUsd(item.volume_24h)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 text-xs text-muted-foreground border-t">
        数据源: CoinGecko · 口径: 按流通市值（USD）降序
      </div>
    </div>
  );
}

/**
 * 加密货币卡片
 */
function CryptoCard({ crypto }: { crypto: any }) {
  const isPositive = crypto.price_change_24h >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6">
      {/* 头部：币种信息 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold ${
              crypto.symbol === "BTC"
                ? "bg-gradient-to-br from-orange-400 to-orange-600"
                : crypto.symbol === "ETH"
                ? "bg-gradient-to-br from-indigo-400 to-indigo-600"
                : "bg-gradient-to-br from-purple-400 to-purple-600"
            }`}
          >
            {crypto.symbol.substring(0, 3)}
          </div>
          <div>
            <div className="font-bold">{crypto.symbol}</div>
            <div className="text-xs text-muted-foreground">{crypto.exchange}</div>
          </div>
        </div>
      </div>

      {/* 价格 */}
      <div className="mb-4">
        <div className="text-3xl font-bold tabular-nums">
          ${crypto.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-medium mt-1 ${
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="tabular-nums">
            {isPositive ? "+" : ""}
            {crypto.price_change_24h.toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">24h</span>
        </div>
      </div>

      {/* 24h交易量 */}
      <div className="text-xs text-muted-foreground mb-4">
        24h 交易量: ${crypto.volume_24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </div>

      {/* 图表占位 */}
      {crypto.price_history && crypto.price_history.length > 0 && (
        <MiniChart data={crypto.price_history} height={80} />
      )}
    </div>
  );
}

/**
 * 股票卡片
 */
function StockCard({ stock }: { stock: any }) {
  const isPositive = stock.change_percent >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-6">
      {/* 头部：股票信息 */}
      <div className="mb-4">
        <div className="font-bold text-lg">{stock.name}</div>
        <div className="text-xs text-muted-foreground">{stock.symbol}</div>
      </div>

      {/* 价格 */}
      <div className="mb-4">
        <div className="text-3xl font-bold tabular-nums">
          {stock.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-medium mt-1 ${
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="tabular-nums">
            {isPositive ? "+" : ""}
            {stock.change_percent.toFixed(2)}%
          </span>
          <span className="text-muted-foreground">
            ({isPositive ? "+" : ""}
            {stock.change.toFixed(2)})
          </span>
        </div>
      </div>

      {/* 成交量 */}
      <div className="text-xs text-muted-foreground mb-4">
        成交量: {stock.volume.toLocaleString("en-US")}
      </div>

      {/* 图表占位 */}
      {stock.price_history && stock.price_history.length > 0 && (
        <MiniChart data={stock.price_history} height={80} />
      )}
    </div>
  );
}
