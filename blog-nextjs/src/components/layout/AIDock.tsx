"use client";

import { useState, useEffect } from "react";

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  source: string;
}

interface AINewsData {
  categories: Record<string, NewsItem[]>;
  updatedAt: string;
}

export function AIDock() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AINewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    fetch("/api/ai-news")
      .then((res) => res.json())
      .then((json: AINewsData) => {
        setData(json);
        const cats = Object.keys(json.categories);
        if (cats.length > 0 && !activeTab) setActiveTab(cats[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, data, activeTab]);

  const categories = data?.categories || {};
  const tabs = Object.keys(categories);
  const currentItems = activeTab ? categories[activeTab] || [] : [];

  return (
    <div className="fixed right-0 top-1/4 z-40 hidden lg:flex">
      {/* Collapsed tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center rounded-l-lg bg-gradient-to-b from-blue-600 to-purple-600 px-1.5 py-4 text-white shadow-lg transition-all hover:px-2.5"
          style={{ writingMode: "vertical-rl" }}
        >
          <span className="text-sm font-medium tracking-widest">AI 动态</span>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="flex w-[300px] flex-col rounded-l-xl border-l border-t border-b border-border bg-background/95 shadow-2xl backdrop-blur">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">AI 动态</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          )}

          {/* Content */}
          {!loading && data && (
            <>
              {/* Category tabs */}
              {tabs.length > 0 && (
                <div className="flex gap-1 border-b border-border px-3 py-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        activeTab === tab
                          ? "bg-blue-600 text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              {/* News list */}
              <div className="flex-1 overflow-y-auto px-3 py-2" style={{ maxHeight: "360px" }}>
                {currentItems.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    暂无数据
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {currentItems.map((item, i) => (
                      <li key={i}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                        >
                          <p className="line-clamp-2 text-xs leading-relaxed text-foreground group-hover:text-blue-500">
                            {item.title}
                          </p>
                          <span className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.source}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              {data.updatedAt && (
                <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                  更新于{" "}
                  {new Date(data.updatedAt).toLocaleString("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </>
          )}

          {/* Empty state when no data and not loading */}
          {!loading && !data && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              加载失败，请稍后重试
            </p>
          )}
        </div>
      )}
    </div>
  );
}
