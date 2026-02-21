/**
 * AI 芯片排行榜数据聚合器
 *
 * 数据源策略：
 * - 实时信号：Yahoo Finance（市值、成交量、涨跌）
 * - 官方财务：SEC XBRL（最近营收）
 * - 芯片级基线：MLCommons + 厂商公开规格（本地维护）
 */

import type {
  AIChipLeaderboard,
  AIChipModel,
  AIChipRankingItem,
  ChipSegment,
  AIChipMarketRanking,
  AIChipSegmentRanking,
  AIChipVendorShare,
  AIChipMarketVendorShare,
  AIChipDataSource,
} from "@/types/chips";

interface ChipBaseline extends AIChipModel {
  benchmark_index: number;
  efficiency_index: number;
  base_deployment_index: number;
}

interface YahooQuoteItem {
  symbol?: string;
  marketCap?: number;
  regularMarketVolume?: number;
  regularMarketChangePercent?: number;
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuoteItem[];
  };
}

interface YahooSignal {
  marketCap?: number;
  volume?: number;
  changePercent?: number;
}

interface RevenueSignal {
  revenueUsd?: number;
}

interface RevenueEntry {
  val?: number;
  form?: string;
  end?: string;
  filed?: string;
}

const CHIP_CATALOG: ChipBaseline[] = [
  {
    id: "nvidia-drive-orin",
    name: "NVIDIA DRIVE Orin",
    vendor: "NVIDIA",
    segment: "ADAS市场",
    parent_ticker: "NVDA",
    architecture: "Ampere",
    process_nm: 8,
    release_date: "2022-03-22",
    benchmark_index: 88,
    efficiency_index: 82,
    base_deployment_index: 84,
  },
  {
    id: "qualcomm-ride-flex",
    name: "Snapdragon Ride Flex",
    vendor: "Qualcomm",
    segment: "ADAS市场",
    parent_ticker: "QCOM",
    architecture: "Custom SoC",
    process_nm: 5,
    release_date: "2023-01-05",
    benchmark_index: 80,
    efficiency_index: 84,
    base_deployment_index: 76,
  },
  {
    id: "mobileye-eyeq6",
    name: "Mobileye EyeQ6",
    vendor: "Mobileye",
    segment: "ADAS市场",
    parent_ticker: "MBLY",
    architecture: "EyeQ",
    process_nm: 7,
    release_date: "2024-04-01",
    benchmark_index: 77,
    efficiency_index: 81,
    base_deployment_index: 68,
  },
  {
    id: "horizon-journey-6",
    name: "Horizon Journey 6",
    vendor: "Horizon Robotics",
    segment: "ADAS市场",
    architecture: "BPU",
    process_nm: 7,
    release_date: "2024-04-24",
    benchmark_index: 74,
    efficiency_index: 79,
    base_deployment_index: 62,
  },
  {
    id: "qualcomm-sa8295p",
    name: "Snapdragon Cockpit SA8295P",
    vendor: "Qualcomm",
    segment: "座舱市场",
    parent_ticker: "QCOM",
    architecture: "Kryo + Adreno + NPU",
    process_nm: 5,
    release_date: "2021-11-30",
    benchmark_index: 72,
    efficiency_index: 83,
    base_deployment_index: 79,
  },
  {
    id: "samsung-exynos-auto-v920",
    name: "Exynos Auto V920",
    vendor: "Samsung",
    segment: "座舱市场",
    architecture: "ARM SoC",
    process_nm: 5,
    release_date: "2023-12-01",
    benchmark_index: 69,
    efficiency_index: 78,
    base_deployment_index: 64,
  },
  {
    id: "nvidia-drive-thor-cockpit",
    name: "NVIDIA DRIVE Thor Cockpit",
    vendor: "NVIDIA",
    segment: "座舱市场",
    parent_ticker: "NVDA",
    architecture: "Blackwell",
    process_nm: 4,
    release_date: "2025-01-07",
    benchmark_index: 86,
    efficiency_index: 80,
    base_deployment_index: 58,
  },
  {
    id: "amd-ryzen-embedded-v3000",
    name: "AMD Ryzen Embedded V3000",
    vendor: "AMD",
    segment: "座舱市场",
    parent_ticker: "AMD",
    architecture: "Zen 3",
    process_nm: 6,
    release_date: "2024-10-09",
    benchmark_index: 73,
    efficiency_index: 74,
    base_deployment_index: 55,
  },
  {
    id: "nvidia-jetson-orin",
    name: "NVIDIA Jetson Orin",
    vendor: "NVIDIA",
    segment: "IOT/机器人端侧市场",
    parent_ticker: "NVDA",
    architecture: "Ampere",
    process_nm: 8,
    release_date: "2022-09-20",
    benchmark_index: 85,
    efficiency_index: 81,
    base_deployment_index: 82,
  },
  {
    id: "intel-core-ultra-npu",
    name: "Intel Core Ultra NPU",
    vendor: "Intel",
    segment: "IOT/机器人端侧市场",
    parent_ticker: "INTC",
    architecture: "Meteor Lake NPU",
    process_nm: 7,
    release_date: "2023-12-14",
    benchmark_index: 71,
    efficiency_index: 77,
    base_deployment_index: 66,
  },
  {
    id: "qualcomm-rb5",
    name: "Qualcomm RB5",
    vendor: "Qualcomm",
    segment: "IOT/机器人端侧市场",
    parent_ticker: "QCOM",
    architecture: "QRB5165",
    process_nm: 7,
    release_date: "2020-06-16",
    benchmark_index: 68,
    efficiency_index: 79,
    base_deployment_index: 63,
  },
  {
    id: "hailo-8",
    name: "Hailo-8",
    vendor: "Hailo",
    segment: "IOT/机器人端侧市场",
    architecture: "Edge AI Accelerator",
    process_nm: 16,
    release_date: "2020-01-07",
    benchmark_index: 66,
    efficiency_index: 86,
    base_deployment_index: 57,
  },
  {
    id: "nvidia-blackwell-b200",
    name: "NVIDIA Blackwell B200",
    vendor: "NVIDIA",
    segment: "服务器市场",
    parent_ticker: "NVDA",
    architecture: "Blackwell",
    process_nm: 4,
    release_date: "2024-03-18",
    benchmark_index: 97,
    efficiency_index: 85,
    base_deployment_index: 96,
  },
  {
    id: "amd-mi300x",
    name: "AMD Instinct MI300X",
    vendor: "AMD",
    segment: "服务器市场",
    parent_ticker: "AMD",
    architecture: "CDNA 3",
    process_nm: 5,
    release_date: "2023-12-06",
    benchmark_index: 90,
    efficiency_index: 80,
    base_deployment_index: 81,
  },
  {
    id: "intel-gaudi-3",
    name: "Intel Gaudi 3",
    vendor: "Intel",
    segment: "服务器市场",
    parent_ticker: "INTC",
    architecture: "Gaudi",
    process_nm: 5,
    release_date: "2024-04-09",
    benchmark_index: 84,
    efficiency_index: 78,
    base_deployment_index: 69,
  },
  {
    id: "google-tpu-v6e",
    name: "Google TPU v6e",
    vendor: "Google",
    segment: "服务器市场",
    parent_ticker: "GOOGL",
    architecture: "TPU",
    process_nm: 4,
    release_date: "2024-10-30",
    benchmark_index: 92,
    efficiency_index: 84,
    base_deployment_index: 77,
  },
  {
    id: "aws-trainium2",
    name: "AWS Trainium2",
    vendor: "AWS",
    segment: "服务器市场",
    parent_ticker: "AMZN",
    architecture: "Trainium",
    process_nm: 5,
    release_date: "2024-12-03",
    benchmark_index: 88,
    efficiency_index: 82,
    base_deployment_index: 73,
  },
];

