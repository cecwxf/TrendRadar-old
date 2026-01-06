/**
 * 文章详情页骨架屏
 *
 * 用于文章详情页加载时的占位显示
 */

import { Skeleton } from "@/components/ui/Skeleton";

export function ArticleSkeleton() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* 返回按钮骨架 */}
      <Skeleton className="h-6 w-24 mb-8" />

      {/* 文章头部 */}
      <div className="mb-12 space-y-6">
        {/* 分类和标签 */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>

        {/* 标题 */}
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>

        {/* 摘要 */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
        </div>

        {/* 元信息 */}
        <div className="flex gap-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
        </div>

        {/* 封面图 */}
        <Skeleton className="aspect-video w-full" />
      </div>

      {/* 文章内容 */}
      <div className="space-y-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-4",
              i % 4 === 0 ? "w-full" : i % 4 === 1 ? "w-11/12" : i % 4 === 2 ? "w-5/6" : "w-3/4"
            )}
          />
        ))}
      </div>

      {/* 底部 */}
      <div className="mt-16 pt-8 border-t">
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
