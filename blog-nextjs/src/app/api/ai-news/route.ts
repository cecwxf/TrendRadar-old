import { NextResponse } from "next/server";

export const revalidate = 86400; // 1 day cache

const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000; // 最近48小时
const FETCH_TIMEOUT_MS = 4500;

type Category = "大模型" | "Agent" | "AI芯片";
type SourceType = "web" | "x";

interface TopicWatch {
  topic: string;
  category: Category;
  webQueries: string[];
  xQueries: string[];
}

interface RSSSource {
  urls: string[];
  topic: string;
  category: Category;
  sourceType: SourceType;
  provider: string;
}

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  source: string;
}

const WATCH_LIST: TopicWatch[] = [
  // 大模型
  {
    topic: "豆包",
    category: "大模型",
    webQueries: ["豆包 大模型", "Doubao LLM ByteDance"],
    xQueries: ["Doubao OR 豆包 AI"],
  },
  {
    topic: "Claude",
    category: "大模型",
    webQueries: ["Anthropic Claude model update", "Claude 4 benchmark"],
    xQueries: ["Claude AI Anthropic"],
  },
  {
    topic: "ChatGPT",
    category: "大模型",
    webQueries: ["OpenAI ChatGPT update", "OpenAI GPT model release"],
    xQueries: ["ChatGPT OpenAI release"],
  },
  {
    topic: "Qwen",
    category: "大模型",
    webQueries: ["Qwen model release", "通义千问 Qwen"],
    xQueries: ["Qwen 通义千问"],
  },
  {
    topic: "模型生态",
    category: "大模型",
    webQueries: ["open source LLM benchmark", "LLM inference efficiency"],
    xQueries: ["open source LLM benchmark"],
  },

  // Agent
  {
    topic: "OpenClaw",
    category: "Agent",
    webQueries: ["OpenClaw agent", "OpenClaw coding agent"],
    xQueries: ["OpenClaw agent"],
  },
  {
    topic: "Claude Code",
    category: "Agent",
    webQueries: ["Claude Code update", "Anthropic Claude Code"],
    xQueries: ["Claude Code Anthropic"],
  },
  {
    topic: "OpenCode",
    category: "Agent",
    webQueries: ["OpenCode coding assistant", "opencode ai agent"],
    xQueries: ["OpenCode coding assistant"],
  },
  {
    topic: "Codex",
    category: "Agent",
    webQueries: ["OpenAI Codex update", "Codex coding agent"],
    xQueries: ["OpenAI Codex"],
  },
  {
    topic: "Agent生态",
    category: "Agent",
    webQueries: ["AI agent framework update", "multi-agent coding workflow"],
    xQueries: ["AI coding agent workflow"],
  },

  // AI芯片
  {
    topic: "AMD",
    category: "AI芯片",
    webQueries: ["AMD MI300 MI350 AI", "AMD Instinct accelerator"],
    xQueries: ["AMD Instinct MI300 MI350"],
  },
  {
    topic: "NVIDIA",
    category: "AI芯片",
    webQueries: ["NVIDIA Blackwell GB200", "NVIDIA AI chip roadmap"],
    xQueries: ["NVIDIA Blackwell GB200"],
  },
  {
    topic: "Intel",
    category: "AI芯片",
    webQueries: ["Intel Gaudi AI", "Intel AI accelerator"],
    xQueries: ["Intel Gaudi AI accelerator"],
  },
  {
    topic: "高通",
    category: "AI芯片",
    webQueries: ["Qualcomm Snapdragon X Elite NPU", "Qualcomm AI chip"],
    xQueries: ["Qualcomm AI chip Snapdragon NPU"],
  },
  {
    topic: "地平线",
    category: "AI芯片",
    webQueries: ["地平线 征程 芯片", "Horizon Robotics AI chip"],
    xQueries: ["Horizon Robotics chip"],
  },
];

const CATEGORY_ORDER: Category[] = ["大模型", "Agent", "AI芯片"];
const SUPPORTED_LANGS = new Set(["zh", "en", "vi", "de"]);

