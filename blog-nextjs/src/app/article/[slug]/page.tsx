/**
 * 文章详情页
 *
 * 使用 ISR (增量静态再生) 和 generateStaticParams 预渲染文章
 */

import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import Link from "next/link";
import { getPosts, getPostBySlug } from "@/lib/notion/client";
import { notionPageToMarkdown, calculateReadingTime } from "@/lib/notion/renderer";
import { getViewCount } from "@/lib/market/market-service";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ViewTracker } from "@/components/blog/ViewTracker";
import { ViewCount } from "@/components/blog/ViewCount";
import { Comments } from "@/components/blog/Comments";

export const revalidate = 3600; // ISR: 每小时重新验证

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 生成静态参数（预渲染所有文章）
export async function generateStaticParams() {
  const posts = await getPosts();

  return posts.map(post => ({
    slug: post.slug,
  }));
}

// 生成元数据
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "文章未找到",
    };
  }

  return {
    title: post.title,
    description: post.summary,
    keywords: [post.category, ...post.tags],
    openGraph: {
      title: post.title,
      description: post.summary,
      images: (post.cover && (post.cover.startsWith('http://') || post.cover.startsWith('https://'))) ? [post.cover] : [],
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // 获取 Markdown 内容
  const content = await notionPageToMarkdown(post.id);
  const readingTime = calculateReadingTime(content);

  // 获取初始浏览量
  const initialViewCount = await getViewCount(slug);

  return (
    <main className="min-h-screen">
      {/* 浏览量追踪（不可见） */}
      <ViewTracker slug={slug} />

      <article className="container mx-auto px-4 py-16 max-w-4xl">
        {/* 返回按钮 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        {/* 文章头部 */}
        <header className="mb-12">
          {/* 分类和标签 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {post.category}
            </span>
            {post.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 标题 */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {post.title}
          </h1>

          {/* 摘要 */}
          <p className="text-xl text-muted-foreground mb-6">
            {post.summary}
          </p>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), "yyyy年MM月dd日", { locale: zhCN })}
              </time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{readingTime} 分钟阅读</span>
            </div>
            <ViewCount slug={slug} initialCount={initialViewCount} />
          </div>

          {/* 封面图 */}
          {post.cover && (post.cover.startsWith('http://') || post.cover.startsWith('https://')) && (
            <div className="relative aspect-video mt-8 overflow-hidden rounded-xl">
              <Image
                src={post.cover}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </header>

        {/* 文章内容 */}
        <ArticleContent content={content} />

        {/* 文章底部 */}
        <footer className="mt-16 pt-8 border-t">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </footer>

        {/* 评论区 */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">评论</h2>
          <Comments slug={slug} />
        </section>
      </article>
    </main>
  );
}
