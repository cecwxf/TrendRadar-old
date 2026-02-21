"use client";

import type { CategoryRanking } from "@/types/llm";

interface CategoryRankingsProps {
  data: CategoryRanking[];
  title?: string;
}

export function CategoryRankings({
  data,
  title = "分类排名",
}: CategoryRankingsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((category) => (
          <div
            key={category.category}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">{category.category}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                总使用量: {formatNumber(category.total_usage)}
              </span>
            </div>

            <div className="space-y-2">
              {category.top_models.map((item) => (
                <div
                  key={item.model.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6">
                      #{item.rank}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{item.model.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.model.provider}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums">
                      {formatNumber(item.metrics.total_tokens || 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
