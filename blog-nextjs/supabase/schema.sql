-- ============================================
-- TrendRadar Blog - Supabase Database Schema
-- ============================================
--
-- 功能：
-- 1. 加密货币数据存储
-- 2. 股票数据存储
-- 3. 价格历史记录
-- 4. 文章浏览统计
-- 5. 自动更新时间戳
-- 6. RLS 安全策略
--
-- 使用方法：
-- 1. 在 Supabase Dashboard → SQL Editor 中执行此文件
-- 2. 确保启用 Row Level Security
-- 3. 配置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
-- ============================================

-- ============================================
-- 1. 加密货币数据表
-- ============================================
CREATE TABLE IF NOT EXISTS crypto_data (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,                -- 交易对符号（BTC, ETH等）
  price DECIMAL(20, 8) NOT NULL,              -- 当前价格（USD）
  price_change_24h DECIMAL(10, 4),            -- 24小时价格变化百分比
  volume_24h DECIMAL(30, 2),                  -- 24小时交易量（USD）
  exchange VARCHAR(50) DEFAULT 'CoinGecko',   -- 交易所/数据源
  timestamp TIMESTAMPTZ NOT NULL,             -- 数据时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),       -- 记录创建时间
  updated_at TIMESTAMPTZ DEFAULT NOW()        -- 记录更新时间
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_crypto_symbol ON crypto_data(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_timestamp ON crypto_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_symbol_timestamp ON crypto_data(symbol, timestamp DESC);

-- 注释
COMMENT ON TABLE crypto_data IS '加密货币实时数据';
COMMENT ON COLUMN crypto_data.symbol IS '加密货币符号（如 BTC, ETH）';
COMMENT ON COLUMN crypto_data.price IS '当前价格（美元）';
COMMENT ON COLUMN crypto_data.price_change_24h IS '24小时涨跌幅百分比';
COMMENT ON COLUMN crypto_data.volume_24h IS '24小时交易量（美元）';

-- ============================================
-- 2. 股票数据表
-- ============================================
CREATE TABLE IF NOT EXISTS stock_data (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,                -- 股票代码（^GSPC, AAPL等）
  name VARCHAR(100),                          -- 股票名称
  price DECIMAL(20, 4) NOT NULL,              -- 当前价格
  change DECIMAL(20, 4),                      -- 价格变化（绝对值）
  change_percent DECIMAL(10, 4),              -- 价格变化百分比
  volume BIGINT,                              -- 成交量
  market VARCHAR(10) NOT NULL,                -- 市场类型（US, HK, CN）
  timestamp TIMESTAMPTZ NOT NULL,             -- 数据时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),       -- 记录创建时间
  updated_at TIMESTAMPTZ DEFAULT NOW()        -- 记录更新时间
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_stock_symbol ON stock_data(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_timestamp ON stock_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_market ON stock_data(market);
CREATE INDEX IF NOT EXISTS idx_stock_symbol_timestamp ON stock_data(symbol, timestamp DESC);

-- 注释
COMMENT ON TABLE stock_data IS '股票实时数据';
COMMENT ON COLUMN stock_data.symbol IS '股票代码（如 ^GSPC, AAPL）';
COMMENT ON COLUMN stock_data.market IS '市场类型：US（美股）, HK（港股）, CN（A股）';

-- ============================================
-- 3. 价格历史表（通用）
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,                -- 交易对/股票代码
  data_type VARCHAR(10) NOT NULL,             -- 数据类型：crypto 或 stock
  price DECIMAL(20, 8) NOT NULL,              -- 价格
  timestamp TIMESTAMPTZ NOT NULL,             -- 价格时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()        -- 记录创建时间
);

-- 索引优化（支持高效的时间序列查询）
CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_type_timestamp
  ON price_history(symbol, data_type, timestamp DESC);

-- 注释
COMMENT ON TABLE price_history IS '价格历史数据（用于图表）';
COMMENT ON COLUMN price_history.data_type IS '数据类型：crypto（加密货币）或 stock（股票）';

-- ============================================
-- 4. 文章浏览统计表
-- ============================================
CREATE TABLE IF NOT EXISTS view_stats (
  id BIGSERIAL PRIMARY KEY,
  article_slug VARCHAR(255) NOT NULL,         -- 文章 slug
  view_count BIGINT DEFAULT 0,                -- 浏览次数
  unique_visitors BIGINT DEFAULT 0,           -- 独立访客数
  last_viewed_at TIMESTAMPTZ,                 -- 最后浏览时间
  created_at TIMESTAMPTZ DEFAULT NOW(),       -- 记录创建时间
  updated_at TIMESTAMPTZ DEFAULT NOW(),       -- 记录更新时间
  UNIQUE(article_slug)                        -- 确保每个文章只有一条记录
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_view_stats_slug ON view_stats(article_slug);
CREATE INDEX IF NOT EXISTS idx_view_stats_count ON view_stats(view_count DESC);

-- 注释
COMMENT ON TABLE view_stats IS '文章浏览统计';
COMMENT ON COLUMN view_stats.article_slug IS '文章 URL slug（唯一标识符）';

-- ============================================
-- 4.5 AI Dock 快照缓存表
-- ============================================
CREATE TABLE IF NOT EXISTS ai_news_cache (
  cache_key VARCHAR(50) PRIMARY KEY,          -- 缓存键（默认 default）
  payload JSONB NOT NULL,                     -- AI Dock 快照内容
  updated_at TIMESTAMPTZ DEFAULT NOW()        -- 最近更新时间
);

COMMENT ON TABLE ai_news_cache IS 'AI Dock 推文快照缓存（每日更新）';
COMMENT ON COLUMN ai_news_cache.cache_key IS '缓存主键，默认 default';
COMMENT ON COLUMN ai_news_cache.payload IS '序列化后的 AI Dock 数据';

-- ============================================
-- 5. 自动更新 updated_at 时间戳
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表添加自动更新触发器
CREATE TRIGGER update_crypto_data_updated_at
  BEFORE UPDATE ON crypto_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_data_updated_at
  BEFORE UPDATE ON stock_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_view_stats_updated_at
  BEFORE UPDATE ON view_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE crypto_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_news_cache ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取数据（公开访问）
CREATE POLICY "Allow public read access on crypto_data"
  ON crypto_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on stock_data"
  ON stock_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on price_history"
  ON price_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on view_stats"
  ON view_stats FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on ai_news_cache"
  ON ai_news_cache FOR SELECT
  USING (true);

-- 只允许认证用户写入（通过 service_role key）
-- 注意：需要在应用中使用 service_role key 来写入数据
-- anon key 只能读取

CREATE POLICY "Allow service role insert on crypto_data"
  ON crypto_data FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Allow service role insert on stock_data"
  ON stock_data FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Allow service role insert on price_history"
  ON price_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Allow public upsert on view_stats"
  ON view_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on view_stats"
  ON view_stats FOR UPDATE
  USING (true);

CREATE POLICY "Allow service role upsert on ai_news_cache"
  ON ai_news_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Allow service role update on ai_news_cache"
  ON ai_news_cache FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================
-- 7. 数据保留策略（自动清理旧数据）
-- ============================================

-- 创建定时清理函数（保留最近30天的数据）
CREATE OR REPLACE FUNCTION cleanup_old_market_data()
RETURNS void AS $$
BEGIN
  -- 清理30天前的加密货币数据
  DELETE FROM crypto_data
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- 清理30天前的股票数据
  DELETE FROM stock_data
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- 清理90天前的价格历史数据
  DELETE FROM price_history
  WHERE created_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Old market data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- 注意：需要在 Supabase Dashboard → Database → Cron Jobs 中设置定时任务
-- 例如：每天凌晨2点执行一次
-- SELECT cron.schedule('cleanup-old-market-data', '0 2 * * *', 'SELECT cleanup_old_market_data()');

-- ============================================
-- 8. 实用查询视图
-- ============================================

-- 最新加密货币数据视图
CREATE OR REPLACE VIEW latest_crypto_data AS
SELECT DISTINCT ON (symbol)
  symbol,
  price,
  price_change_24h,
  volume_24h,
  exchange,
  timestamp
FROM crypto_data
ORDER BY symbol, timestamp DESC;

-- 最新股票数据视图
CREATE OR REPLACE VIEW latest_stock_data AS
SELECT DISTINCT ON (symbol)
  symbol,
  name,
  price,
  change,
  change_percent,
  volume,
  market,
  timestamp
FROM stock_data
ORDER BY symbol, timestamp DESC;

-- 注释
COMMENT ON VIEW latest_crypto_data IS '最新的加密货币数据（每个币种最新一条）';
COMMENT ON VIEW latest_stock_data IS '最新的股票数据（每个股票最新一条）';

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - crypto_data (加密货币数据)';
  RAISE NOTICE '  - stock_data (股票数据)';
  RAISE NOTICE '  - price_history (价格历史)';
  RAISE NOTICE '  - view_stats (浏览统计)';
  RAISE NOTICE '  - ai_news_cache (AI Dock 快照)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - latest_crypto_data';
  RAISE NOTICE '  - latest_stock_data';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Configure environment variables in .env.local';
  RAISE NOTICE '  2. Test API connection with Supabase client';
  RAISE NOTICE '  3. Set up Vercel Cron Jobs for data updates';
  RAISE NOTICE '============================================';
END $$;
