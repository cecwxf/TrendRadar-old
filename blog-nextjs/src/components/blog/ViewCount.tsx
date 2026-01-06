/**
 * 浏览量显示组件
 *
 * 显示文章的浏览次数，支持实时更新
 */

"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

interface ViewCountProps {
  slug: string;
  initialCount?: number;
  showIcon?: boolean;
}

export function ViewCount({ slug, initialCount = 0, showIcon = true }: ViewCountProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    // 获取最新浏览量
    const fetchViewCount = async () => {
      try {
        const response = await fetch(`/api/views/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setCount(data.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch view count:", error);
      }
    };

    fetchViewCount();

    // 每 30 秒更新一次
    const interval = setInterval(fetchViewCount, 30000);

    return () => clearInterval(interval);
  }, [slug]);

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {showIcon && <Eye className="h-4 w-4" />}
      <span>{count.toLocaleString()} 次阅读</span>
    </div>
  );
}
