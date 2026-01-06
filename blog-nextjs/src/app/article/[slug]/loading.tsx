/**
 * 文章详情页加载状态
 *
 * Next.js 会在文章加载时自动显示此组件
 */

import { ArticleSkeleton } from "@/components/blog/ArticleSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <ArticleSkeleton />
    </main>
  );
}
