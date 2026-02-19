import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { supabase, supabaseAdmin, TABLE_NAMES } from "@/lib/supabase/client";

export const revalidate = 86400; // daily cache

const FETCH_TIMEOUT_MS = 12000;
const CURL_TIMEOUT_SECONDS = 20;
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36";
const execFileAsync = promisify(execFile);

type Category = "大模型" | "Agent" | "AI芯片";

interface TrackedAccount {
  handle: string;
  profileUrl: string;
  lookupHandles?: string[];
}

interface AccountFeedSource {
  category: Category;
  account: TrackedAccount;
  lookupHandle: string;
  urls: string[];
}

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  source: string;
}

interface AINewsPayload {
  categories: Record<string, NewsItem[]>;
  updatedAt: string;
  refreshCycle: "daily";
  sources: string[];
  stats: {
    total: number;
    unavailable: number;
  };
}

const TRACKED_ACCOUNTS: Record<Category, TrackedAccount[]> = {
  Agent: [
    { handle: "opencode", profileUrl: "https://x.com/opencode" },
    { handle: "claudeai", profileUrl: "https://x.com/claudeai" },
    { handle: "cursor_ai", profileUrl: "https://x.com/cursor_ai" },
    { handle: "OpenAI", profileUrl: "https://x.com/OpenAI" },
    { handle: "OpenAIDevs", profileUrl: "https://x.com/OpenAIDevs" },
  ],
  "大模型": [
    { handle: "simonw", profileUrl: "https://x.com/simonw" },
    { handle: "polynoamial", profileUrl: "https://x.com/polynoamial" },
    { handle: "sam_shleifer", profileUrl: "https://x.com/sam_shleifer" },
    { handle: "Svwang1", profileUrl: "https://x.com/Svwang1" },
  ],
  "AI芯片": [
    { handle: "metawxf", profileUrl: "https://x.com/metawxf" },
    { handle: "dylan522p", profileUrl: "https://x.com/dylan522p" },
    { handle: "jimkxa", profileUrl: "https://x.com/jimkxa" },
    { handle: "IanCutress", profileUrl: "https://x.com/IanCutress" },
    { handle: "karlfreund", profileUrl: "https://x.com/karlfreund" },
  ],
};

const CATEGORY_ORDER: Category[] = ["大模型", "Agent", "AI芯片"];
const AI_NEWS_CACHE_KEY = "default";

function buildAccountFeedCandidates(handle: string): string[] {
  return [
    `https://nitter.net/${encodeURIComponent(handle)}/rss`,
  ];
}

function buildFeedSources(): AccountFeedSource[] {
  return CATEGORY_ORDER.flatMap((category) =>
    TRACKED_ACCOUNTS[category].flatMap((account) => {
      const lookupHandles = account.lookupHandles && account.lookupHandles.length > 0
        ? account.lookupHandles
        : [account.handle];

      return lookupHandles.map((lookupHandle) => ({
        category,
        account,
        lookupHandle,
        urls: buildAccountFeedCandidates(lookupHandle),
      }));
    })
  );
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTweetTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*-\s*Twitter$/i, "")
    .replace(/^RT by @[^:]+:\s*/i, "")
    .trim();
}

function parseEntryLink(blockXml: string): string {
  const alternateLink = blockXml.match(
    /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*\/?>/i
  );
  if (alternateLink?.[1]) return cleanText(alternateLink[1]);

  const hrefLink = blockXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (hrefLink?.[1]) return cleanText(hrefLink[1]);

  const plainLink = blockXml.match(
    /<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>/i
  );
  return cleanText(plainLink ? plainLink[1] || plainLink[2] || "" : "");
}

function parseBlock(blockXml: string, handle: string): NewsItem | null {
  const titleMatch = blockXml.match(
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title(?:\s[^>]*)?>(.*?)<\/title>/i
  );
  const dateMatch = blockXml.match(
    /<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>|<updated>(.*?)<\/updated>/i
  );

  const rawTitle = cleanText(titleMatch ? titleMatch[1] || titleMatch[2] || "" : "");
  const title = normalizeTweetTitle(rawTitle);
  const url = parseEntryLink(blockXml);
  const pubDate = cleanText(dateMatch ? dateMatch[1] || dateMatch[2] || dateMatch[3] || "" : "");

  if (!title || !url) return null;

  return {
    title: `@${handle}: ${title}`,
    url,
    pubDate,
    source: `@${handle}`,
  };
}

function parseRSSItems(xml: string, handle: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  const entryMatches = xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi);

  for (const match of itemMatches) {
    const parsed = parseBlock(match[1], handle);
    if (parsed) items.push(parsed);
  }
  for (const match of entryMatches) {
    const parsed = parseBlock(match[1], handle);
    if (parsed) items.push(parsed);
  }

  return items;
}

function sortByDateDesc(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });
}

