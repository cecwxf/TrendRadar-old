-- TrendRadar 市场数据表结构
-- 用于存储加密货币和股票数据

-- ============================================
-- 加密货币数据表
-- ============================================
CREATE TABLE IF NOT EXISTS crypto_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                    -- 日期 YYYY-MM-DD
    crawl_time TEXT NOT NULL,              -- 抓取时间 HH:MM
    symbol TEXT NOT NULL,                  -- 币种符号 (BTC, ETH)
    price REAL NOT NULL,                   -- 当前价格 (USD)
    price_change_24h REAL DEFAULT 0,       -- 24小时涨跌幅 (%)
    volume_24h REAL DEFAULT 0,             -- 24小时交易量 (USD)
    timestamp TEXT NOT NULL,               -- ISO时间戳
    exchange TEXT DEFAULT 'CoinGecko',     -- 数据源
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, crawl_time, symbol)       -- 唯一约束：每次抓取每个币种一条记录
);

-- 索引：加速按日期和符号查询
CREATE INDEX IF NOT EXISTS idx_crypto_date_symbol ON crypto_data(date, symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_symbol_crawl ON crypto_data(symbol, crawl_time);

-- ============================================
-- 股票数据表
-- ============================================
CREATE TABLE IF NOT EXISTS stock_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                    -- 日期 YYYY-MM-DD
    crawl_time TEXT NOT NULL,              -- 抓取时间 HH:MM
    symbol TEXT NOT NULL,                  -- 股票代码 (^GSPC, AAPL)
    name TEXT NOT NULL,                    -- 股票名称 (S&P 500)
    price REAL NOT NULL,                   -- 当前价格
    change REAL DEFAULT 0,                 -- 价格变化（绝对值）
    change_percent REAL DEFAULT 0,         -- 价格变化百分比
    volume INTEGER DEFAULT 0,              -- 成交量
    timestamp TEXT NOT NULL,               -- ISO时间戳
    market TEXT DEFAULT 'US',              -- 市场类型 (US, HK, CN)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, crawl_time, symbol)       -- 唯一约束
);

-- 索引：加速按日期、市场和符号查询
CREATE INDEX IF NOT EXISTS idx_stock_date_symbol ON stock_data(date, symbol);
CREATE INDEX IF NOT EXISTS idx_stock_market ON stock_data(market, date);
CREATE INDEX IF NOT EXISTS idx_stock_symbol_crawl ON stock_data(symbol, crawl_time);

-- ============================================
-- 价格历史表（用于图表）
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_type TEXT NOT NULL,              -- 资产类型 ('crypto' 或 'stock')
    symbol TEXT NOT NULL,                  -- 符号 (BTC, ^GSPC)
    timestamp TEXT NOT NULL,               -- ISO时间戳
    price REAL NOT NULL,                   -- 价格
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_type, symbol, timestamp)  -- 唯一约束
);

-- 索引：加速按资产类型和符号查询历史
CREATE INDEX IF NOT EXISTS idx_price_history_asset ON price_history(asset_type, symbol, timestamp);

-- ============================================
-- AI 分析结果表（可选）
-- ============================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                    -- 日期 YYYY-MM-DD
    crawl_time TEXT NOT NULL,              -- 抓取时间 HH:MM
    summary TEXT,                          -- 总结
    crypto_insights TEXT,                  -- 加密货币洞察
    stock_insights TEXT,                   -- 股票洞察
    recommendations TEXT,                  -- 建议
    risk_level TEXT,                       -- 风险等级 (low/medium/high)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, crawl_time)               -- 每次抓取一条AI分析
);

-- 索引：加速按日期查询
CREATE INDEX IF NOT EXISTS idx_ai_insights_date ON ai_insights(date);
