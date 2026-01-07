/**
 * Notion API 客户端
 *
 * 功能：
 * - 连接 Notion API
 * - 查询 Posts 数据库
 * - 获取文章内容
 * - 转换 Notion 数据为应用数据格式
 */

import { Client } from "@notionhq/client";
import type { NotionPost } from "@/types/notion";

// 获取环境变量
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID || "";

// 初始化 Notion 客户端（仅当有 Token 时）
export const notion = NOTION_TOKEN
  ? new Client({
      auth: NOTION_TOKEN,
    })
  : null;

/**
 * 获取所有已发布的文章
 */
export async function getPosts(): Promise<NotionPost[]> {
  if (!notion) {
    console.warn("NOTION_TOKEN not configured");
    return [];
  }

  if (!DATABASE_ID) {
    console.warn("NOTION_DATABASE_ID not configured");
    return [];
  }

  try {
    const response = await (notion.databases as any).query({
      database_id: DATABASE_ID,
      filter: {
        property: "Published",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "PublishDate",
          direction: "descending",
        },
      ],
    });

    return response.results.map((page: any) => extractPostData(page));
  } catch (error) {
    console.error("Error fetching posts from Notion:", error);
    return [];
  }
}

/**
 * 根据 slug 获取单篇文章
 */
export async function getPostBySlug(slug: string): Promise<NotionPost | null> {
  if (!notion) {
    console.warn("NOTION_TOKEN not configured");
    return null;
  }

  if (!DATABASE_ID) {
    console.warn("NOTION_DATABASE_ID not configured");
    return null;
  }

  try {
    const response = await (notion.databases as any).query({
      database_id: DATABASE_ID,
      filter: {
        and: [
          {
            property: "slug",
            rich_text: {
              equals: slug,
            },
          },
          {
            property: "Published",
            checkbox: {
              equals: true,
            },
          },
        ],
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    return extractPostData(response.results[0]);
  } catch (error) {
    console.error(`Error fetching post ${slug} from Notion:`, error);
    return null;
  }
}

/**
 * 获取文章页面内容
 */
export async function getPageContent(pageId: string): Promise<any[]> {
  if (!notion) {
    console.warn("NOTION_TOKEN not configured");
    return [];
  }

  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
    });

    return response.results;
  } catch (error) {
    console.error(`Error fetching page content ${pageId}:`, error);
    return [];
  }
}

/**
 * 获取所有分类
 */
export async function getCategories(): Promise<string[]> {
  if (!notion) return [];
  if (!DATABASE_ID) return [];

  try {
    const response: any = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });

    const categoryProperty = response.properties?.Category;
    if (categoryProperty?.type === "select" && categoryProperty.select?.options) {
      return categoryProperty.select.options.map((opt: any) => opt.name);
    }

    return [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

/**
 * 获取所有标签
 */
export async function getTags(): Promise<string[]> {
  if (!notion) return [];
  if (!DATABASE_ID) return [];

  try {
    const response: any = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });

    const tagsProperty = response.properties?.Tags;
    if (tagsProperty?.type === "multi_select" && tagsProperty.multi_select?.options) {
      return tagsProperty.multi_select.options.map((opt: any) => opt.name);
    }

    return [];
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}

/**
 * 从 Notion Page 对象提取文章数据
 */
function extractPostData(page: any): NotionPost {
  const properties = page.properties;

  // 获取封面图URL，确保是有效的URL或undefined
  let coverUrl: string | undefined = undefined;
  if (properties.CoverImage?.url && typeof properties.CoverImage.url === 'string') {
    // 只接受以 http:// 或 https:// 开头的有效 URL
    const url = properties.CoverImage.url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      coverUrl = url;
    }
  }

  return {
    id: page.id,
    title: getPlainText(properties.Name?.title || []),
    slug: getPlainText(properties.slug?.rich_text || []),
    status: properties.Published?.checkbox ? "Published" : "Draft",
    category: properties.Category?.select?.name || "未分类",
    tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
    summary: getPlainText(properties.Summary?.rich_text || []),
    cover: coverUrl,
    publishedAt: properties.PublishDate?.date?.start || page.created_time,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

/**
 * 提取纯文本
 */
function getPlainText(richText: any[]): string {
  return richText.map(text => text.plain_text).join("");
}