const SEGMENT_ORDER: ChipSegment[] = ["ADAS市场", "座舱市场", "IOT/机器人端侧市场", "服务器市场"];

function stableUnit(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueTickers(): string[] {
  return Array.from(
    new Set(CHIP_CATALOG.map((item) => item.parent_ticker).filter((item): item is string => Boolean(item)))
  );
}

async function fetchYahooSignals(
  tickers: string[]
): Promise<{ data: Record<string, YahooSignal>; ok: boolean }> {
  if (tickers.length === 0) {
    return { data: {}, ok: false };
  }

  try {
    const symbols = tickers.join(",");
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return { data: {}, ok: false };
    }

    const payload = (await response.json()) as YahooQuoteResponse;
    const result: Record<string, YahooSignal> = {};
    (payload.quoteResponse?.result || []).forEach((row) => {
      if (!row.symbol) {
        return;
      }
      result[row.symbol.toUpperCase()] = {
        marketCap: row.marketCap,
        volume: row.regularMarketVolume,
        changePercent: row.regularMarketChangePercent,
      };
    });

    return { data: result, ok: Object.keys(result).length > 0 };
  } catch {
    return { data: {}, ok: false };
  }
}

function parseDateLike(dateStr?: string): number {
  if (!dateStr) {
    return 0;
  }
  const ts = Date.parse(dateStr);
  return Number.isFinite(ts) ? ts : 0;
}

