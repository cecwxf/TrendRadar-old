/**
 * LLM 排行榜配置
 *
 * 配置数据源、更新频率等参数
 */

export const LLM_CONFIG = {
  // 数据源选择: "huggingface" | "mock"
  dataSource: (process.env.LLM_DATA_SOURCE || "huggingface") as "huggingface" | "mock",

  // HuggingFace 配置
  huggingface: {
    // API 基础 URL
    apiBase: process.env.HF_API_BASE || "https://huggingface.co/api",

    // 获取模型数量
    modelLimit: parseInt(process.env.HF_MODEL_LIMIT || "50", 10),

    // 筛选条件
    filter: process.env.HF_FILTER || "text-generation",

    // 排序方式: "downloads" | "likes" | "trending"
    sortBy: process.env.HF_SORT_BY || "downloads",

    // API Token (可选，用于提高速率限制)
    apiToken: process.env.HF_API_TOKEN,
  },

  // 缓存配置
  cache: {
    // 缓存时间（秒）
    ttl: parseInt(process.env.LLM_CACHE_TTL || "3600", 10),

    // stale-while-revalidate 时间（秒）
    swr: parseInt(process.env.LLM_CACHE_SWR || "7200", 10),
  },

  // 趋势数据配置
  trends: {
    // 历史天数
    days: parseInt(process.env.LLM_TRENDS_DAYS || "30", 10),

    // Top N 模型
    topN: parseInt(process.env.LLM_TRENDS_TOP_N || "10", 10),
  },

  // 分类配置
  categories: {
    enabled: process.env.LLM_CATEGORIES_ENABLED !== "false",
    list: ["通用", "编程", "多模态"],
  },

  // 市场份额配置
  marketShare: {
    enabled: process.env.LLM_MARKET_SHARE_ENABLED !== "false",
    minSharePercent: parseFloat(process.env.LLM_MIN_SHARE_PERCENT || "1.0"),
  },
};

// 导出类型
export type LLMConfigType = typeof LLM_CONFIG;
