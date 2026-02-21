/**
 * LLM 排行榜配置
 *
 * 配置数据源、更新频率等参数
 */

export const LLM_CONFIG = {
  // 数据源选择: "openrouter" | "hybrid" | "huggingface" | "mock"
  dataSource: (process.env.LLM_DATA_SOURCE || "hybrid") as
    | "openrouter"
    | "hybrid"
    | "huggingface"
    | "mock",

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

  // OpenRouter 配置（覆盖更多闭源模型，如 Claude/GPT/GLM/Kimi）
  openrouter: {
    // API 基础 URL
    apiBase: process.env.OR_API_BASE || "https://openrouter.ai/api/v1",

    // 获取模型数量
    modelLimit: parseInt(process.env.OR_MODEL_LIMIT || "60", 10),

    // 分类维度（按使用量排序）
    categories: (process.env.OR_CATEGORIES || "general,programming,multimodal")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),

    // 保障纳入的关键词（避免闭源主流模型被截断）
    pinnedKeywords: (process.env.OR_PINNED_KEYWORDS || "gemini")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),

    // API Key（可选）
    apiKey: process.env.OPENROUTER_API_KEY,
  },

  // 混合数据源配置
  hybrid: {
    // 混合模式下最多返回的模型数量
    modelLimit: parseInt(process.env.LLM_HYBRID_MODEL_LIMIT || "80", 10),
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