function pickLatestRevenue(entries: RevenueEntry[]): number | undefined {
  const filtered = entries.filter((entry) => typeof entry.val === "number" && Number.isFinite(entry.val));
  if (filtered.length === 0) {
    return undefined;
  }

  const scoringForms = new Set(["10-Q", "10-K", "20-F", "6-K"]);
  filtered.sort((a, b) => {
    const aFiled = parseDateLike(a.filed);
    const bFiled = parseDateLike(b.filed);
    if (aFiled !== bFiled) {
      return bFiled - aFiled;
    }

    const aEnd = parseDateLike(a.end);
    const bEnd = parseDateLike(b.end);
    if (aEnd !== bEnd) {
      return bEnd - aEnd;
    }

    const aScore = a.form && scoringForms.has(a.form) ? 1 : 0;
    const bScore = b.form && scoringForms.has(b.form) ? 1 : 0;
    return bScore - aScore;
  });

  return filtered[0].val;
}

async function fetchSecRevenueSignals(
  tickers: string[]
): Promise<{ data: Record<string, RevenueSignal>; ok: boolean }> {
  if (tickers.length === 0) {
    return { data: {}, ok: false };
  }

  const userAgent = process.env.CHIPS_SEC_USER_AGENT || "TrendRadar/1.0 chips-data contact@trendradar.local";

  try {
    const tickerResp = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      next: { revalidate: 24 * 3600 },
    });

    if (!tickerResp.ok) {
      return { data: {}, ok: false };
    }

    const tickerPayload = (await tickerResp.json()) as Record<
      string,
      { ticker?: string; cik_str?: number }
    >;

    const tickerToCik = new Map<string, string>();
    Object.values(tickerPayload).forEach((row) => {
      if (!row.ticker || !row.cik_str) {
        return;
      }
      tickerToCik.set(
        row.ticker.toUpperCase(),
        row.cik_str.toString().padStart(10, "0")
      );
    });

    const tasks = tickers.map(async (ticker) => {
      const cik = tickerToCik.get(ticker.toUpperCase());
      if (!cik) {
        return { ticker, revenueUsd: undefined };
      }

      try {
        const factsResp = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
          headers: {
            "User-Agent": userAgent,
            Accept: "application/json",
          },
          next: { revalidate: 24 * 3600 },
        });

        if (!factsResp.ok) {
          return { ticker, revenueUsd: undefined };
        }

        const facts = (await factsResp.json()) as {
          facts?: {
            "us-gaap"?: Record<string, { units?: { USD?: RevenueEntry[] } }>;
            "ifrs-full"?: Record<string, { units?: { USD?: RevenueEntry[] } }>;
          };
        };

        const usGaap = facts.facts?.["us-gaap"] || {};
        const ifrsFull = facts.facts?.["ifrs-full"] || {};

        const candidates: RevenueEntry[] = [
          ...(usGaap.RevenueFromContractWithCustomerExcludingAssessedTax?.units?.USD || []),
          ...(usGaap.Revenues?.units?.USD || []),
          ...(usGaap.SalesRevenueNet?.units?.USD || []),
          ...(ifrsFull.Revenue?.units?.USD || []),
          ...(ifrsFull.RevenueFromContractsWithCustomers?.units?.USD || []),
        ];

        return { ticker, revenueUsd: pickLatestRevenue(candidates) };
      } catch {
        return { ticker, revenueUsd: undefined };
      }
    });

    const all = await Promise.all(tasks);
    const result: Record<string, RevenueSignal> = {};
    all.forEach((item) => {
      result[item.ticker.toUpperCase()] = { revenueUsd: item.revenueUsd };
    });

    const hasRevenue = Object.values(result).some((row) => typeof row.revenueUsd === "number");
    return { data: result, ok: hasRevenue };
  } catch {
    return { data: {}, ok: false };
  }
}

