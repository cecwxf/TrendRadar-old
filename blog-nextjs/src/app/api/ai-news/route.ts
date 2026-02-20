import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const revalidate = 86400; // daily cache

const FETCH_TIMEOUT_MS = 12000;
const JINA_TIMEOUT_MS = 12000;
const CURL_TIMEOUT_SECONDS = 20;
const CHIP_RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
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
  content?: string;
  quoted?: string;
  images?: string[];
}

interface ParsedFeedItem {
  item: NewsItem;
  rawTitle: string;
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
    { handle: "OpenAIDevs", profileUrl: "https://x.com/OpenAIDevs" },
    { handle: "AnthropicAI", profileUrl: "https://x.com/AnthropicAI" },
    { handle: "LangChainAI", profileUrl: "https://x.com/LangChainAI" },
    { handle: "llama_index", profileUrl: "https://x.com/llama_index" },
    { handle: "crewAIInc", profileUrl: "https://x.com/crewAIInc" },
  ],
  "大模型": [
    { handle: "OpenAI", profileUrl: "https://x.com/OpenAI" },
    { handle: "GoogleDeepMind", profileUrl: "https://x.com/GoogleDeepMind" },
    { handle: "MistralAI", profileUrl: "https://x.com/MistralAI" },
    { handle: "AIatMeta", profileUrl: "https://x.com/AIatMeta" },
    { handle: "xai", profileUrl: "https://x.com/xai" },
  ],
  "AI芯片": [
    { handle: "NVIDIAAI", profileUrl: "https://x.com/NVIDIAAI" },
    { handle: "AMD", profileUrl: "https://x.com/AMD" },
    { handle: "Intel", profileUrl: "https://x.com/Intel" },
    { handle: "Qualcomm", profileUrl: "https://x.com/Qualcomm" },
    { handle: "IanCutress", profileUrl: "https://x.com/IanCutress" },
  ],
};

const CATEGORY_ORDER: Category[] = ["大模型", "Agent", "AI芯片"];

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

