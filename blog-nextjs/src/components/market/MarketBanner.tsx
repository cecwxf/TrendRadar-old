/**
 * 市场横幅组件
 *
 * 在首页顶部显示 BTC 和 ETH 的价格信息
 * 设计：100px 高度，紧凑布局，小字体
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { CryptoItem } from "@/types/market";

interface MarketBannerProps {
  initialData?: CryptoItem[];
}

export function MarketBanner({ initialData }: MarketBannerProps) {
  const [cryptoData, setCryptoData] = useState<CryptoItem[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    // 如果没有初始数据，从 API 获取
    if (!initialData) {
      fetchMarketData();
    }

    // 每 30 秒刷新一次数据
    const interval = setInterval(() => {
      fetchMarketData();
    }, 30000);

    return () => clearInterval(interval);
  }, [initialData]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch("/api/market/latest");
      if (response.ok) {
        const data = await response.json();
        setCryptoData(data.crypto || []);
      }
    } catch (error) {
      console.error("获取市场数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 只显示 BTC 和 ETH
  const btc = cryptoData.find((item) => item.symbol === "BTC");
  const eth = cryptoData.find((item) => item.symbol === "ETH");

  if (isLoading) {
    return (
      <div className="h-[100px] bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>加载市场数据...</span>
        </div>
      </div>
    );
  }

  if (!btc && !eth) {
    return (
      <div className="h-[100px] bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl flex items-center justify-center">
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
    <div className="h-[100px] bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="h-full flex items-center justify-between px-6">
        {/* 左侧：加密货币数据 */}
        <div className="flex items-center gap-8">
          {btc && <CryptoCard item={btc} />}
          {eth && <CryptoCard item={eth} />}
        </div>

        {/* 右侧：查看完整仪表盘链接 */}
        <Link
          href="/market"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30 transition-colors text-sm font-medium text-foreground"
        >
          <span>完整仪表盘</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * 加密货币卡片（紧凑版）
 */
function CryptoCard({ item }: { item: CryptoItem }) {
  const isPositive = item.price_change_24h >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-4">
      {/* 币种图标和符号 */}
      <div className="flex items-center gap-2">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
            item.symbol === "BTC"
              ? "bg-gradient-to-br from-orange-400 to-orange-600"
              : "bg-gradient-to-br from-indigo-400 to-indigo-600"
          }`}
        >
          {item.symbol}
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium">
            {item.symbol === "BTC" ? "比特币" : "以太坊"}
          </div>
          <div className="text-xs text-muted-foreground/70">{item.symbol}</div>
        </div>
      </div>

      {/* 价格和涨跌幅 */}
      <div className="flex flex-col items-end">
        <div className="text-lg font-bold tabular-nums">
          ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          <Icon className="h-3 w-3" />
          <span className="tabular-nums">
            {isPositive ? "+" : ""}
            {item.price_change_24h.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
