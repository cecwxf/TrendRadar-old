/**
 * Notion API 类型定义
 */

export interface NotionPost {
  id: string;
  title: string;
  slug: string;
  status: "Published" | "Draft" | "Archived";
  category: string;
  tags: string[];
  summary: string;
  cover?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotionPageContent {
  id: string;
  content: string; // Markdown 格式
}

export interface NotionDatabaseQuery {
  filter?: {
    property: string;
    select?: { equals: string };
    multi_select?: { contains: string };
    date?: { after?: string; before?: string };
  };
  sorts?: Array<{
    property: string;
    direction: "ascending" | "descending";
  }>;
  page_size?: number;
  start_cursor?: string;
}

export interface PostMetadata {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  summary: string;
  cover?: string;
  publishedAt: string;
  readingTime?: number;
}
