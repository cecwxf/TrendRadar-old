"use client";

import type { AIChipVendorShare } from "@/types/chips";

interface ChipVendorShareProps {
  data: AIChipVendorShare[];
  title?: string;
}

export function ChipVendorShare({
  data,
  title = "厂商份额（按装机指数）",
}: ChipVendorShareProps) {
  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      <div className="space-y-3">
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
              装机指数: {item.total_deployment_index.toFixed(2)} | 芯片数: {item.chip_count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
