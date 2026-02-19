import { NextResponse } from "next/server";

export const revalidate = 86400; // daily cache

const FETCH_TIMEOUT_MS = 6000;

type Category = "大模型" | "Agent" | "AI芯片";

interface TrackedAccount {
  handle: string;
  profileUrl: string;
}

interface AccountFeedSource {
  category: Category;
  account: TrackedAccount;
  urls: string[];
}

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  source: string;
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
    { handle: "SemiAnalysis", profileUrl: "https://x.com/SemiAnalysis" },
    { handle: "dylan522p", profileUrl: "https://x.com/dylan522p" },
    { handle: "jimkxa", profileUrl: "https://x.com/jimkxa" },
    { handle: "IanCutress", profileUrl: "https://x.com/IanCutress" },
    { handle: "karlfreund", profileUrl: "https://x.com/karlfreund" },
  ],
};

const CATEGORY_ORDER: Category[] = ["大模型", "Agent", "AI芯片"];

function buildAccountFeedCandidates(handle: string): string[] {
  return [
    `https://twitrss.me/twitter_user_to_rss/?user=${encodeURIComponent(handle)}`,
    `https://nitter.net/${encodeURIComponent(handle)}/rss`,
    `https://nitter.poast.org/${encodeURIComponent(handle)}/rss`,
  ];
}

function buildFeedSources(): AccountFeedSource[] {
  return CATEGORY_ORDER.flatMap((category) =>
    TRACKED_ACCOUNTS[category].map((account) => ({
      category,
      account,
      urls: buildAccountFeedCandidates(account.handle),
    }))
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

function parseRSSItems(xml: string, handle: string): NewsItem[] {
  const items: NewsItem[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of matches) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(
      /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/
    );
    const linkMatch = itemXml.match(
      /<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>|<link[^>]+href="([^"]*)"[^>]*\/>/
    );
    const dateMatch = itemXml.match(
      /<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>|<updated>(.*?)<\/updated>/
    );

    const rawTitle = cleanText(titleMatch ? titleMatch[1] || titleMatch[2] || "" : "");
    const title = normalizeTweetTitle(rawTitle);
    const url = cleanText(linkMatch ? linkMatch[1] || linkMatch[2] || linkMatch[3] || "" : "");
    const pubDate = cleanText(dateMatch ? dateMatch[1] || dateMatch[2] || dateMatch[3] || "" : "");

    if (!title || !url) continue;

    items.push({
      title: `@${handle}: ${title}`,
      url,
      pubDate,
      source: `@${handle}`,
    });
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

async function fetchSingleFeed(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TrendRadar/1.0 AI Dock",
      },
    });

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatestTweet(source: AccountFeedSource): Promise<NewsItem | null> {
  for (const url of source.urls) {
    const xml = await fetchSingleFeed(url);
    if (!xml) continue;

    const items = parseRSSItems(xml, source.account.handle);
    if (items.length === 0) continue;

    return sortByDateDesc(items)[0];
  }

  return null;
}

function buildFallbackItem(account: TrackedAccount): NewsItem {
  return {
    title: `@${account.handle}: 今日暂无可用推文数据，请点击查看主页。`,
    url: account.profileUrl,
    pubDate: new Date().toISOString(),
    source: `@${account.handle}`,
  };
}

export async function GET() {
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

  return NextResponse.json(
    {
      categories,
      updatedAt: new Date().toISOString(),
      refreshCycle: "daily",
      sources: ["x_accounts"],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    }
  );
}
