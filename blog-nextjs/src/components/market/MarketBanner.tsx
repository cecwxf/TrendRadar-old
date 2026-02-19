/**
 * 市场横幅组件
 *
 * 在首页顶部显示加密货币和美股价格信息
 * 默认展示：BTC/ETH/SOL/BNB + NVDA/TSLA/GOOGL/META
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { CryptoItem, StockItem } from "@/types/market";

interface MarketBannerProps {
  initialCryptoData?: CryptoItem[];
  initialStockData?: StockItem[];
}

const DISPLAY_COINS = ["BTC", "ETH", "SOL", "BNB"];
const DISPLAY_STOCKS = ["NVDA", "TSLA", "GOOGL", "META"];

const COIN_CONFIG: Record<string, { name: string; gradient: string }> = {
  BTC: { name: "比特币", gradient: "bg-gradient-to-br from-orange-400 to-orange-600" },
  ETH: { name: "以太坊", gradient: "bg-gradient-to-br from-indigo-400 to-indigo-600" },
  SOL: { name: "Solana", gradient: "bg-gradient-to-br from-purple-400 to-purple-600" },
  BNB: { name: "币安币", gradient: "bg-gradient-to-br from-yellow-400 to-yellow-600" },
};

const STOCK_CONFIG: Record<string, { name: string; gradient: string }> = {
  NVDA: { name: "NVIDIA", gradient: "bg-gradient-to-br from-emerald-400 to-emerald-600" },
  TSLA: { name: "Tesla", gradient: "bg-gradient-to-br from-red-400 to-red-600" },
  GOOGL: { name: "Google", gradient: "bg-gradient-to-br from-blue-400 to-blue-600" },
  META: { name: "Meta", gradient: "bg-gradient-to-br from-sky-400 to-sky-600" },
};

export function MarketBanner({ initialCryptoData, initialStockData }: MarketBannerProps) {
  const [cryptoData, setCryptoData] = useState<CryptoItem[]>(initialCryptoData || []);
  const [stockData, setStockData] = useState<StockItem[]>(initialStockData || []);
  const [isLoading, setIsLoading] = useState(!initialCryptoData && !initialStockData);

  useEffect(() => {
    // 如果缺少任一数据源，从 API 拉取最新数据
    if (!initialCryptoData || !initialStockData) {
      fetchMarketData();
    }

    // 每 30 秒刷新一次数据
    const interval = setInterval(() => {
      fetchMarketData();
    }, 30000);

    return () => clearInterval(interval);
  }, [initialCryptoData, initialStockData]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch("/api/market/latest");
      if (response.ok) {
        const data = await response.json();
        setCryptoData(data.crypto || []);
        setStockData(data.stocks || []);
      }
    } catch (error) {
      console.error("获取市场数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const coinsData = DISPLAY_COINS
    .map(symbol => cryptoData.find(item => item.symbol === symbol))
    .filter((item): item is CryptoItem => item !== undefined);
  const stocksDisplayData = DISPLAY_STOCKS
    .map(symbol => stockData.find(item => item.symbol === symbol))
    .filter((item): item is StockItem => item !== undefined);

  if (isLoading && coinsData.length === 0 && stocksDisplayData.length === 0) {
    return (
      <div className="h-[132px] bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>加载市场数据...</span>
        </div>
      </div>
    );
  }

  if (coinsData.length === 0 && stocksDisplayData.length === 0) {
    return (
      <div className="h-[132px] bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">市场数据暂未配置</p>
          <Link
            href="/market"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            查看完整仪表盘 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[132px] bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="h-full flex items-center gap-4 px-4 md:px-6">
        <div className="flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-3 py-3">
            {coinsData.map((item) => {
              const config = COIN_CONFIG[item.symbol] || {
                name: item.symbol,
                gradient: "bg-gradient-to-br from-gray-400 to-gray-600",
              };
              return (
                <MarketCard
                  key={item.symbol}
                  kind="crypto"
                  symbol={item.symbol}
                  name={config.name}
                  price={item.price}
                  changePercent={item.price_change_24h}
                  gradient={config.gradient}
                />
              );
            })}
            {stocksDisplayData.map((item) => {
              const config = STOCK_CONFIG[item.symbol] || {
                name: item.name || item.symbol,
                gradient: "bg-gradient-to-br from-gray-400 to-gray-600",
              };
              return (
                <MarketCard
                  key={item.symbol}
                  kind="stock"
                  symbol={item.symbol}
                  name={config.name}
                  price={item.price}
                  changePercent={item.change_percent}
                  gradient={config.gradient}
                />
              );
            })}
          </div>
        </div>

        <Link
          href="/market"
          className="hidden shrink-0 items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30 transition-colors text-sm font-medium text-foreground md:flex"
        >
          <span>完整仪表盘</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * 市场卡片（紧凑版）
 */
function MarketCard({
  kind,
  symbol,
  name,
  price,
  changePercent,
  gradient,
}: {
  kind: "crypto" | "stock";
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  gradient: string;
}) {
  const isPositive = changePercent >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/55 dark:bg-black/15 px-3 py-2">
      <div className="flex items-center gap-2 min-w-[120px]">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${gradient}`}
        >
          {symbol}
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium">{name}</div>
          <div className="text-[10px] text-muted-foreground/70">
            {symbol} {kind === "crypto" ? "· Crypto" : "· US Stock"}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <div className="text-base font-bold tabular-nums">
          ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          <Icon className="h-3 w-3" />
          <span className="tabular-nums">
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
