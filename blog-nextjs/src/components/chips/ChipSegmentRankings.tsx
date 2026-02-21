"use client";

import type { AIChipSegmentRanking } from "@/types/chips";

interface ChipSegmentRankingsProps {
  data: AIChipSegmentRanking[];
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

export function ChipSegmentRankings({ data }: ChipSegmentRankingsProps) {
  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">分赛道排名</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((segment) => (
          <div
            key={segment.segment}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {segment.segment}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                总装机量 {formatNumber(segment.total_deployment_index)}
              </span>
            </div>

            <div className="space-y-2">
              {segment.top_chips.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  暂无可核验装机量数据
                </div>
              )}
              {segment.top_chips.slice(0, 3).map((item) => (
                <div key={item.chip.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800 dark:text-gray-200">
                    #{item.rank} {item.chip.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                    {formatNumber(item.metrics.deployment_index)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