const SIGNAL_KEYWORDS: Record<Category, Array<{ pattern: RegExp; label: string }>> = {
  "大模型": [
    { pattern: /(release|发布|launch|上线)/i, label: "版本发布" },
    { pattern: /(benchmark|评测|排行|性能)/i, label: "性能评测" },
    { pattern: /(reasoning|推理|long context|长上下文)/i, label: "推理能力" },
    { pattern: /(multimodal|多模态|vision|语音)/i, label: "多模态能力" },
    { pattern: /(api|pricing|价格|商业化)/i, label: "API与商业化" },
  ],
  Agent: [
    { pattern: /(release|发布|launch|上线)/i, label: "产品迭代" },
    { pattern: /(cli|sdk|tooling|插件|工具链)/i, label: "工具链升级" },
    { pattern: /(workflow|automation|编排|流程)/i, label: "工作流自动化" },
    { pattern: /(coding|代码|开发者|repo|github)/i, label: "开发者生态" },
    { pattern: /(integration|集成|enterprise|企业)/i, label: "平台集成" },
  ],
  "AI芯片": [
    { pattern: /(roadmap|路线图|架构|blackwell|mi3|gaudi|snapdragon|征程)/i, label: "芯片路线图" },
    { pattern: /(ship|mass production|量产|供货|交付)/i, label: "量产与交付" },
    { pattern: /(benchmark|性能|throughput|推理|算力)/i, label: "性能与算力" },
    { pattern: /(partnership|合作|ecosystem|生态|兼容)/i, label: "生态合作" },
    { pattern: /(data center|server|pc|edge|robot|车载)/i, label: "应用落地" },
  ],
};

function buildGoogleNewsRSS(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "zh-CN",
    gl: "CN",
    ceid: "CN:zh-Hans",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function buildXSearchRSSCandidates(query: string): string[] {
  const encoded = encodeURIComponent(query);
  return [
    `https://twitrss.me/twitter_search_to_rss/?term=${encoded}`,
    `https://nitter.net/search/rss?f=tweets&q=${encoded}`,
  ];
}

function buildRssSources(): RSSSource[] {
  const webSources = WATCH_LIST.flatMap((watch) =>
    watch.webQueries.map((query) => ({
      urls: [buildGoogleNewsRSS(query)],
      topic: watch.topic,
      category: watch.category,
      sourceType: "web" as const,
      provider: "Web Search",
    }))
  );

  const xSources = WATCH_LIST.flatMap((watch) =>
    watch.xQueries.map((query) => ({
      urls: buildXSearchRSSCandidates(query),
      topic: watch.topic,
      category: watch.category,
      sourceType: "x" as const,
      provider: "X/Twitter",
    }))
  );

  return [...webSources, ...xSources];
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function stripTrailingSource(title: string): string {
  return title
    .replace(/\s*-\s*Google News$/i, "")
    .replace(/\s*\|\s*Twitter$/i, "")
    .trim();
}

function parseRSSItems(xml: string, source: RSSSource): NewsItem[] {
  const items: NewsItem[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  const minTs = Date.now() - NEWS_WINDOW_MS;

  for (const match of matches) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const linkMatch = itemXml.match(
      /<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>|<link[^>]+href="([^"]*)"[^>]*\/>/
    );
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>|<updated>(.*?)<\/updated>/);
    const sourceMatch = itemXml.match(/<source[^>]*><!\[CDATA\[(.*?)\]\]><\/source>|<source[^>]*>(.*?)<\/source>/);

    const rawTitle = cleanText(titleMatch ? (titleMatch[1] || titleMatch[2] || "") : "");
    const title = stripTrailingSource(rawTitle);
    const url = cleanText(linkMatch ? (linkMatch[1] || linkMatch[2] || linkMatch[3] || "") : "");
    const pubDate = cleanText(dateMatch ? (dateMatch[1] || dateMatch[2] || dateMatch[3] || "") : "");
    const itemSource = cleanText(sourceMatch ? (sourceMatch[1] || sourceMatch[2] || "") : "");

    if (!title || !url) continue;

    if (pubDate) {
      const ts = new Date(pubDate).getTime();
      if (Number.isNaN(ts) || ts < minTs) continue;
    }

    items.push({
      title,
      url,
      pubDate,
      source: source.sourceType === "x" ? source.provider : itemSource || source.provider,
    });
  }

  return items;
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

async function fetchRSS(source: RSSSource): Promise<NewsItem[]> {
  for (const url of source.urls) {
    const xml = await fetchSingleFeed(url);
    if (!xml) continue;

    const items = parseRSSItems(xml, source);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function dedupeAndSort(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];

  for (const item of items) {
    const key = item.url || item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });
}