function isLikelyFeed(xml: string): boolean {
  return /<rss[\s>]|<feed[\s>]/i.test(xml);
}

function isNotFoundPage(xml: string): boolean {
  return /User\s+"[^"]+"\s+not found|<title>Error\s*\|\s*nitter<\/title>/i.test(xml);
}

async function fetchSingleFeed(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        "Accept-Language": "en-US,en;q=0.8",
      },
    });

    if (!response.ok) return null;
    const xml = await response.text();
    if (!xml || !isLikelyFeed(xml) || isNotFoundPage(xml)) return null;
    return xml;
  } catch {
    // Fall back to curl when runtime fetch cannot reach target in this environment.
    try {
      const { stdout } = await execFileAsync(
        "curl",
        [
          "--http1.1",
          "-L",
          "--max-time",
          String(CURL_TIMEOUT_SECONDS),
          "-A",
          BROWSER_UA,
          "-H",
          "Accept: application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
          "-H",
          "Accept-Language: en-US,en;q=0.8",
          url,
        ],
        { maxBuffer: 1024 * 1024 * 2 }
      );
      const xml = stdout || "";
      if (!xml || !isLikelyFeed(xml) || isNotFoundPage(xml)) return null;
      return xml;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatestTweet(source: AccountFeedSource): Promise<NewsItem | null> {
  for (const url of source.urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const xml = await fetchSingleFeed(url);
      if (!xml) continue;

      const items = parseRSSItems(xml, source.account.handle);
      if (items.length === 0) continue;

      return sortByDateDesc(items)[0];
    }
  }

  return null;
}

function buildFallbackItem(account: TrackedAccount): NewsItem {
  return {
    title: `@${account.handle}: 最近推文暂不可用，请点击查看主页。`,
    url: account.profileUrl,
    pubDate: new Date().toISOString(),
    source: `@${account.handle}`,
  };
}

async function buildLivePayload(): Promise<AINewsPayload> {
  const feedSources = buildFeedSources();

  const fetched = await Promise.allSettled(
    feedSources.map(async (source) => ({
      source,
      item: await fetchLatestTweet(source),
    }))
  );

  const latestByHandle = new Map<string, NewsItem>();

  for (const result of fetched) {
    if (result.status !== "fulfilled") continue;
    const { source, item } = result.value;
    if (!item) continue;
    latestByHandle.set(source.account.handle.toLowerCase(), item);
  }

  const categories: Record<string, NewsItem[]> = {
    "大模型": [],
    Agent: [],
    "AI芯片": [],
  };

  for (const category of CATEGORY_ORDER) {
    categories[category] = TRACKED_ACCOUNTS[category].map((account) => {
      const existing = latestByHandle.get(account.handle.toLowerCase());
      return existing || buildFallbackItem(account);
    });
  }

  const allItems = Object.values(categories).flat();
  const fallbackCount = allItems.filter((item) =>
    item.title.includes("最近推文暂不可用")
  ).length;

  return {
    categories,
    updatedAt: new Date().toISOString(),
    refreshCycle: "daily",
    sources: ["x_accounts"],
    stats: {
      total: allItems.length,
      unavailable: fallbackCount,
    },
  };
}

function isAllFallback(payload: AINewsPayload): boolean {
  return payload.stats.total > 0 && payload.stats.unavailable === payload.stats.total;
}

async function loadCachedPayload(): Promise<AINewsPayload | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(TABLE_NAMES.AI_NEWS_CACHE)
      .select("payload, updated_at")
      .eq("cache_key", AI_NEWS_CACHE_KEY)
      .single();

    if (error || !data?.payload) return null;
    const payload = data.payload as AINewsPayload;
    if (!payload?.categories) return null;

    return {
      ...payload,
      updatedAt: payload.updatedAt || data.updated_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function saveCachedPayload(payload: AINewsPayload): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    await supabaseAdmin
      .from(TABLE_NAMES.AI_NEWS_CACHE)
      .upsert(
        {
          cache_key: AI_NEWS_CACHE_KEY,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" }
      );
  } catch {
    // Ignore save errors to keep API availability.
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  const cachedPayload = await loadCachedPayload();
  if (!forceRefresh && cachedPayload) {
    return NextResponse.json(cachedPayload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
      },
    });
  }

  const livePayload = await buildLivePayload();
  const liveAllFallback = isAllFallback(livePayload);
  const cacheControl = liveAllFallback
    ? "public, s-maxage=60, stale-while-revalidate=60"
    : "public, s-maxage=86400, stale-while-revalidate=43200";

  if (!liveAllFallback) {
    await saveCachedPayload(livePayload);
    return NextResponse.json(livePayload, {
      headers: {
        "Cache-Control": cacheControl,
      },
    });
  }

  if (cachedPayload) {
    return NextResponse.json(cachedPayload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    });
  }

  return NextResponse.json(livePayload, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}