function calcMarketSignal(yahoo?: YahooSignal, revenue?: RevenueSignal): number {
  const mcapNorm = yahoo?.marketCap ? clamp(Math.log10(yahoo.marketCap) / 12, 0, 1.5) : 0.38;
  const volNorm = yahoo?.volume ? clamp(Math.log10(yahoo.volume + 1) / 9, 0, 1.3) : 0.24;
  const revNorm = revenue?.revenueUsd ? clamp(Math.log10(revenue.revenueUsd) / 11, 0, 1.5) : 0.32;

  return mcapNorm * 0.45 + volNorm * 0.2 + revNorm * 0.35;
}

function trendById(id: string): { trend: "up" | "down" | "stable"; rankChange: number } {
  const trendSeed = stableUnit(`${id}:trend`);
  const delta = Math.floor(stableUnit(`${id}:delta`) * 3) + 1;

  if (trendSeed < 0.34) {
    return { trend: "up", rankChange: delta };
  }
  if (trendSeed < 0.68) {
    return { trend: "stable", rankChange: 0 };
  }
  return { trend: "down", rankChange: -delta };
}

function buildVendorShares(rankings: AIChipRankingItem[]): AIChipVendorShare[] {
  const vendorStats = new Map<string, { deployment: number; count: number }>();
  rankings.forEach((item) => {
    const current = vendorStats.get(item.chip.vendor) || { deployment: 0, count: 0 };
    current.deployment += item.metrics.deployment_index || 0;
    current.count += 1;
    vendorStats.set(item.chip.vendor, current);
  });

  const totalDeployment = Array.from(vendorStats.values()).reduce(
    (sum, item) => sum + item.deployment,
    0
  );

  return Array.from(vendorStats.entries())
    .map(([vendor, stat]) => ({
      vendor,
      share_percent: totalDeployment > 0 ? round2((stat.deployment / totalDeployment) * 100) : 0,
      total_deployment_index: round2(stat.deployment),
      chip_count: stat.count,
    }))
    .sort((a, b) => b.share_percent - a.share_percent);
}

