"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/language/LanguageProvider";

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  source: string;
  content?: string;
  quoted?: string;
  images?: string[];
  quoteImages?: string[];
}

interface AINewsData {
  categories: Record<string, NewsItem[]>;
  updatedAt: string;
}

const UI_TEXT: Record<string, Record<string, string>> = {
  zh: { title: "AI 动态", noData: "暂无数据", loadFailed: "加载失败，请稍后重试", updatedAt: "更新于", cadence: "每日更新，尽量展示完整推文（含引用与图片）" },
  en: { title: "AI Updates", noData: "No data", loadFailed: "Failed to load", updatedAt: "Updated", cadence: "Updated daily with fuller posts, including quotes and images when available" },
  vi: { title: "Tin tức AI", noData: "Không có dữ liệu", loadFailed: "Tải thất bại", updatedAt: "Cập nhật", cadence: "Cập nhật hằng ngày với nội dung đầy đủ hơn, gồm trích dẫn và ảnh khi có" },
  de: { title: "KI Aktuell", noData: "Keine Daten", loadFailed: "Laden fehlgeschlagen", updatedAt: "Aktualisiert", cadence: "Tägliche Updates mit mehr vollständigen Posts inkl. Zitate und Bilder falls verfügbar" },
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  "大模型": { zh: "大模型", en: "LLMs", vi: "Mô hình LLM", de: "KI-Modelle" },
  "Agent": { zh: "Agents", en: "Agents", vi: "Agent AI", de: "KI-Agenten" },
  "AI芯片": { zh: "AI芯片", en: "AI Chips", vi: "Chip AI", de: "KI-Chips" },
};

const CATEGORY_ORDER = ["大模型", "Agent", "AI芯片"];
const AI_NEWS_CACHE_VERSION = "20260220-3";

export function AIDock() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<AINewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("大模型");

  const t = UI_TEXT[lang] || UI_TEXT.zh;

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    setLoading(true);
    setError(false);
    fetch(`/api/ai-news?lang=${lang}&v=${AI_NEWS_CACHE_VERSION}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch ai news");
        return res.json();
      })
      .then((json: AINewsData) => {
        if (!alive) return;
        setData(json);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
        setData(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [lang]);

  const categories = data?.categories || {};
  const tabs = CATEGORY_ORDER;
  const currentItems = activeTab ? categories[activeTab] || [] : [];

  function getCategoryLabel(cat: string): string {
    return CATEGORY_LABELS[cat]?.[lang] || CATEGORY_LABELS[cat]?.zh || cat;
  }

  function normalizedText(value: string): string {
    return value.replace(/\s+/g, " ").trim().toLowerCase();
  }

  function renderImageGrid(images: string[] | undefined, keyPrefix: string, compact = false) {
    if (!images || images.length === 0) return null;
    const shownImages = images.slice(0, 4);
    const gridCols = shownImages.length === 1 ? "grid-cols-1" : "grid-cols-2";
    const imageHeightClass = compact
      ? shownImages.length === 1
        ? "h-24"
        : "h-20"
      : shownImages.length === 1
        ? "h-44"
        : "h-28";

    return (
      <div className={`mt-2 grid ${gridCols} gap-1.5`}>
        {shownImages.map((imageUrl, imageIdx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${keyPrefix}-img-${imageIdx}`}
            src={imageUrl}
            alt="tweet media"
            loading="lazy"
            className={`${imageHeightClass} w-full rounded-md object-cover bg-muted`}
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-[8%] z-40 hidden lg:flex">
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
          className="flex w-[430px] xl:w-[480px] flex-col rounded-l-xl border-l border-t border-b border-border bg-background/95 shadow-2xl backdrop-blur"
          style={{ overflowY: "auto", maxHeight: "calc(100vh - 64px)" }}
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
              <div className="px-3 pb-1 text-[10px] text-muted-foreground">
                {t.cadence}
              </div>

              {/* News list */}
              <div
                className="flex-1 overflow-y-auto px-3 py-2"
                style={{ maxHeight: "calc(100vh - 170px)" }}
              >
                {currentItems.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {t.noData}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {currentItems.map((item, i) => {
                      const titleWithoutSource = item.title.replace(/^@[A-Za-z0-9_]+:\s*/, "");
                      const bodyText =
                        item.content && item.content.trim().length > 0
                          ? item.content.trim()
                          : titleWithoutSource;
                      const showTitle = normalizedText(bodyText) !== normalizedText(titleWithoutSource);

                      return (
                        <li key={i}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 transition-colors hover:border-blue-500/50 hover:bg-muted/50"
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-medium text-foreground">{item.source}</span>
                              <span>
                                {item.pubDate
                                  ? new Date(item.pubDate).toLocaleDateString(
                                    lang === "zh" ? "zh-CN" : "en-US"
                                  )
                                  : ""}
                              </span>
                            </div>

                            {showTitle && (
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground break-words">
                                {titleWithoutSource}
                              </p>
                            )}

                            <p className="mt-1.5 text-[12px] leading-5 text-foreground whitespace-pre-line break-words">
                              {bodyText}
                            </p>

                            {renderImageGrid(item.images, item.url, false)}

                            {item.quoted && (
                              <div className="mt-2 rounded-md border border-border bg-muted/40 px-2 py-1.5">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  引用
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                                  {item.quoted}
                                </p>
                                {renderImageGrid(item.quoteImages, `${item.url}-quote`, true)}
                              </div>
                            )}

                            <span className="mt-2 inline-block text-[10px] text-blue-500/90 group-hover:text-blue-500">
                              查看原帖
                            </span>
                          </a>
                        </li>
                      );
                    })}
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
