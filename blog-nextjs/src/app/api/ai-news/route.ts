import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 hour cache

interface RSSSource {
  url: string;
  category: string;
}

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  source: string;
}

const RSS_SOURCES: RSSSource[] = [
  // 大模型 - 开源和闭源进展
  { url: "https://huggingface.co/blog/feed.xml", category: "大模型" },
  { url: "https://www.artificialintelligence-news.com/feed/", category: "大模型" },
  { url: "https://syncedreview.com/feed/", category: "大模型" },
  // Agent - Claude Code / opencode / AI Agent 进展
  { url: "https://feeds.feedburner.com/venturebeat/SZYF", category: "Agent" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "Agent" },
  // AI 芯片
  { url: "https://feeds.feedburner.com/AnandTech", category: "AI芯片" },
  { url: "https://feeds.arstechnica.com/arstechnica/technology-lab", category: "AI芯片" },
];

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "").replace("feeds.feedburner.com", "");
    if (url.includes("venturebeat")) return "VentureBeat";
    if (url.includes("techcrunch")) return "TechCrunch";
    if (url.includes("huggingface")) return "HuggingFace";
    if (url.includes("artificialintelligence-news")) return "AI News";
    if (url.includes("syncedreview")) return "Synced";
    if (url.includes("AnandTech")) return "AnandTech";
    if (url.includes("arstechnica")) return "Ars Technica";
    return hostname;
  } catch {
    return "Unknown";
  }
}

function parseRSSItems(xml: string, source: RSSSource): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const sourceName = extractSourceName(source.url);

  for (const match of itemMatches) {
    const itemXml = match[1];

    // Extract title (CDATA or plain)
    const titleMatch = itemXml.match(
      /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/
    );
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";

    // Extract link - handle both <link>url</link> and <link href="url"/>
    const linkMatch = itemXml.match(
      /<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>|<link[^>]+href="([^"]*)"[^>]*\/>/
    );
    const url = linkMatch ? (linkMatch[1] || linkMatch[2] || linkMatch[3] || "").trim() : "";

    // Extract pubDate
    const dateMatch = itemXml.match(
      /<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>|<dc:date>(.*?)<\/dc:date>/
    );
    const dateStr = dateMatch ? (dateMatch[1] || dateMatch[2] || dateMatch[3] || "").trim() : "";

    if (!title || !url) continue;

    // Filter by date - if no date, include it (some feeds don't have dates)
    if (dateStr) {
      const pubTime = new Date(dateStr).getTime();
      if (isNaN(pubTime) || pubTime < threeDaysAgo) continue;
    }

    items.push({ title, url, pubDate: dateStr, source: sourceName });
  }

  return items;
}

async function fetchRSS(source: RSSSource): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TrendRadar/1.0 RSS Reader",
      },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return parseRSSItems(xml, source);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map((source) => fetchRSS(source))
  );

  const categories: Record<string, NewsItem[]> = {};

  results.forEach((result, index) => {
    if (result.status !== "fulfilled" || !result.value.length) return;
    const category = RSS_SOURCES[index].category;
    if (!categories[category]) categories[category] = [];
    categories[category].push(...result.value);
  });

  // Sort by date (newest first) and limit 5 per category
  for (const cat of Object.keys(categories)) {
    categories[cat] = categories[cat]
      .sort((a, b) => {
        const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);
  }

  return NextResponse.json({
    categories,
    updatedAt: new Date().toISOString(),
  });
}
