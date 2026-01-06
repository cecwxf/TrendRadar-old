/**
 * 首页加载状态
 *
 * Next.js 会在页面加载时自动显示此组件
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { PostListSkeleton } from "@/components/blog/PostCardSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      {/* Hero 区域骨架 */}
      <section className="bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <Skeleton className="h-12 w-96 mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </section>

      {/* 金融横幅骨架 */}
      <section className="container mx-auto px-4 -mt-8">
        <Skeleton className="h-[100px] w-full rounded-xl" />
      </section>

      {/* 文章列表骨架 */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-12 w-full md:w-96" />
        </div>
        <PostListSkeleton count={6} />
      </section>
    </main>
  );
}
