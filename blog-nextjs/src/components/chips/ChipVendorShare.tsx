"use client";

import type { AIChipVendorShare } from "@/types/chips";

interface ChipVendorShareProps {
  data: AIChipVendorShare[];
  title?: string;
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

export function ChipVendorShare({
  data,
  title = "厂商份额（按装机量）",
}: ChipVendorShareProps) {
  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      <div className="space-y-3">
        {data.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            暂无可核验装机量数据
          </div>
        )}
        {data.map((item) => (
          <div key={item.vendor} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {item.vendor}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {item.share_percent.toFixed(2)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                style={{ width: `${Math.min(100, item.share_percent)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              装机量: {formatNumber(item.total_deployment_index)} | 芯片数: {item.chip_count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
