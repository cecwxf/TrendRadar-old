/**
 * Notion Blocks 渲染器
 *
 * 将 Notion blocks 转换为 Markdown 格式
 */

import { NotionToMarkdown } from "notion-to-md";
import { Client } from "@notionhq/client";
import { notion } from "./client";

/**
 * 获取 Notion to Markdown 转换器实例
 */
function getN2M(): NotionToMarkdown | null {
  if (!notion) {
    return null;
  }
  // 使用类型断言确保 TypeScript 知道 notion 不是 null
  return new NotionToMarkdown({ notionClient: notion as Client });
}

/**
 * 将 Notion 页面内容转换为 Markdown
 */
export async function notionPageToMarkdown(pageId: string): Promise<string> {
  const n2m = getN2M();

  if (!n2m) {
    console.warn("Notion client not configured");
    return "";
  }

  try {
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const markdown = n2m.toMarkdownString(mdBlocks);
    return markdown.parent;
  } catch (error) {
    console.error(`Error converting page ${pageId} to Markdown:`, error);
    return "";
  }
}

/**
 * 计算阅读时间（分钟）
 * 假设平均阅读速度为 200 字/分钟（中文）
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;

  // 移除 Markdown 标记
  const plainText = content
    .replace(/[#*`~\[\]()]/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "");

  // 计算字符数（中文为主）
  const charCount = plainText.length;

  // 计算阅读时间
  const minutes = Math.ceil(charCount / wordsPerMinute);

  return Math.max(1, minutes); // 至少1分钟
}
