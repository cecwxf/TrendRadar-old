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

// 初始化 Notion 客户端
export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Notion 数据库 ID
const DATABASE_ID = process.env.NOTION_DATABASE_ID || "";

/**
 * 获取所有已发布的文章
 */
export async function getPosts(): Promise<NotionPost[]> {
  if (!DATABASE_ID) {
    console.warn("NOTION_DATABASE_ID not configured");
    return [];
  }

  try {
    const response = await (notion.databases as any).query({
      database_id: DATABASE_ID,
      filter: {
        property: "Status",
        select: {
          equals: "Published",
        },
      },
      sorts: [
        {
          property: "PublishedAt",
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
            property: "Slug",
            rich_text: {
              equals: slug,
            },
          },
          {
            property: "Status",
            select: {
              equals: "Published",
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

  return {
    id: page.id,
    title: getPlainText(properties.Title?.title || properties.Name?.title || []),
    slug: getPlainText(properties.Slug?.rich_text || []),
    status: properties.Status?.select?.name || "Draft",
    category: properties.Category?.select?.name || "未分类",
    tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
    summary: getPlainText(properties.Summary?.rich_text || []),
    cover: properties.Cover?.files?.[0]?.file?.url || properties.Cover?.files?.[0]?.external?.url,
    publishedAt: properties.PublishedAt?.date?.start || page.created_time,
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
