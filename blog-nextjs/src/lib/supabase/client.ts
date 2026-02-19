/**
 * Supabase 客户端
 *
 * 提供两种客户端：
 * 1. Browser/Server Component 客户端（使用 anon key，只读）
 * 2. Service 客户端（使用 service_role key，读写）
 */

import { createClient } from "@supabase/supabase-js";

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured && process.env.NODE_ENV !== "production") {
  console.warn("⚠️ Supabase not configured - market features will be disabled");
}

/**
 * 公开客户端（Browser/Server Components）
 *
 * 使用 anon key，只能读取数据（受 RLS 策略限制）
 * 可在客户端和服务端安全使用
 */
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Server-side 不需要持久化 session
      },
    })
  : null;

/**
 * Service 客户端（仅限服务端使用）
 *
 * 使用 service_role key，绕过 RLS，拥有完全读写权限
 * ⚠️ 警告：仅在服务端（API Routes、Server Actions）使用，切勿暴露到客户端！
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (!supabaseAdmin) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not configured - write operations will fail");
}

/**
 * 数据库表名常量
 */
export const TABLE_NAMES = {
  CRYPTO_DATA: "crypto_data",
  STOCK_DATA: "stock_data",
  PRICE_HISTORY: "price_history",
  VIEW_STATS: "view_stats",
  AI_NEWS_CACHE: "ai_news_cache",
} as const;

/**
 * 数据库视图名常量
 */
export const VIEW_NAMES = {
  LATEST_CRYPTO: "latest_crypto_data",
  LATEST_STOCK: "latest_stock_data",
} as const;
