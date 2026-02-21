/**
 * 区块链市值排行榜数据抓取
 *
 * 数据源：CoinGecko /coins/markets
 */

import type { BlockchainMarketCapItem } from "@/types/market";

interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  fully_diluted_valuation?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  last_updated?: string;
}

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&sparkline=false&price_change_percentage=24h";

/**
 * 获取区块链市值排行榜（按市值降序）
 */
export async function fetchBlockchainMarketCapLeaderboard(
  limit: number = 20
): Promise<BlockchainMarketCapItem[]> {
  const perPage = Math.max(1, Math.min(50, limit));
  const url = `${COINGECKO_URL}&per_page=${perPage}&page=1`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("获取区块链市值排行榜失败:", response.status);
      return [];
    }

    const data = (await response.json()) as CoinGeckoMarketItem[];
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => typeof item.market_cap === "number" && item.market_cap > 0)
      .map((item, index) => ({
        rank: item.market_cap_rank || index + 1,
        id: item.id,
        symbol: (item.symbol || "").toUpperCase(),
        name: item.name || item.id,
        image: item.image,
        price: item.current_price || 0,
        market_cap: item.market_cap || 0,
        fully_diluted_valuation: item.fully_diluted_valuation || 0,
        volume_24h: item.total_volume || 0,
        price_change_24h: item.price_change_percentage_24h || 0,
        circulating_supply: item.circulating_supply || 0,
        total_supply: item.total_supply || 0,
        max_supply: item.max_supply || 0,
        last_updated: item.last_updated || new Date().toISOString(),
        source: "CoinGecko",
      }))
      .sort((a, b) => a.rank - b.rank);
  } catch (error) {
    console.error("获取区块链市值排行榜异常:", error);
    return [];
  }
}