function inferSignals(items: NewsItem[], category: Category): string {
  const rules = SIGNAL_KEYWORDS[category];
  const text = items.map((item) => item.title).join(" ");
  const hits = rules
    .map((rule) => ({
      label: rule.label,
      hit: rule.pattern.test(text),
    }))
    .filter((x) => x.hit)
    .map((x) => x.label)
    .slice(0, 2);

  if (hits.length > 0) {
    return hits.join("、");
  }

  if (category === "AI芯片") return "芯片迭代与应用落地";
  if (category === "Agent") return "工具链迭代与开发者生态";
  return "模型发布与能力迭代";
}

function summarizeChannelMix(items: NewsItem[]): string {
  const hasX = items.some((item) => item.source.includes("X/Twitter"));
  const hasWeb = items.some((item) => !item.source.includes("X/Twitter"));

  if (hasX && hasWeb) return "X/Twitter + Web Search";
  if (hasX) return "X/Twitter";
  return "Web Search";
}

function buildSummaryTitle(topic: string, category: Category, items: NewsItem[]): string {
  if (items.length === 0) {
    return `过去24小时未检索到${topic}的高可信新增报道，建议继续关注官方账号与发布页。`;
  }

  const focus = inferSignals(items, category);
  const channel = summarizeChannelMix(items);

  return `最近24小时：${topic}动态集中在${focus}，当前信号来自${channel}。`;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: targetLang,
      dt: "t",
    });
    params.append("q", text);

    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
      { signal: controller.signal }
    );
    if (!response.ok) return text;

    const data: unknown = await response.json();
    const root = Array.isArray(data) ? data[0] : [];
    if (!Array.isArray(root)) return text;

    const translated = root
      .map((seg) => {
        if (!Array.isArray(seg)) return "";
        return typeof seg[0] === "string" ? seg[0] : "";
      })
      .join("");

    return translated || text;
  } catch {
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const rssSources = buildRssSources();
  const fetched = await Promise.allSettled(
    rssSources.map(async (source) => ({
      source,
      items: await fetchRSS(source),
    }))
  );

  const topicMap = new Map<string, NewsItem[]>();
  for (const watch of WATCH_LIST) {
    topicMap.set(watch.topic, []);
  }

  for (const result of fetched) {
    if (result.status !== "fulfilled") continue;
    const { source, items } = result.value;
    const existing = topicMap.get(source.topic) || [];
    topicMap.set(source.topic, existing.concat(items));
  }

  const categories: Record<string, NewsItem[]> = {
    "大模型": [],
    Agent: [],
    "AI芯片": [],
  };

  for (const category of CATEGORY_ORDER) {
    const topicList = WATCH_LIST.filter((watch) => watch.category === category);

    categories[category] = topicList.map((watch) => {
      const sorted = dedupeAndSort(topicMap.get(watch.topic) || []).slice(0, 5);
      const latest = sorted[0];
      const fallbackUrl = buildGoogleNewsRSS(`${watch.topic} AI`);

      return {
        title: buildSummaryTitle(watch.topic, category, sorted),
        url: latest?.url || fallbackUrl,
        pubDate: latest?.pubDate || new Date().toISOString(),
        source: latest?.source || "Web Search",
      };
    });
  }

  const { searchParams } = new URL(request.url);
  const requestedLang = (searchParams.get("lang") || "zh").toLowerCase();
  const targetLang = SUPPORTED_LANGS.has(requestedLang) ? requestedLang : "zh";

  if (targetLang !== "zh") {
    const translationCache = new Map<string, Promise<string>>();
    const translateWithCache = (title: string): Promise<string> => {
      const cacheKey = `${targetLang}:${title}`;
      if (!translationCache.has(cacheKey)) {
        translationCache.set(cacheKey, translateText(title, targetLang));
      }
      return translationCache.get(cacheKey)!;
    };

    for (const category of Object.keys(categories)) {
      categories[category] = await Promise.all(
        categories[category].map(async (item) => ({
          ...item,
          title: await translateWithCache(item.title),
        }))
      );
    }
  }

  return NextResponse.json(
    {
      categories,
      updatedAt: new Date().toISOString(),
      refreshCycle: "daily",
      sources: ["web", "x"],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    }
  );
}
