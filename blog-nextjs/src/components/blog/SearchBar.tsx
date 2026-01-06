/**
 * 搜索栏组件
 *
 * 简单的客户端搜索（搜索标题、摘要、分类和标签）
 */

"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { PostCard } from "./PostCard";
import type { PostListItem } from "@/types/blog";

interface SearchBarProps {
  posts: PostListItem[];
}

export function SearchBar({ posts }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // 搜索逻辑
  const filteredPosts = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase().trim();

    return posts.filter((post) => {
      const matchesTitle = post.title.toLowerCase().includes(searchTerm);
      const matchesSummary = post.summary.toLowerCase().includes(searchTerm);
      const matchesCategory = post.category.toLowerCase().includes(searchTerm);
      const matchesTags = post.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm)
      );

      return matchesTitle || matchesSummary || matchesCategory || matchesTags;
    });
  }, [posts, query]);

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* 搜索输入框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索文章..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
            aria-label="清除搜索"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* 搜索结果下拉框 */}
      {isOpen && query.trim() && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 结果面板 */}
          <div className="absolute top-full mt-2 w-full max-w-2xl bg-card border rounded-lg shadow-lg z-50 max-h-[600px] overflow-y-auto">
            {filteredPosts.length > 0 ? (
              <div className="p-4">
                <div className="text-sm text-muted-foreground mb-4">
                  找到 {filteredPosts.length} 篇文章
                </div>
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer"
                    >
                      <SearchResultItem post={post} query={query} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>没有找到匹配的文章</p>
                <p className="text-sm mt-2">试试其他关键词</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 搜索结果项（简化版的文章卡片）
 */
function SearchResultItem({
  post,
  query,
}: {
  post: PostListItem;
  query: string;
}) {
  return (
    <a
      href={`/article/${post.slug}`}
      className="block p-4 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* 分类徽章 */}
        <div className="flex-shrink-0">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {post.category}
          </span>
        </div>

        {/* 文章信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1 line-clamp-1">
            <HighlightText text={post.title} query={query} />
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            <HighlightText text={post.summary} query={query} />
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {new Date(post.publishedAt).toLocaleDateString("zh-CN")}
            </span>
            <span>·</span>
            <span>{post.readingTime} 分钟阅读</span>
            {post.tags.length > 0 && (
              <>
                <span>·</span>
                <div className="flex gap-1">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

/**
 * 高亮匹配的文本
 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-900">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
