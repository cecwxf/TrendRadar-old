/**
 * 文章卡片骨架屏
 *
 * 用于文章列表加载时的占位显示
 */

import { Skeleton } from "@/components/ui/Skeleton";

export function PostCardSkeleton() {
  return (
    <div className="flex flex-col space-y-4 rounded-xl border bg-card p-6">
      {/* 封面图骨架 */}
      <Skeleton className="aspect-video w-full" />

      {/* 分类和标签骨架 */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>

      {/* 标题骨架 */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </div>

      {/* 摘要骨架 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* 元信息骨架 */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/**
 * 文章列表骨架屏
 *
 * 显示多个文章卡片骨架
 */
export function PostListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
