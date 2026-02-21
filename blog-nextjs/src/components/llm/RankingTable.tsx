"use client";

import type { RankingItem } from "@/types/llm";

interface RankingTableProps {
  rankings: RankingItem[];
  title?: string;
}

export function RankingTable({ rankings, title = "模型排行榜" }: RankingTableProps) {
  const formatNumber = (num: number | undefined) => {
    if (!num) return "N/A";
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "−";
  };

  const getTrendColor = (trend?: "up" | "down" | "stable") => {
    if (trend === "up") return "text-green-600 dark:text-green-400";
    if (trend === "down") return "text-red-600 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                排名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                模型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                提供商
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                使用量 (Tokens)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                请求数
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                平均延迟
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                质量评分
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                趋势
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rankings.map((item) => (
              <tr
                key={item.model.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span
                      className={`text-sm font-bold ${
                        item.rank <= 3
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.model.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.model.category}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {item.model.provider}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium tabular-nums">
                  {formatNumber(item.metrics.total_tokens)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm tabular-nums">
                  {formatNumber(item.metrics.total_requests)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm tabular-nums">
                  {item.metrics.avg_latency_ms ? `${item.metrics.avg_latency_ms}ms` : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {item.metrics.quality_score?.toFixed(1) || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`text-lg font-bold ${getTrendColor(item.trend)}`}>
                    {getTrendIcon(item.trend)}
                  </span>
                  {item.rank_change !== 0 && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {Math.abs(item.rank_change || 0)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
