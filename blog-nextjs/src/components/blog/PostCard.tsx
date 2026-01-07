/**
 * 文章卡片组件
 *
 * 显示文章的摘要信息
 */

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { PostListItem } from "@/types/blog";

interface PostCardProps {
  post: PostListItem;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="group relative flex flex-col space-y-4 rounded-xl border bg-card p-6 transition-all hover:shadow-lg">
      {/* 封面图 */}
      {post.cover && (post.cover.startsWith('http://') || post.cover.startsWith('https://')) && (
        <Link href={`/article/${post.slug}`} className="relative aspect-video overflow-hidden rounded-lg">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </Link>
      )}

      {/* 分类和标签 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {post.category}
        </span>
        {post.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 标题 */}
      <Link href={`/article/${post.slug}`}>
        <h2 className="text-2xl font-bold tracking-tight transition-colors group-hover:text-primary">
          {post.title}
        </h2>
      </Link>

      {/* 摘要 */}
      <p className="line-clamp-3 text-muted-foreground">
        {post.summary}
      </p>

      {/* 元信息 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <time dateTime={post.publishedAt}>
            {format(new Date(post.publishedAt), "yyyy年MM月dd日", { locale: zhCN })}
          </time>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{post.readingTime} 分钟</span>
        </div>
        {post.viewCount !== undefined && (
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{post.viewCount} 次阅读</span>
          </div>
        )}
      </div>

      {/* 阅读更多 */}
      <Link
        href={`/article/${post.slug}`}
        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
      >
        阅读全文 →
      </Link>
    </article>
  );
}
