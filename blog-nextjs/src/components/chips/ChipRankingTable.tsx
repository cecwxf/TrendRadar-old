"use client";

import type { AIChipRankingItem } from "@/types/chips";

interface ChipRankingTableProps {
  rankings: AIChipRankingItem[];
  title?: string;
}

function formatNumber(num: number | undefined): string {
  if (num === undefined || Number.isNaN(num)) {
    return "N/A";
  }
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(2);
}

function trendIcon(trend?: "up" | "down" | "stable"): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "−";
}

function trendClass(trend?: "up" | "down" | "stable"): string {
  if (trend === "up") return "text-green-600 dark:text-green-400";
  if (trend === "down") return "text-red-600 dark:text-red-400";
  return "text-gray-500 dark:text-gray-400";
}

export function ChipRankingTable({
  rankings,
  title = "AI芯片综合排行榜",
}: ChipRankingTableProps) {
  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">芯片</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">厂商</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">赛道</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">装机量</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">赛道份额</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">性能</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">能效</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">趋势</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rankings.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500 text-center" colSpan={9}>
                  暂无可核验装机量数据
                </td>
              </tr>
            )}
            {rankings.map((item) => (
              <tr
                key={item.chip.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-bold">
                  <span
                    className={
                      item.rank <= 3
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-gray-900 dark:text-gray-100"
                    }
                  >
                    #{item.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.chip.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.chip.architecture || "N/A"}
                    {item.metrics.install_period_start && item.metrics.install_period_end && (
                      <span className="ml-2">
                        {item.metrics.install_period_start} ~ {item.metrics.install_period_end}
                      </span>
                    )}
                    {item.metrics.install_source_url && (
                      <a
                        href={item.metrics.install_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                        title={item.metrics.install_source_name}
                      >
                        source
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{item.chip.vendor}</td>
                <td className="px-4 py-3 text-sm">{item.chip.segment}</td>
                <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                  {formatNumber(item.metrics.deployment_index)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {item.metrics.segment_share_percent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {item.metrics.benchmark_index.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {item.metrics.efficiency_index.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-lg font-bold ${trendClass(item.trend)}`}>
                    {trendIcon(item.trend)}
                  </span>
                  {item.rank_change !== 0 && (
                    <span className="ml-1 text-xs text-gray-500">
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
