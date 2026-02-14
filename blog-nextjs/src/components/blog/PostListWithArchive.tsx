"use client";

import { useState, useMemo } from "react";
import { PostCard } from "@/components/blog/PostCard";
import { DateArchiveSidebar, DateArchiveMobile } from "@/components/blog/DateArchive";
import { SearchBar } from "@/components/blog/SearchBar";
import type { PostListItem } from "@/types/blog";

interface PostListWithArchiveProps {
  posts: PostListItem[];
}

export function PostListWithArchive({ posts }: PostListWithArchiveProps) {
  const [selectedArchive, setSelectedArchive] = useState<string | null>(null);

  const archives = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      const date = new Date(post.publishedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => {
        const [year, month] = key.split("-");
        return {
          key,
          label: `${year}年${parseInt(month)}月`,
          count,
        };
      });
  }, [posts]);

  // Sort: pinned first, then by publishedAt descending
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!selectedArchive) return sortedPosts;
    return sortedPosts.filter((post) => {
      const date = new Date(post.publishedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedArchive;
    });
  }, [sortedPosts, selectedArchive]);

  const archiveProps = {
    archives,
    selected: selectedArchive,
    onSelect: setSelectedArchive,
    totalCount: posts.length,
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <h2 className="text-3xl font-bold">最新文章</h2>
        <div className="w-full md:w-96">
          <SearchBar posts={posts} />
        </div>
      </div>

      {/* Mobile: dropdown above grid */}
      <DateArchiveMobile {...archiveProps} />

      {/* Desktop: sidebar + grid in flex row */}
      <div className="flex gap-8">
        <DateArchiveSidebar {...archiveProps} />

        <div className="flex-1 min-w-0">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {filteredPosts.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              该月份暂无文章
            </p>
          )}
        </div>
      </div>
    </>
  );
}
