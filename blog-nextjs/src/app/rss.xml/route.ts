/**
 * RSS Feed 生成器
 *
 * GET /rss.xml
 *
 * 生成符合 RSS 2.0 规范的 feed
 */

import { NextResponse } from "next/server";
import { getPosts } from "@/lib/notion/client";
import { notionPageToMarkdown } from "@/lib/notion/renderer";

export const revalidate = 3600; // 每小时重新生成

// RSS Feed 的基本信息（可以从环境变量读取）
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";
const SITE_TITLE = "空间超算";
const SITE_DESCRIPTION = "我们反思成长，静静等待扭转乾坤";
const SITE_LANGUAGE = "zh-CN";
const SITE_AUTHOR = "空间超算";

export async function GET() {
  try {
    const posts = await getPosts();

    // 生成 RSS Feed XML
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>${SITE_LANGUAGE}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <generator>Next.js</generator>
    <webMaster>noreply@${SITE_URL.replace(/^https?:\/\//, "")} (${SITE_AUTHOR})</webMaster>
${await Promise.all(posts.slice(0, 20).map(async (post) => {
  // 获取文章内容（可选，用于 content:encoded）
  let content = post.summary;
  try {
    const markdown = await notionPageToMarkdown(post.id);
    // 简化 markdown 为 HTML（基础转换）
    content = markdownToHtml(markdown);
  } catch (error) {
    console.error(`Failed to get content for ${post.slug}:`, error);
  }

  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/article/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/article/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.summary)}</description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <category>${escapeXml(post.category)}</category>
${post.tags.map(tag => `      <category>${escapeXml(tag)}</category>`).join('\n')}
${post.cover ? `      <enclosure url="${escapeXml(post.cover)}" type="image/jpeg"/>` : ''}
    </item>`;
}))}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title></channel></rss>`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 简单的 Markdown 到 HTML 转换
 * （仅用于 RSS，不需要完整的 Markdown 解析）
 */
function markdownToHtml(markdown: string): string {
  return markdown
    // 标题
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 代码
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // 换行
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    // 包装段落
    .replace(/^(.+)$/gim, "<p>$1</p>")
    // 清理多余的 p 标签
    .replace(/<p><\/p>/g, "")
    .replace(/<p>(<h[1-6]>)/g, "$1")
    .replace(/(<\/h[1-6]>)<\/p>/g, "$1");
}
