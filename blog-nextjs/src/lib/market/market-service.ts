/**
 * 市场数据服务
 *
 * 负责市场数据的存储和查询：
 * - 保存加密货币和股票数据到 Supabase
 * - 查询最新数据
 * - 查询历史数据
 * - 管理价格历史记录
 */

import { supabase, supabaseAdmin, TABLE_NAMES, VIEW_NAMES } from "@/lib/supabase/client";
import type { CryptoItem, StockItem, PricePoint } from "@/types/market";

/**
 * 数据库行类型
 */
interface CryptoDataRow {
  id: number;
  symbol: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  exchange: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

interface StockDataRow {
  id: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market: "US" | "HK" | "CN";
  timestamp: string;
  created_at: string;
  updated_at: string;
}

interface PriceHistoryRow {
  id: number;
  symbol: string;
  data_type: "crypto" | "stock";
  price: number;
  timestamp: string;
  created_at: string;
}

/**
 * 保存加密货币数据到数据库
 */
export async function saveCryptoData(
  cryptoItems: Record<string, CryptoItem>
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: "Supabase admin client not configured" };
  }

  try {
    const rows = Object.values(cryptoItems).map((item) => ({
      symbol: item.symbol,
      price: item.price,
      price_change_24h: item.price_change_24h,
      volume_24h: item.volume_24h,
      exchange: item.exchange,
      timestamp: item.timestamp,
    }));

    const { error } = await supabaseAdmin.from(TABLE_NAMES.CRYPTO_DATA).insert(rows);

    if (error) {
      console.error("保存加密货币数据失败:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 成功保存 ${rows.length} 条加密货币数据`);
    return { success: true };
  } catch (error) {
    console.error("保存加密货币数据异常:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 保存股票数据到数据库
 */
export async function saveStockData(
  stockItems: Record<string, StockItem>
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: "Supabase admin client not configured" };
  }

  try {
    const rows = Object.values(stockItems).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      price: item.price,
      change: item.change,
      change_percent: item.change_percent,
      volume: item.volume,
      market: item.market,
      timestamp: item.timestamp,
    }));

    const { error } = await supabaseAdmin.from(TABLE_NAMES.STOCK_DATA).insert(rows);

    if (error) {
      console.error("保存股票数据失败:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 成功保存 ${rows.length} 条股票数据`);
    return { success: true };
  } catch (error) {
    console.error("保存股票数据异常:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 保存价格历史数据到数据库
 */
export async function savePriceHistory(
  symbol: string,
  dataType: "crypto" | "stock",
  history: PricePoint[]
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: "Supabase admin client not configured" };
  }

  if (history.length === 0) {
    return { success: true }; // 无数据，直接返回成功
  }

  try {
    const rows = history.map((point) => ({
      symbol,
      data_type: dataType,
      price: point.price,
      timestamp: point.timestamp,
    }));

    const { error } = await supabaseAdmin.from(TABLE_NAMES.PRICE_HISTORY).insert(rows);

    if (error) {
      console.error(`保存 ${symbol} 价格历史失败:`, error);
      return { success: false, error: error.message };
    }

    console.log(`✅ 成功保存 ${symbol} 的 ${rows.length} 条价格历史`);
    return { success: true };
  } catch (error) {
    console.error(`保存 ${symbol} 价格历史异常:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * 获取最新的加密货币数据
 */
export async function getLatestCryptoData(): Promise<CryptoItem[]> {
  if (!supabase) {
    console.warn("Supabase client not configured");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(VIEW_NAMES.LATEST_CRYPTO)
      .select("*")
      .order("symbol", { ascending: true });

    if (error) {
      console.error("获取最新加密货币数据失败:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      symbol: row.symbol,
      price: parseFloat(row.price),
      price_change_24h: parseFloat(row.price_change_24h),
      volume_24h: parseFloat(row.volume_24h),
      exchange: row.exchange,
      timestamp: row.timestamp,
      price_history: [],
    }));
  } catch (error) {
    console.error("获取最新加密货币数据异常:", error);
    return [];
  }
}

/**
 * 获取最新的股票数据
 */
export async function getLatestStockData(): Promise<StockItem[]> {
  if (!supabase) {
    console.warn("Supabase client not configured");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(VIEW_NAMES.LATEST_STOCK)
      .select("*")
      .order("market", { ascending: true })
      .order("symbol", { ascending: true });

    if (error) {
      console.error("获取最新股票数据失败:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      symbol: row.symbol,
      name: row.name,
      price: parseFloat(row.price),
      change: parseFloat(row.change),
      change_percent: parseFloat(row.change_percent),
      volume: parseInt(row.volume),
      market: row.market,
      timestamp: row.timestamp,
      price_history: [],
    }));
  } catch (error) {
    console.error("获取最新股票数据异常:", error);
    return [];
  }
}

/**
 * 获取指定币种/股票的价格历史
 */
export async function getPriceHistory(
  symbol: string,
  dataType: "crypto" | "stock",
  hours: number = 24
): Promise<PricePoint[]> {
  if (!supabase) {
    console.warn("Supabase client not configured");
    return [];
  }

  try {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(TABLE_NAMES.PRICE_HISTORY)
      .select("timestamp, price")
      .eq("symbol", symbol)
      .eq("data_type", dataType)
      .gte("timestamp", startTime)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error(`获取 ${symbol} 价格历史失败:`, error);
      return [];
    }

    return (data || []).map((row: any) => ({
      timestamp: row.timestamp,
      price: parseFloat(row.price),
    }));
  } catch (error) {
    console.error(`获取 ${symbol} 价格历史异常:`, error);
    return [];
  }
}

/**
 * 增加文章浏览量
 */
export async function incrementViewCount(articleSlug: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn("Supabase admin client not configured");
    return false;
  }

  try {
    // 先查询是否已有记录
    const { data: existing } = await supabaseAdmin
      .from(TABLE_NAMES.VIEW_STATS)
      .select("view_count")
      .eq("article_slug", articleSlug)
      .single();

    if (existing) {
      // 记录已存在，view_count + 1
      const { error } = await supabaseAdmin
        .from(TABLE_NAMES.VIEW_STATS)
        .update({
          view_count: existing.view_count + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("article_slug", articleSlug);

      return !error;
    } else {
      // 记录不存在，插入新记录
      const { error } = await supabaseAdmin
        .from(TABLE_NAMES.VIEW_STATS)
        .insert({
          article_slug: articleSlug,
          view_count: 1,
          last_viewed_at: new Date().toISOString(),
        });

      return !error;
    }
  } catch (error) {
    console.error("增加浏览量失败:", error);
    return false;
  }
}

/**
 * 获取文章浏览量
 */
export async function getViewCount(articleSlug: string): Promise<number> {
  if (!supabase) {
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAMES.VIEW_STATS)
      .select("view_count")
      .eq("article_slug", articleSlug)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.view_count || 0;
  } catch (error) {
    console.error("获取浏览量失败:", error);
    return 0;
  }
}
