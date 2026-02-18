"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/language/LanguageProvider";

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

const UI_TEXT: Record<string, Record<string, string>> = {
  zh: { title: "AI 动态", noData: "暂无数据", loadFailed: "加载失败，请稍后重试", updatedAt: "更新于" },
  en: { title: "AI Updates", noData: "No data", loadFailed: "Failed to load", updatedAt: "Updated" },
  vi: { title: "Tin tức AI", noData: "Không có dữ liệu", loadFailed: "Tải thất bại", updatedAt: "Cập nhật" },
  de: { title: "KI Aktuell", noData: "Keine Daten", loadFailed: "Laden fehlgeschlagen", updatedAt: "Aktualisiert" },
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  "大模型": { zh: "大模型", en: "LLMs", vi: "Mô hình LLM", de: "KI-Modelle" },
  "Agent": { zh: "Agent", en: "Agents", vi: "Agent AI", de: "KI-Agenten" },
  "AI芯片": { zh: "AI芯片", en: "AI Chips", vi: "Chip AI", de: "KI-Chips" },
};

const CATEGORY_ORDER = ["大模型", "Agent", "AI芯片"];

export function AIDock() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<AINewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("大模型");

  const t = UI_TEXT[lang] || UI_TEXT.zh;

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch("/api/ai-news")
      .then((res) => res.json())
      .then((json: AINewsData) => {
        setData(json);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = data?.categories || {};
  const tabs = CATEGORY_ORDER;
  const currentItems = activeTab ? categories[activeTab] || [] : [];

  function getCategoryLabel(cat: string): string {
    return CATEGORY_LABELS[cat]?.[lang] || CATEGORY_LABELS[cat]?.zh || cat;
  }

  return (
    <div className="fixed right-0 top-1/4 z-40 hidden lg:flex">
      {/* Collapsed tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center rounded-l-lg bg-gradient-to-b from-blue-600 to-purple-600 px-1.5 py-4 text-white shadow-lg transition-all hover:px-2.5"
          style={{ writingMode: "vertical-rl" }}
        >
          <span className="text-sm font-medium tracking-widest">{t.title}</span>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          className="flex w-[300px] flex-col rounded-l-xl border-l border-t border-b border-border bg-background/95 shadow-2xl backdrop-blur"
          style={{ overflowY: "auto", maxHeight: "calc(100vh - 100px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
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
                      {getCategoryLabel(tab)}
                    </button>
                  ))}
                </div>
              )}

              {/* News list */}
              <div
                className="flex-1 overflow-y-auto px-3 py-2"
                style={{ maxHeight: "calc(100vh - 200px)" }}
              >
                {currentItems.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {t.noData}
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
                  {t.updatedAt}{" "}
                  {new Date(data.updatedAt).toLocaleString(lang === "zh" ? "zh-CN" : lang === "de" ? "de-DE" : lang === "vi" ? "vi-VN" : "en-US", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </>
          )}

          {/* Error state */}
          {!loading && !data && error && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t.loadFailed}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