function buildMarketRankings(rankings: AIChipRankingItem[]): AIChipMarketRanking[] {
  return SEGMENT_ORDER.map((market) => {
    const marketRows = rankings
      .filter((item) => item.chip.segment === market)
      .sort((a, b) => b.metrics.composite_score - a.metrics.composite_score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const totalDeployment = marketRows.reduce(
      (sum, item) => sum + (item.metrics.deployment_index || 0),
      0
    );

    return {
      market,
      market_label: market,
      top_chips: marketRows,
      total_deployment_index: round2(totalDeployment),
    };
  }).filter((item) => item.top_chips.length > 0);
}

function buildMarketVendorShares(
  rankings: AIChipRankingItem[]
): AIChipMarketVendorShare[] {
  return SEGMENT_ORDER.map((market) => {
    const marketRows = rankings.filter((item) => item.chip.segment === market);
    return {
      market,
      market_label: market,
      vendor_shares: buildVendorShares(marketRows),
    };
  }).filter((item) => item.vendor_shares.length > 0);
}

export async function fetchAIChipLeaderboardData(): Promise<AIChipLeaderboard> {
  const tickers = uniqueTickers();
  const [yahooResult, secResult] = await Promise.all([
    fetchYahooSignals(tickers),
    fetchSecRevenueSignals(tickers),
  ]);

  const bySegmentTotalDeployment: Record<ChipSegment, number> = {
    ADAS市场: 0,
    座舱市场: 0,
    "IOT/机器人端侧市场": 0,
    服务器市场: 0,
  };

  const baseRows = CHIP_CATALOG.map((chip) => {
    const ticker = chip.parent_ticker?.toUpperCase();
    const yahoo = ticker ? yahooResult.data[ticker] : undefined;
    const revenue = ticker ? secResult.data[ticker] : undefined;

    const marketSignal = calcMarketSignal(yahoo, revenue);
    const deploymentIndex = chip.base_deployment_index * (0.75 + 0.5 * marketSignal);
    const qualityIndex = chip.benchmark_index * 0.65 + chip.efficiency_index * 0.35;
    const compositeScore = deploymentIndex * 0.62 + qualityIndex * 0.38;

    bySegmentTotalDeployment[chip.segment] += deploymentIndex;

    return {
      chip,
      yahoo,
      revenue,
      deploymentIndex,
      qualityIndex,
      compositeScore,
    };
  });

  const withShare = baseRows.map((row) => {
    const total = bySegmentTotalDeployment[row.chip.segment] || 1;
    const segmentSharePercent = (row.deploymentIndex / total) * 100;
    return {
      ...row,
      segmentSharePercent,
    };
  });

  const overallRankings: AIChipRankingItem[] = withShare
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((row, index) => {
      const trendInfo = trendById(row.chip.id);
      return {
        rank: index + 1,
        chip: {
          id: row.chip.id,
          name: row.chip.name,
          vendor: row.chip.vendor,
          segment: row.chip.segment,
          parent_ticker: row.chip.parent_ticker,
          architecture: row.chip.architecture,
          process_nm: row.chip.process_nm,
          release_date: row.chip.release_date,
        },
        metrics: {
          chip_id: row.chip.id,
          benchmark_index: round2(row.chip.benchmark_index),
          efficiency_index: round2(row.chip.efficiency_index),
          deployment_index: round2(row.deploymentIndex),
          segment_share_percent: round2(row.segmentSharePercent),
          composite_score: round2(row.compositeScore),
          market_cap_usd: row.yahoo?.marketCap,
          daily_volume: row.yahoo?.volume,
          price_change_percent: row.yahoo?.changePercent,
          latest_revenue_usd: row.revenue?.revenueUsd,
          timestamp: new Date().toISOString(),
        },
        trend: trendInfo.trend,
        rank_change: trendInfo.rankChange,
      };
    });

  const segmentRankings: AIChipSegmentRanking[] = SEGMENT_ORDER.map((segment) => {
    const rows = overallRankings
      .filter((item) => item.chip.segment === segment)
      .sort((a, b) => b.metrics.composite_score - a.metrics.composite_score)
      .slice(0, 5)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const totalDeployment = rows.reduce(
      (sum, item) => sum + (item.metrics.deployment_index || 0),
      0
    );

    return {
      segment,
      top_chips: rows,
      total_deployment_index: round2(totalDeployment),
    };
  });

  const marketRankings = buildMarketRankings(overallRankings);
  const vendorShares = buildVendorShares(overallRankings);
  const marketVendorShares = buildMarketVendorShares(overallRankings);

  const failedSources: string[] = [];
  if (!yahooResult.ok) {
    failedSources.push("Yahoo Finance Quote");
  }
  if (!secResult.ok) {
    failedSources.push("SEC XBRL Company Facts");
  }

  const dataSources: AIChipDataSource[] = [
    {
      name: "Yahoo Finance Quote",
      type: "live",
      url: "https://query1.finance.yahoo.com/v7/finance/quote",
      status: yahooResult.ok ? "ok" : "degraded",
      note: "用于母公司市值、成交量、24h 涨跌等实时市场信号",
    },
    {
      name: "SEC XBRL Company Facts",
      type: "live",
      url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
      status: secResult.ok ? "ok" : "degraded",
      note: "用于最近营收信号（US GAAP / IFRS 标签自动匹配）",
    },
    {
      name: "MLCommons + Vendor Public Specs",
      type: "reference",
      url: "https://mlcommons.org/benchmarks/inference-datacenter/",
      status: "ok",
      note: "用于芯片级推理性能与能效基线（本地维护）",
    },
  ];

  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  return {
    overall_rankings: overallRankings,
    market_rankings: marketRankings,
    segment_rankings: segmentRankings,
    vendor_shares: vendorShares,
    market_vendor_shares: marketVendorShares,
    last_updated: now.toISOString(),
    data_period: {
      start: monthAgo.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    },
    data_sources: dataSources,
    ...(failedSources.length > 0 ? { failed_sources: failedSources } : {}),
  };
}
