"use client";

import { useEffect, useState } from "react";
import type { LLMLeaderboard } from "@/types/llm";
import { RankingTable } from "@/components/llm/RankingTable";
import { UsageTrendsChart } from "@/components/llm/UsageTrendsChart";
import { MarketShareChart } from "@/components/llm/MarketShareChart";
import { CategoryRankings } from "@/components/llm/CategoryRankings";

export default function LLMLeaderboardPage() {
  const [data, setData] = useState<LLMLeaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/llm/leaderboard");
        const json = await res.json();

        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "获取数据失败");
        }
      } catch (err) {
        console.error("获取 LLM 排行榜数据失败:", err);
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
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded" />
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

  // 构建模型名称映射
  const modelNames: { [key: string]: string } = {};
  data.overall_rankings.forEach((item) => {
    modelNames[item.model.id] = item.model.name;
  });
  const sourceText = data.sources?.length ? data.sources.join(" + ") : "未标注";
  const failedSourceText = data.failed_sources?.length ? `（降级: ${data.failed_sources.join(", ")}）` : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            LLM 模型排行榜
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            基于使用量、性能和质量的综合排名
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            数据周期: {data.data_period.start} 至 {data.data_period.end} | 最后更新:{" "}
            {new Date(data.last_updated).toLocaleString("zh-CN")}
          </p>
        </div>

        {/* 快速导航 */}
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#leaderboard"
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            总体排名
          </a>
          <a
            href="#trends"
            className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            使用趋势
          </a>
          <a
            href="#market-share"
            className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            市场份额
          </a>
          <a
            href="#categories"
            className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
          >
            分类排名
          </a>
        </div>

        {/* 总体排名 */}
        <div id="leaderboard">
          <RankingTable rankings={data.overall_rankings} title="总体排名" />
        </div>

        {/* 使用趋势 */}
        <div id="trends">
          <UsageTrendsChart data={data.usage_trends} modelNames={modelNames} />
        </div>

        {/* 市场份额 */}
        {data.market_shares && data.market_shares.length > 0 && (
          <div id="market-share">
            <MarketShareChart data={data.market_shares} />
          </div>
        )}

        {/* 分类排名 */}
        {data.category_rankings && data.category_rankings.length > 0 && (
          <div id="categories">
            <CategoryRankings data={data.category_rankings} />
          </div>
        )}

        {/* 说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
            关于排行榜
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
            <p>
              <strong>数据来源:</strong> {sourceText} {failedSourceText}。支持综合考虑开源与闭源模型，
              包含 Claude、GPT、Gemini、GLM、Kimi 等模型系列。
            </p>
            <p>
              <strong>排名指标:</strong> 综合考虑下载量、点赞数、使用量（Token数）、请求数、平均延迟、质量评分等多维度指标。
            </p>
            <p>
              <strong>更新频率:</strong> 数据每小时更新一次，确保排名的时效性。
            </p>
            <p>
              <strong>趋势说明:</strong> ↑ 表示排名上升，↓ 表示排名下降，− 表示排名稳定。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
