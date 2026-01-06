/**
 * 浏览量追踪组件
 *
 * 在文章详情页自动记录浏览量
 */

"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  slug: string;
}

export function ViewTracker({ slug }: ViewTrackerProps) {
  useEffect(() => {
    // 增加浏览量
    const incrementView = async () => {
      try {
        await fetch(`/api/views/${slug}`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Failed to increment view count:", error);
      }
    };

    // 延迟 1 秒后记录浏览量（避免快速刷新造成误计数）
    const timer = setTimeout(incrementView, 1000);

    return () => clearTimeout(timer);
  }, [slug]);

  return null; // 不渲染任何内容
}
