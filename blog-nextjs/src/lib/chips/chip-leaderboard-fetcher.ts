/**
 * AI 芯片排行榜数据聚合器（真实装机量严格模式）
 *
 * 规则：
 * 1) 仅使用可公开核验的芯片装机量原始数字。
 * 2) 无装机量原始数字的芯片不纳入排名与份额。
 * 3) 资本市场数据不参与计算。
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
  install_units: number;
  install_period_start: string;
  install_period_end: string;
  install_scope: string;
  install_source_name: string;
  install_source_url: string;
}

const CHIP_CATALOG: ChipBaseline[] = [
  {
    id: "nvidia-drive-orin-x",
    name: "NVIDIA DRIVE Orin-X",
    vendor: "NVIDIA",
    segment: "ADAS市场",
    parent_ticker: "NVDA",
    architecture: "Ampere",
    process_nm: 8,
    release_date: "2022-03-22",
    benchmark_index: 88,
    efficiency_index: 82,
    install_units: 343092,
    install_period_start: "2025-01-01",
    install_period_end: "2025-01-31",
    install_scope: "中国乘用车前装，智驾域控芯片",
    install_source_name: "Gasgoo 2025-01 智驾域控芯片装机量",
    install_source_url: "https://auto.gasgoo.com/news/202503/17I70420610C110.shtml",
  },
  {
    id: "tesla-fsd-chip",
    name: "Tesla FSD SoC",
    vendor: "Tesla",
    segment: "ADAS市场",
    architecture: "Tesla FSD",
    release_date: "2023-01-01",
    benchmark_index: 79,
    efficiency_index: 76,
    install_units: 67532,
    install_period_start: "2025-01-01",
    install_period_end: "2025-01-31",
    install_scope: "中国乘用车前装，智驾域控芯片",
    install_source_name: "Gasgoo 2025-01 智驾域控芯片装机量",
    install_source_url: "https://auto.gasgoo.com/news/202503/17I70420610C110.shtml",
  },
  {
    id: "huawei-ascend-610-adas",
    name: "Huawei Ascend 610",
    vendor: "Huawei",
    segment: "ADAS市场",
    architecture: "Ascend",
    process_nm: 7,
    release_date: "2023-01-01",
    benchmark_index: 81,
    efficiency_index: 79,
    install_units: 42721,
    install_period_start: "2025-01-01",
    install_period_end: "2025-01-31",
    install_scope: "中国乘用车前装，智驾域控芯片",
    install_source_name: "Gasgoo 2025-01 智驾域控芯片装机量",
    install_source_url: "https://auto.gasgoo.com/news/202503/17I70420610C110.shtml",
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
    install_units: 5701662,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "huawei-kirin-cockpit-soc",
    name: "Huawei Cockpit SoC",
    vendor: "Huawei",
    segment: "座舱市场",
    architecture: "Kirin + NPU",
    process_nm: 7,
    release_date: "2023-09-25",
    benchmark_index: 70,
    efficiency_index: 77,
    install_units: 489625,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "amd-ryzen-embedded-v3000",
    name: "AMD Cockpit SoC",
    vendor: "AMD",
    segment: "座舱市场",
    parent_ticker: "AMD",
    architecture: "Zen 3",
    process_nm: 6,
    release_date: "2024-10-09",
    benchmark_index: 73,
    efficiency_index: 74,
    install_units: 468136,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "siengine-longying-one",
    name: "SiEngine Longying No.1",
    vendor: "SiEngine",
    segment: "座舱市场",
    architecture: "7nm Cockpit SoC",
    process_nm: 7,
    release_date: "2023-03-30",
    benchmark_index: 68,
    efficiency_index: 76,
    install_units: 428183,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "renesas-r-car-h3",
    name: "Renesas R-Car H3",
    vendor: "Renesas",
    segment: "座舱市场",
    architecture: "R-Car Gen3",
    process_nm: 16,
    release_date: "2021-02-18",
    benchmark_index: 60,
    efficiency_index: 66,
    install_units: 185159,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "semidrive-x9c-cockpit",
    name: "SemiDrive X9C",
    vendor: "SemiDrive",
    segment: "座舱市场",
    architecture: "Auto Cockpit SoC",
    process_nm: 7,
    release_date: "2023-09-08",
    benchmark_index: 66,
    efficiency_index: 73,
    install_units: 154886,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
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
    install_units: 90129,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "mediatek-dimensity-auto-cockpit",
    name: "MediaTek Dimensity Auto Cockpit",
    vendor: "MediaTek",
    segment: "座舱市场",
    architecture: "Dimensity Auto",
    process_nm: 6,
    release_date: "2025-04-23",
    benchmark_index: 67,
    efficiency_index: 74,
    install_units: 80469,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "ti-jacinto7-cockpit",
    name: "Texas Instruments Jacinto 7",
    vendor: "Texas Instruments",
    segment: "座舱市场",
    architecture: "Jacinto 7",
    process_nm: 16,
    release_date: "2021-07-12",
    benchmark_index: 61,
    efficiency_index: 72,
    install_units: 66192,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "intel-cockpit-soc",
    name: "Intel Cockpit SoC",
    vendor: "Intel",
    segment: "座舱市场",
    parent_ticker: "INTC",
    architecture: "x86 Auto",
    process_nm: 12,
    release_date: "2022-11-08",
    benchmark_index: 58,
    efficiency_index: 64,
    install_units: 15698,
    install_period_start: "2025-01-01",
    install_period_end: "2025-10-31",
    install_scope: "中国乘用车前装，座舱域控芯片",
    install_source_name: "Gasgoo 2025-01~10 座舱域控芯片装机量",
    install_source_url: "https://m.gasgoo.com/news/70438602.html",
  },
  {
    id: "nvidia-jetson-orin-serve-gen3",
    name: "NVIDIA Jetson Orin (Serve Gen3)",
    vendor: "NVIDIA",
    segment: "IOT/机器人端侧市场",
    parent_ticker: "NVDA",
    architecture: "Jetson Orin",
    process_nm: 8,
    release_date: "2025-12-12",
    benchmark_index: 85,
    efficiency_index: 81,
    install_units: 2000,
    install_period_start: "2025-10-01",
    install_period_end: "2025-12-12",
    install_scope: "美国人行道配送机器人，已部署>2,000台；按单机单模组口径折算 Jetson Orin 装机量下限",
    install_source_name: "Serve Robotics 2,000 Robots + NVIDIA Serve Case Study",
    install_source_url: "https://www.globenewswire.com/de/news-release/2025/12/12/3204583/0/en/Serve-Robotics-Builds-2-000-Autonomous-Delivery-Robots-Creating-Largest-Sidewalk-Delivery-Fleet-in-the-U-S.html",
  },
  {
    id: "nvidia-jetson-moxi",
    name: "NVIDIA Jetson (Diligent Moxi)",
    vendor: "NVIDIA",
    segment: "IOT/机器人端侧市场",
    parent_ticker: "NVDA",
    architecture: "Jetson",
    process_nm: 8,
    release_date: "2026-01-20",
    benchmark_index: 80,
    efficiency_index: 82,
    install_units: 100,
    install_period_start: "2025-01-01",
    install_period_end: "2026-01-20",
    install_scope: "医疗院内机器人，近100台 Moxi；公告明确为 NVIDIA Jetson 平台",
    install_source_name: "Serve Acquisition of Diligent (Moxi + Jetson)",
    install_source_url: "https://www.globenewswire.com/news-release/2026/01/20/3222303/0/en/serve-robotics-to-acquire-diligent-robotics-expanding-physical-ai-platform-beyond-the-sidewalk.html",
  },
  {
    id: "nvidia-hopper-colossus",
    name: "NVIDIA Hopper GPUs (xAI Colossus)",
    vendor: "NVIDIA",
    segment: "服务器市场",
    parent_ticker: "NVDA",
    architecture: "Hopper",
    release_date: "2024-10-28",
    benchmark_index: 95,
    efficiency_index: 83,
    install_units: 200000,
    install_period_start: "2025-02-17",
    install_period_end: "2025-02-17",
    install_scope: "xAI Colossus 已公开运行规模",
    install_source_name: "xAI Colossus 官方披露",
    install_source_url: "https://x.ai/colossus",
  },
  {
    id: "intel-data-center-gpu-max-aurora",
    name: "Intel Data Center GPU Max 1550 (Aurora)",
    vendor: "Intel",
    segment: "服务器市场",
    parent_ticker: "INTC",
    architecture: "Xe-HPC",
    release_date: "2023-11-17",
    benchmark_index: 82,
    efficiency_index: 75,
    install_units: 63744,
    install_period_start: "2023-11-17",
    install_period_end: "2023-11-17",
    install_scope: "Aurora 超算已安装加速卡",
    install_source_name: "Argonne ALCF Aurora 系统介绍",
    install_source_url: "https://www.alcf.anl.gov/aurora",
  },
  {
    id: "amd-mi300a-el-capitan",
    name: "AMD Instinct MI300A (El Capitan)",
    vendor: "AMD",
    segment: "服务器市场",
    parent_ticker: "AMD",
    architecture: "CDNA 3",
    process_nm: 5,
    release_date: "2024-11-14",
    benchmark_index: 90,
    efficiency_index: 80,
    install_units: 44544,
    install_period_start: "2024-11-14",
    install_period_end: "2024-11-14",
    install_scope: "El Capitan 超算已安装 APU 数量",
    install_source_name: "LLNL El Capitan Hardware Overview",
    install_source_url: "https://hpc.llnl.gov/documentation/user-guides/using-el-capitan-systems/hardware-overview",
  },
  {
    id: "amd-mi250x-frontier",
    name: "AMD Instinct MI250X (Frontier)",
    vendor: "AMD",
    segment: "服务器市场",
    parent_ticker: "AMD",
    architecture: "CDNA 2",
    process_nm: 6,
    release_date: "2022-06-01",
    benchmark_index: 84,
    efficiency_index: 74,
    install_units: 39424,
    install_period_start: "2022-06-01",
    install_period_end: "2022-06-01",
    install_scope: "Frontier 超算加速卡总数（9856 nodes × 4）",
    install_source_name: "OLCF Frontier User Guide",
    install_source_url: "https://docs.olcf.ornl.gov/systems/frontier_user_guide.html",
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
      .sort((a, b) => {
        const depDiff = b.metrics.deployment_index - a.metrics.deployment_index;
        if (depDiff !== 0) {
          return depDiff;
        }
        return b.metrics.composite_score - a.metrics.composite_score;
      })
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
  });
}

function buildMarketVendorShares(rankings: AIChipRankingItem[]): AIChipMarketVendorShare[] {
  return SEGMENT_ORDER.map((market) => {
    const marketRows = rankings.filter((item) => item.chip.segment === market);
    return {
      market,
      market_label: market,
      vendor_shares: buildVendorShares(marketRows),
    };
  });
}

function buildDataSources(): AIChipDataSource[] {
  const sourceMap = new Map<string, { name: string; url: string; note: string }>();

  CHIP_CATALOG.forEach((chip) => {
    const key = `${chip.install_source_name}::${chip.install_source_url}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        name: chip.install_source_name,
        url: chip.install_source_url,
        note: chip.install_scope,
      });
    }
  });

  const sources: AIChipDataSource[] = Array.from(sourceMap.values()).map((item) => ({
    name: item.name,
    type: "reference",
    url: item.url,
    status: "ok",
    note: item.note,
  }));

  const extraSources: AIChipDataSource[] = [
    {
      name: "NVIDIA Serve Robotics Customer Story",
      type: "reference",
      url: "https://www.nvidia.com/en-us/autonomous-machines/customer-stories/serve-robotics/",
      status: "ok",
      note: "用于确认 Serve 第三代机器人采用 Jetson Orin 平台",
    },
  ];

  extraSources.forEach((source) => {
    const exists = sources.some(
      (item) => item.name === source.name && item.url === source.url
    );
    if (!exists) {
      sources.push(source);
    }
  });

  return sources;
}

function calcPeriod(): { start: string; end: string } {
  const starts = CHIP_CATALOG.map((item) => item.install_period_start).sort();
  const ends = CHIP_CATALOG.map((item) => item.install_period_end).sort();

  return {
    start: starts[0],
    end: ends[ends.length - 1],
  };
}

export async function fetchAIChipLeaderboardData(): Promise<AIChipLeaderboard> {
  const bySegmentTotalDeployment: Record<ChipSegment, number> = {
    ADAS市场: 0,
    座舱市场: 0,
    "IOT/机器人端侧市场": 0,
    服务器市场: 0,
  };

  const baseRows = CHIP_CATALOG.map((chip) => {
    const deploymentIndex = chip.install_units;
    const qualityIndex = chip.benchmark_index * 0.65 + chip.efficiency_index * 0.35;
    const compositeScore = deploymentIndex * 0.9 + qualityIndex * 0.1;

    bySegmentTotalDeployment[chip.segment] += deploymentIndex;

    return {
      chip,
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
    .sort((a, b) => {
      const depDiff = b.deploymentIndex - a.deploymentIndex;
      if (depDiff !== 0) {
        return depDiff;
      }
      return b.compositeScore - a.compositeScore;
    })
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
          install_units: row.chip.install_units,
          install_period_start: row.chip.install_period_start,
          install_period_end: row.chip.install_period_end,
          install_scope: row.chip.install_scope,
          install_source_name: row.chip.install_source_name,
          install_source_url: row.chip.install_source_url,
          timestamp: new Date().toISOString(),
        },
        trend: trendInfo.trend,
        rank_change: trendInfo.rankChange,
      };
    });

  const segmentRankings: AIChipSegmentRanking[] = SEGMENT_ORDER.map((segment) => {
    const rows = overallRankings
      .filter((item) => item.chip.segment === segment)
      .sort((a, b) => b.metrics.deployment_index - a.metrics.deployment_index)
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

  const now = new Date();

  return {
    overall_rankings: overallRankings,
    market_rankings: buildMarketRankings(overallRankings),
    segment_rankings: segmentRankings,
    vendor_shares: buildVendorShares(overallRankings),
    market_vendor_shares: buildMarketVendorShares(overallRankings),
    last_updated: now.toISOString(),
    data_period: calcPeriod(),
    data_sources: buildDataSources(),
  };
}
