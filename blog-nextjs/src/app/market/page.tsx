/**
 * 市场仪表盘页面
 *
 * 显示加密货币和股票的完整数据
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { getLatestCryptoData, getLatestStockData } from "@/lib/market/market-service";
import { MiniChart } from "@/components/market/MiniChart";

export const metadata: Metadata = {
  title: "市场仪表盘",
  description: "实时加密货币和股票市场数据",
};

export const revalidate = 60; // 每分钟重新验证

export default async function MarketDashboard() {
  // 获取最新数据
  const [cryptoData, stockData] = await Promise.all([
    getLatestCryptoData(),
    getLatestStockData(),
  ]);

  const hasData = cryptoData.length > 0 || stockData.length > 0;

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
            数据每分钟自动更新 · 最后更新: {new Date().toLocaleString("zh-CN")}
          </div>
        )}
      </div>
    </main>
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
