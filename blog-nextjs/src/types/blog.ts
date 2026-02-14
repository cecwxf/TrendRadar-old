/**
 * 博客相关类型定义
 */

export interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  cover?: string;
  pinned?: boolean;
  publishedAt: string;
  readingTime: number;
  viewCount?: number;
}

export interface Category {
  name: string;
  slug: string;
  count: number;
  color?: string;
}

export interface Tag {
  name: string;
  slug: string;
  count: number;
  color?: string;
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  cover?: string;
  pinned?: boolean;
  publishedAt: string;
  readingTime: number;
  viewCount?: number;
}
