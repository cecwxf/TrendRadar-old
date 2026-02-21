/**
 * 区块链宏观指标抓取
 *
 * 数据源：
 * - CoinGecko global
 * - CoinGecko bitcoin market_chart
 * - Alternative.me Fear & Greed
 * - mempool.space 区块高度
 */

import type { BlockchainMacroMetrics } from "@/types/market";

interface CoinGeckoGlobalResponse {
  data?: {
    total_market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    market_cap_percentage?: { btc?: number; eth?: number };
    active_cryptocurrencies?: number;
    markets?: number;
  };
}

interface FearGreedResponse {
  data?: Array<{
    value?: string;
    value_classification?: string;
    timestamp?: string;
  }>;
}

interface CoinGeckoMarketChartResponse {
  prices?: [number, number][];
}

interface CoinGeckoSimplePriceResponse {
  bitcoin?: {
    usd?: number;
  };
}

function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function calcAverage(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

async function fetchBtcClosesFromCoinGecko(): Promise<number[]> {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=250&interval=daily",
      {
        next: { revalidate: 300 },
        headers: { Accept: "application/json" },
      }
    );

    if (!resp.ok) {
      return [];
    }

    const btcChart = (await resp.json()) as CoinGeckoMarketChartResponse;
    return (btcChart.prices || [])
      .map((entry) => safeNumber(entry[1]))
      .filter((item): item is number => typeof item === "number");
  } catch {
    return [];
  }
}

async function fetchBtcClosesFromBinance(): Promise<number[]> {
  try {
    const resp = await fetch(
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=220",
      {
        next: { revalidate: 300 },
        headers: { Accept: "application/json" },
      }
    );

    if (!resp.ok) {
      return [];
    }

    const rows = (await resp.json()) as unknown[];
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => (Array.isArray(row) ? safeNumber(row[4]) : undefined))
      .filter((item): item is number => typeof item === "number");
  } catch {
    return [];
  }
}

async function fetchBtcSpotFromCoinGecko(): Promise<number | undefined> {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      {
        next: { revalidate: 300 },
        headers: { Accept: "application/json" },
      }
    );
    if (!resp.ok) {
      return undefined;
    }
    const payload = (await resp.json()) as CoinGeckoSimplePriceResponse;
    return safeNumber(payload.bitcoin?.usd);
  } catch {
    return undefined;
  }
}

async function fetchBtcSpotFromBinance(): Promise<number | undefined> {
  try {
    const resp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      return undefined;
    }
    const payload = (await resp.json()) as { price?: string | number };
    return safeNumber(payload.price);
  } catch {
    return undefined;
  }
}

export async function fetchBlockchainMacroMetrics(): Promise<BlockchainMacroMetrics> {
  const metrics: BlockchainMacroMetrics = {};

  const [globalResp, fearGreedResp, tipHeightResp] = await Promise.all([
    fetch("https://api.coingecko.com/api/v3/global", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    }).catch(() => null),
    fetch("https://api.alternative.me/fng/?limit=1&format=json", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    }).catch(() => null),
    fetch("https://mempool.space/api/blocks/tip/height", {
      next: { revalidate: 300 },
      headers: { Accept: "text/plain" },
    }).catch(() => null),
  ]);

  if (globalResp?.ok) {
    const globalData = (await globalResp.json()) as CoinGeckoGlobalResponse;
    metrics.total_market_cap_usd = safeNumber(globalData.data?.total_market_cap?.usd);
    metrics.total_volume_usd = safeNumber(globalData.data?.total_volume?.usd);
    metrics.btc_dominance_percent = safeNumber(globalData.data?.market_cap_percentage?.btc);
    metrics.eth_dominance_percent = safeNumber(globalData.data?.market_cap_percentage?.eth);
    metrics.active_cryptocurrencies = safeNumber(globalData.data?.active_cryptocurrencies);
    metrics.markets = safeNumber(globalData.data?.markets);
  }

  if (fearGreedResp?.ok) {
    const fearGreedData = (await fearGreedResp.json()) as FearGreedResponse;
    const row = fearGreedData.data?.[0];
    metrics.fear_greed_value = safeNumber(row?.value);
    metrics.fear_greed_classification = row?.value_classification;
    if (row?.timestamp) {
      const ts = Number(row.timestamp);
      metrics.fear_greed_updated_at = Number.isFinite(ts)
        ? new Date(ts * 1000).toISOString()
        : undefined;
    }
  }

  // BTC 价格与 MA200 使用多源回退，避免单一接口限流导致 N/A。
  let prices = await fetchBtcClosesFromCoinGecko();
  if (prices.length < 180) {
    prices = await fetchBtcClosesFromBinance();
  }

  if (prices.length > 0) {
    metrics.btc_price_usd = prices[prices.length - 1];
    metrics.btc_ma200d_usd = calcAverage(prices.slice(-200));
  }

  if (metrics.btc_price_usd === undefined) {
    metrics.btc_price_usd = await fetchBtcSpotFromCoinGecko();
  }
  if (metrics.btc_price_usd === undefined) {
    metrics.btc_price_usd = await fetchBtcSpotFromBinance();
  }

  if (
    typeof metrics.btc_price_usd === "number" &&
    typeof metrics.btc_ma200d_usd === "number" &&
    metrics.btc_ma200d_usd > 0
  ) {
    metrics.btc_price_to_ma200d = metrics.btc_price_usd / metrics.btc_ma200d_usd;
  }

  if (tipHeightResp?.ok) {
    const tipText = await tipHeightResp.text();
    const tipHeight = safeNumber(tipText);
    if (typeof tipHeight === "number") {
      const HALVING_INTERVAL = 210_000;
      const nextHalvingHeight = Math.ceil((tipHeight + 1) / HALVING_INTERVAL) * HALVING_INTERVAL;
      const blocksRemaining = Math.max(0, nextHalvingHeight - tipHeight);
      const estimatedDays = (blocksRemaining * 10) / 60 / 24;
      const estimatedDate = new Date(Date.now() + blocksRemaining * 10 * 60 * 1000);

      metrics.halving_tip_height = tipHeight;
      metrics.halving_next_height = nextHalvingHeight;
      metrics.halving_blocks_remaining = blocksRemaining;
      metrics.halving_days_remaining = estimatedDays;
      metrics.halving_estimated_date = estimatedDate.toISOString();
    }
  }

  return metrics;
}
