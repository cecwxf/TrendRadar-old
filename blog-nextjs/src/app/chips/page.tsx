"use client";

import { useEffect, useState } from "react";
import type { AIChipLeaderboard } from "@/types/chips";
import { ChipRankingTable } from "@/components/chips/ChipRankingTable";
import { ChipVendorShare } from "@/components/chips/ChipVendorShare";
import { ChipSegmentRankings } from "@/components/chips/ChipSegmentRankings";

export default function AIChipLeaderboardPage() {
  const [data, setData] = useState<AIChipLeaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/chips/leaderboard");
        const json = await res.json();

        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "获取数据失败");
        }
      } catch (err) {
        console.error("获取 AI 芯片排行榜失败:", err);
        setError("网络请求失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
              加载失败
            </h2>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const sourceSummary = data.data_sources
    .map((source) => `${source.name}(${source.status === "ok" ? "可用" : "降级"})`)
    .join(" + ");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
            AI 芯片使用排行榜
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            覆盖 ADAS市场、座舱市场、IOT/机器人端侧市场、服务器市场
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            已纳入华为、寒武纪、黑芝麻、芯驰、瑞芯微、晶晨、全志、海光等国内厂商（按可获得公开数据计算）
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            数据周期: {data.data_period.start} 至 {data.data_period.end} | 最后更新:{" "}
            {new Date(data.last_updated).toLocaleString("zh-CN")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#chip-market-rankings"
            className="px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
          >
            分市场排行
          </a>
          <a
            href="#chip-market-vendor-share"
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            分市场份额
          </a>
          <a
            href="#chip-segments"
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            分赛道榜
          </a>
        </div>

        <div id="chip-market-rankings" className="space-y-6">
          {data.market_rankings.map((marketRanking) => (
            <ChipRankingTable
              key={marketRanking.market}
              rankings={marketRanking.top_chips}
              title={`${marketRanking.market_label} AI芯片排行`}
            />
          ))}
        </div>

        <div id="chip-market-vendor-share" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.market_vendor_shares.map((item) => (
            <ChipVendorShare
              key={item.market}
              data={item.vendor_shares}
              title={`${item.market_label} 厂商份额（按使用指数）`}
            />
          ))}
        </div>

        <div id="chip-segments">
          <ChipSegmentRankings data={data.segment_rankings} />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
            指标说明
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
            <p>
              <strong>使用指数:</strong> 基于芯片部署基线、厂商市值/流动性、最近营收信号综合计算。
            </p>
            <p>
              <strong>份额:</strong> 厂商份额与排名均按市场拆分计算，避免不同资本市场直接混排。
            </p>
            <p>
              <strong>性能与能效:</strong> 参考公开评测与公开规格构建统一指数（0-100）。
            </p>
            <p>
              <strong>数据源状态:</strong> {sourceSummary}
            </p>
            <p>
              <strong>市场拆分:</strong> 目前按 ADAS市场、座舱市场、IOT/机器人端侧市场、服务器市场进行展示。
            </p>
            {data.failed_sources && data.failed_sources.length > 0 && (
              <p>
                <strong>降级源:</strong> {data.failed_sources.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-base font-semibold mb-3">数据源明细</h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            {data.data_sources.map((source) => (
              <li key={source.name}>
                <span className="font-medium">{source.name}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                  {source.type}
                </span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                  {source.status}
                </span>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    source
                  </a>
                )}
                {source.note && <p className="text-xs text-gray-500 mt-1">{source.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
