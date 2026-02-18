import { getPosts } from "@/lib/notion/client";
import { notionPageToMarkdown, calculateReadingTime } from "@/lib/notion/renderer";
import { getLatestCryptoData, getViewCount } from "@/lib/market/market-service";
import { MarketBanner } from "@/components/market/MarketBanner";
import { MarketCharts } from "@/components/market/MarketCharts";
import { PostListWithArchive } from "@/components/blog/PostListWithArchive";
import type { PostListItem } from "@/types/blog";

export const revalidate = 600; // ISR: 每10分钟重新验证（匹配Cron更新频率）

export default async function Home() {
  // 并行获取文章列表和市场数据
  const [notionPosts, cryptoData] = await Promise.all([
    getPosts(),
    getLatestCryptoData(),
  ]);

  // 转换为 PostListItem 格式
  const posts: PostListItem[] = await Promise.all(
    notionPosts.map(async (post) => {
      // 获取内容以计算阅读时间
      const content = await notionPageToMarkdown(post.id);
      const readingTime = calculateReadingTime(content);

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        category: post.category,
        tags: post.tags,
        cover: post.cover,
        publishedAt: post.publishedAt,
        pinned: post.pinned,
        readingTime,
        viewCount: await getViewCount(post.slug),
      };
    })
  );

  return (
    <main className="min-h-screen">
      {/* Hero 区域 */}
      <section className="bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            智展AI
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            我们反思成长，静静等待扭转乾坤
          </p>
          <p className="text-sm text-muted-foreground">
            We reflect and grow, quietly awaiting the moment to turn the tide.
          </p>
        </div>
      </section>

      {/* 金融横幅 - 仅在有数据时显示 */}
      {cryptoData && cryptoData.length > 0 && (
        <section className="container mx-auto px-4 -mt-8">
          <MarketBanner initialData={cryptoData} />
        </section>
      )}

      {/* 市场年度曲线图 */}
      <section className="container mx-auto px-4 mt-4">
        <MarketCharts />
      </section>

      {/* 文章列表 */}
      <section className="container mx-auto px-4 py-16">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">还没有文章</h2>
            <p className="text-muted-foreground mb-8">
              请先在 Notion 创建文章并配置环境变量
            </p>
            <div className="max-w-2xl mx-auto text-left bg-muted/50 p-6 rounded-lg">
              <h3 className="font-bold mb-2">配置步骤：</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>在 Notion 创建 "Posts" 数据库</li>
                <li>添加属性：Title, Slug, Status, Category, Tags, Summary, Cover, PublishedAt</li>
                <li>获取 API Key 和 Database ID</li>
                <li>复制 .env.example 为 .env.local 并填入配置</li>
                <li>重启开发服务器</li>
              </ol>
            </div>
          </div>
        ) : (
          <PostListWithArchive posts={posts} />
        )}
      </section>
    </main>
  );
}