function decodeHtmlEntities(text: string): string {
  const decodeNumeric = (value: number, fallback: string): string => {
    if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return fallback;
    try {
      return String.fromCodePoint(value);
    } catch {
      return fallback;
    }
  };

  return text
    .replace(/&#x([0-9a-f]+);/gi, (match: string, hex: string) =>
      decodeNumeric(parseInt(hex, 16), match)
    )
    .replace(/&#(\d+);/g, (match: string, dec: string) =>
      decodeNumeric(parseInt(dec, 10), match)
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractDescriptionHtml(blockXml: string): string {
  const encodedMatch = blockXml.match(
    /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>|<content:encoded(?:\s[^>]*)?>([\s\S]*?)<\/content:encoded>/i
  );
  if (encodedMatch) {
    return (encodedMatch[1] || encodedMatch[2] || "").trim();
  }

  const descriptionMatch = blockXml.match(
    /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i
  );
  if (descriptionMatch) {
    return (descriptionMatch[1] || descriptionMatch[2] || "").trim();
  }

  const contentMatch = blockXml.match(
    /<content(?:\s[^>]*)?><!\[CDATA\[([\s\S]*?)\]\]><\/content>|<content(?:\s[^>]*)?>([\s\S]*?)<\/content>/i
  );
  return (contentMatch ? contentMatch[1] || contentMatch[2] || "" : "").trim();
}

function stripHtmlToText(html: string): string {
  if (!html) return "";

  const text = html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return cleanText(decodeHtmlEntities(text));
}

function extractImageUrls(blockXml: string, descriptionHtml: string): string[] {
  const urls = new Set<string>();

  const addUrl = (value: string) => {
    const normalized = cleanText(value);
    if (!/^https?:\/\//i.test(normalized)) return;
    urls.add(normalized);
  };

  const mediaContentMatches = blockXml.matchAll(
    /<media:content[^>]*\burl=["']([^"']+)["'][^>]*>/gi
  );
  for (const match of mediaContentMatches) addUrl(match[1]);

  const enclosureMatches = blockXml.matchAll(
    /<enclosure[^>]*\burl=["']([^"']+)["'][^>]*>/gi
  );
  for (const match of enclosureMatches) {
    const typeMatch = match[0].match(/\btype=["']([^"']+)["']/i);
    if (typeMatch?.[1] && !/^image\//i.test(typeMatch[1])) continue;
    addUrl(match[1]);
  }

  const htmlImageMatches = descriptionHtml.matchAll(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi);
  for (const match of htmlImageMatches) addUrl(match[1]);

  return Array.from(urls).slice(0, 4);
}

function extractQuotedText(rawTitle: string, descriptionHtml: string): string | undefined {
  const blockQuoteMatch = descriptionHtml.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  if (blockQuoteMatch?.[1]) {
    const quoted = stripHtmlToText(blockQuoteMatch[1]).slice(0, 240);
    if (quoted) return quoted;
  }

  const qtAuthorMatch = rawTitle.match(/^QT by @([A-Za-z0-9_]+):/i);
  if (qtAuthorMatch?.[1]) return `@${qtAuthorMatch[1]}`;

  return undefined;
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

function parseBlock(blockXml: string, handle: string): ParsedFeedItem | null {
  const titleMatch = blockXml.match(
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i
  );
  const dateMatch = blockXml.match(
    /<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>|<updated>(.*?)<\/updated>/i
  );

  const rawTitle = cleanText(titleMatch ? titleMatch[1] || titleMatch[2] || "" : "");
  const title = normalizeTweetTitle(rawTitle);
  const url = parseEntryLink(blockXml);
  const pubDate = cleanText(dateMatch ? dateMatch[1] || dateMatch[2] || dateMatch[3] || "" : "");
  const descriptionHtml = extractDescriptionHtml(blockXml);
  const fullText = stripHtmlToText(descriptionHtml).slice(0, 900);
  const images = extractImageUrls(blockXml, descriptionHtml);
  const quoted = extractQuotedText(rawTitle, descriptionHtml);

  const normalizedTitle = cleanText(title).toLowerCase();
  const normalizedFullText = cleanText(fullText).toLowerCase();
  const content =
    fullText && normalizedFullText !== normalizedTitle
      ? fullText
      : undefined;

  if (!title || !url) return null;

  return {
    rawTitle,
    item: {
      title: `@${handle}: ${title}`,
      url,
      pubDate,
      source: `@${handle}`,
      content,
      quoted,
      images: images.length > 0 ? images : undefined,
    },
  };
}

function parseRSSItems(xml: string, handle: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];
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

function isRetweetOrReply(rawTitle: string): boolean {
  return /^RT by @/i.test(rawTitle) || /^R to @/i.test(rawTitle);
}

function isChipRelatedText(text: string): boolean {
  return /(chip|chips|gpu|npu|hbm|cuda|inference|semiconductor|wafer|foundry|blackwell|gaudi|instinct|mi3|mi350|tsmc|台积电|芯片|算力|半导体)/i.test(
    text
  );
}

function isRecentEnough(pubDate: string): boolean {
  const ts = new Date(pubDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= CHIP_RECENT_WINDOW_MS;
}

function isJinaNoiseLine(line: string): boolean {
  if (!line) return true;
  if (/^-{3,}$/.test(line)) return true;
  if (line === "Pinned" || line === "Quote") return true;
  if (/^Who to follow/i.test(line)) return true;
  if (line.startsWith("[![")) return true;
  if (/^\[(.*?)\]\(https?:\/\/.*\)$/.test(line)) return true;
  if (/^\d+[smhd]$/i.test(line)) return true;
  if (/^\d{1,2}:\d{2}$/.test(line)) return true;
  return false;
}

function extractTweetTextFromJina(markdown: string): string | null {
  const lines = markdown.split("\n").map((line) => line.trim());
  const postsIdx = lines.findIndex((line) => /posts$/i.test(line));
  let start = postsIdx >= 0 ? postsIdx + 1 : 0;
  if (start < 0) start = 0;

  const chunks: string[] = [];
  let current: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    if (/^Who to follow/i.test(line)) break;

    if (!line) {
      if (current.length > 0) {
        chunks.push(current.join(" "));
        current = [];
      }
      continue;
    }

    if (isJinaNoiseLine(line)) {
      continue;
    }

    current.push(line);
    if (current.join(" ").length >= 280) {
      break;
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  const tweet = chunks.find((chunk) => cleanText(chunk).length >= 12);
  if (!tweet) return null;

  return cleanText(tweet).slice(0, 420);
}

function extractImageUrlsFromJina(markdown: string): string[] {
  const imageMatches = markdown.match(
    /https?:\/\/(?:pbs\.twimg\.com|video\.twimg\.com)\/[^\s)\]]+/gi
  );
  if (!imageMatches) return [];
  return Array.from(new Set(imageMatches)).slice(0, 4);
}

function extractQuotedTextFromJina(markdown: string): string | undefined {
  const lines = markdown.split("\n").map((line) => line.trim());
  const quoteIdx = lines.findIndex((line) => /^Quote$/i.test(line));
  if (quoteIdx < 0) return undefined;

  const quoted: string[] = [];
  for (let i = quoteIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (quoted.length > 0) break;
      continue;
    }
    if (/^Who to follow/i.test(line)) break;
    if (isJinaNoiseLine(line)) continue;
    if (/^https?:\/\//i.test(line)) continue;

    quoted.push(line);
    if (quoted.join(" ").length >= 240) break;
  }

  const text = cleanText(quoted.join(" ")).slice(0, 240);
  return text || undefined;
}

function extractStatusUrlFromJina(markdown: string, handle: string): string | null {
  const statusRegex = new RegExp(`https://x\\.com/${handle}/status/\\d+`, "i");
  const statusMatch = markdown.match(statusRegex);
  if (statusMatch?.[0]) return statusMatch[0];

  const anyStatusMatch = markdown.match(/https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+/);
  if (anyStatusMatch?.[0]) return anyStatusMatch[0];

  return null;
}

async function fetchLatestTweetFromJina(account: TrackedAccount): Promise<NewsItem | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JINA_TIMEOUT_MS);

  try {
    const response = await fetch(`https://r.jina.ai/http://x.com/${account.handle}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
      },
    });

    if (!response.ok) return null;
    const markdown = await response.text();
    if (!markdown) return null;

    const tweetText = extractTweetTextFromJina(markdown);
    if (!tweetText) return null;

    const url = extractStatusUrlFromJina(markdown, account.handle) || account.profileUrl;

    return {
      title: `@${account.handle}: ${tweetText}`,
      url,
      pubDate: new Date().toISOString(),
      source: `@${account.handle}`,
      content: tweetText,
      quoted: extractQuotedTextFromJina(markdown),
      images: extractImageUrlsFromJina(markdown),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

      const parsedItems = parseRSSItems(xml, source.account.handle);
      if (parsedItems.length === 0) continue;

      const originalItems = parsedItems.filter((entry) => !isRetweetOrReply(entry.rawTitle));
      const basePool = originalItems.length > 0 ? originalItems : parsedItems;

      const categoryFilteredPool =
        source.category === "AI芯片"
          ? basePool.filter(
              (entry) =>
                isChipRelatedText(
                  `${entry.item.title} ${entry.item.content || ""} ${entry.item.quoted || ""}`
                ) &&
                isRecentEnough(entry.item.pubDate)
            )
          : basePool;
      const finalPool = categoryFilteredPool.length > 0 ? categoryFilteredPool : basePool;

      return sortByDateDesc(finalPool.map((entry) => entry.item))[0];
    }
  }

  // Fallback: parse timeline text from r.jina.ai mirror.
  const jinaItem = await fetchLatestTweetFromJina(source.account);
  if (jinaItem) return jinaItem;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  const livePayload = await buildLivePayload();
  const liveAllFallback = isAllFallback(livePayload);
  const cacheControl = forceRefresh
    ? "no-store"
    : liveAllFallback
      ? "public, s-maxage=60, stale-while-revalidate=60"
      : "public, s-maxage=86400, stale-while-revalidate=3600";

  return NextResponse.json(livePayload, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}
