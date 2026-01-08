# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TrendRadar** is a comprehensive Python-based news aggregation, market analysis, and trend monitoring platform that:

### Core Features
- **News Aggregation**: Crawls hot topics from multiple Chinese news platforms (Weibo, Zhihu, Douyin, Baidu, etc.)
- **Market Dashboard**: Tracks cryptocurrency and stock market data with AI-powered analysis
- **RSS Feed Monitoring**: Monitors and filters RSS feeds with keyword-based filtering
- **Keyword Analysis**: Provides frequency analysis and trend detection
- **Multi-Channel Notifications**: Sends alerts via WeChat, Telegram, Email, Feishu, DingTalk, and more
- **MCP Server**: Offers two MCP (Model Context Protocol) servers:
  - News analysis server (20+ tools for news data queries and analytics)
  - Market analysis server (real-time crypto/stock data with AI insights)
- **Web Frontend**: Next.js-based blog and dashboard for visualizing data
- **Dual Storage**: Supports both local and remote (S3-compatible) storage backends

## Development Commands

### Running the Application

```bash
# Run the main news crawler and analyzer
python -m trendradar

# Run the market dashboard (crypto + stocks + AI analysis)
python -m trendradar.market_dashboard

# Run the news MCP server (for AI-powered news analysis)
python -m mcp_server.server
# or
trendradar-mcp

# Run MCP server in HTTP mode (production)
trendradar-mcp --transport http --host 0.0.0.0 --port 3333

# Run the market analysis MCP server
python -m trendradar.mcp.market_analysis
```

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install in development mode
pip install -e .

# Install with optional dependencies
pip install yfinance  # For stock data
pip install anthropic  # For Claude AI analysis
```

### Frontend Development (Next.js Blog)

```bash
cd blog-nextjs

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing & Docker

```bash
# Build Docker image
docker build -t trendradar .

# Run Docker container
docker run -d --name trendradar \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/output:/app/output \
  trendradar

# Start HTTP server for viewing reports
./start-http.sh  # Linux/Mac
start-http.bat   # Windows
```

## Code Architecture

### High-Level Structure

The project follows a modular architecture with clear separation of concerns:

```
trendradar/              # Main application package
├── __main__.py          # Entry point: NewsAnalyzer orchestrates the workflow
├── context.py           # AppContext: encapsulates all config-dependent operations
├── market_dashboard.py  # Market dashboard main program (crypto + stocks + AI)
├── core/                # Core business logic
│   ├── config.py        # Configuration loading (config.yaml + env vars)
│   ├── loader.py        # Data loading utilities
│   ├── analyzer.py      # Keyword frequency analysis
│   ├── frequency.py     # Word matching logic
│   └── data.py          # Data structures (NewsData, RSSData)
├── crawler/             # Data fetching layer
│   ├── fetcher.py       # Platform crawling (via newsnow API)
│   ├── crypto.py        # Cryptocurrency data fetcher (CoinGecko API)
│   ├── stocks.py        # Stock market data fetcher (yfinance)
│   └── rss/             # RSS feed handling
│       ├── fetcher.py   # RSS feed fetcher
│       └── parser.py    # RSS feed parser
├── analysis/            # AI-powered analysis
│   └── claude_analyzer.py  # Claude API integration for market analysis
├── storage/             # Storage abstraction layer
│   ├── base.py          # StorageBackend interface
│   ├── local.py         # Local file + SQLite storage
│   ├── remote.py        # S3-compatible remote storage
│   ├── manager.py       # StorageManager: unified storage access
│   └── market_models.py # Market data models (MarketData, CryptoItem, StockItem)
├── report/              # Report generation
│   ├── generator.py     # HTML report orchestration
│   ├── html.py          # HTML rendering for news reports
│   ├── rss_html.py      # RSS-specific HTML rendering
│   ├── dashboard_html.py # Market dashboard HTML generation
│   ├── formatter.py     # Data formatting
│   └── helpers.py       # Rendering helpers
├── notification/        # Notification dispatch
│   ├── dispatcher.py    # Multi-channel notification dispatcher
│   ├── senders.py       # Individual channel senders (Feishu, Telegram, etc.)
│   ├── batch.py         # Batch notification handling
│   ├── push_manager.py  # Push scheduling and management
│   ├── renderer.py      # Generic message rendering
│   ├── market_renderer.py # Market-specific Feishu card rendering
│   ├── formatters.py    # Message formatters
│   └── splitter.py      # Message splitting for large content
├── mcp/                 # MCP server extensions
│   └── market_analysis.py # Market analysis MCP tools
└── utils/               # Shared utilities
    ├── time.py          # Time/timezone utilities
    └── url.py           # URL utilities

mcp_server/              # Main MCP server for news analysis
├── server.py            # FastMCP server definition (20+ tools)
├── tools/               # MCP tool implementations
│   ├── data_query.py    # News/RSS data queries
│   ├── analytics.py     # Trend/sentiment analysis
│   ├── search_tools.py  # Keyword/fuzzy search
│   ├── config_mgmt.py   # Configuration access
│   ├── system.py        # System status & manual crawl
│   └── storage_sync.py  # Remote storage sync
├── services/            # Business logic services
│   ├── data_service.py  # Data access layer
│   ├── cache_service.py # Query result caching
│   └── parser_service.py # Date/query parsing
└── utils/               # Shared utilities
    ├── date_parser.py   # Natural language date parsing
    ├── validators.py    # Input validation
    └── errors.py        # Error handling

blog-nextjs/             # Next.js frontend for blog and dashboard
├── src/
│   ├── app/             # Next.js 13+ app directory
│   │   ├── page.tsx     # Home page
│   │   ├── market/      # Market dashboard pages
│   │   ├── article/     # Article pages
│   │   ├── api/         # API routes (Supabase, Notion integration)
│   │   └── rss.xml/     # RSS feed generation
│   ├── components/      # React components
│   ├── lib/             # Utility libraries
│   ├── styles/          # CSS/Tailwind styles
│   └── types/           # TypeScript type definitions
└── public/              # Static assets

config/                  # Configuration files
├── config.yaml          # Main news aggregation config
├── market_config.yaml   # Market dashboard config (crypto/stocks/AI)
└── frequency_words.txt  # Keyword filtering rules

.github/workflows/       # GitHub Actions workflows
├── crawler.yml          # News crawler schedule (hourly)
├── market_dashboard.yml # Market dashboard schedule (daily)
├── docker.yml           # Docker build and publish
└── clean-crawler.yml    # Cleanup workflow
```

### Key Design Patterns

#### 1. Context Object Pattern (AppContext)
- `trendradar/context.py` wraps all configuration-dependent operations
- Eliminates global state and improves testability
- Provides unified interface for time, storage, reporting, and notification operations
- Usage: `ctx = AppContext(config)` → `ctx.get_time()`, `ctx.generate_html()`, etc.

#### 2. Storage Abstraction Layer
- `storage/base.py` defines `StorageBackend` interface
- `storage/manager.py` provides `StorageManager` that auto-selects backend (local/remote)
- Supports seamless switching between local SQLite and S3-compatible remote storage
- Data stored in standardized formats:
  - News: `NewsData` and `RSSData` (core/data.py)
  - Market: `MarketData`, `CryptoItem`, `StockItem` (storage/market_models.py)

#### 3. Three Report Modes
The analyzer supports three operating modes (`REPORT_MODE` in config):
- **incremental**: Only reports new news items (no push if nothing new)
- **current**: Shows current trending news + new items section (periodic push)
- **daily**: Daily summary of all matched news (scheduled push)

Mode strategy is defined in `NewsAnalyzer.MODE_STRATEGIES` and executed via `_execute_mode_strategy()`

#### 4. MCP Server Architecture
**News Analysis MCP Server** (`mcp_server/`):
- Built with **FastMCP 2.0** for production-grade MCP tool serving
- 20+ tools organized by category (data query, analytics, search, config, system)
- **Important**: Always call `resolve_date_range` first for natural language dates ("本周", "最近7天") before other tools
- Tools use singleton pattern for service instances (`_get_tools()`)

**Market Analysis MCP Server** (`trendradar/mcp/market_analysis.py`):
- Provides real-time crypto and stock data queries
- Integrated with local storage for historical data
- Tools: `get_crypto_prices`, `get_stock_indices`, `get_market_summary`, etc.

#### 5. Market Dashboard System
The `MarketDashboard` class (market_dashboard.py) orchestrates:
1. **Data Collection**: CryptoFetcher + StockFetcher → fetch current market data
2. **Storage**: MarketData → LocalStorageBackend → SQLite database
3. **AI Analysis**: ClaudeMarketAnalyzer → generates insights using Claude API
4. **Visualization**: render_dashboard_html → creates interactive HTML dashboard
5. **Notification**: market_renderer → sends Feishu cards with market summary

Supports:
- Multiple cryptocurrencies with category classification (主流币, 公链, DeFi)
- Major stock indices (US: S&P500/Nasdaq/Dow, HK: HSI, CN: Shanghai/Shenzhen/ChiNext)
- Historical trend analysis (1 week, 1 month)
- AI-powered insights with investment suggestions

#### 6. Frontend Architecture (blog-nextjs)
- **Framework**: Next.js 14+ with App Router
- **UI**: React 19 + Tailwind CSS + TypeScript
- **Data Fetching**: SWR for client-side, Supabase for backend
- **Visualization**: ECharts for interactive charts
- **Features**:
  - Market dashboard with real-time updates
  - Blog article system (Notion CMS integration)
  - RSS feed generation
  - Dark mode support (next-themes)
  - Comments integration (Giscus)

### Data Flow

#### News Aggregation Flow
1. **Crawling**: `DataFetcher` → fetches from newsnow API → `NewsData`
2. **Storage**: `NewsData` → `StorageManager.save_news_data()` → SQLite/S3
3. **Analysis**: Load via `AppContext.read_today_titles()` → `count_word_frequency()` → stats
4. **Reporting**: stats → `generate_html_report()` → HTML file
5. **Notification**: stats → `NotificationDispatcher.dispatch_all()` → multi-channel push

#### Market Dashboard Flow
1. **Fetch Data**:
   - `CryptoFetcher.fetch_prices()` → CoinGecko API → `CryptoItem[]`
   - `StockFetcher.fetch_indices()` → yfinance → `StockItem[]`
2. **Aggregate**: Combine into `MarketData` object
3. **Store**: `LocalStorageBackend.save_market_data()` → SQLite
4. **Analyze**: `ClaudeMarketAnalyzer.analyze_market()` → Claude API → insights
5. **Render**:
   - `render_dashboard_html()` → HTML dashboard
   - `render_market_feishu_card()` → Feishu notification
6. **Deploy**: GitHub Actions → docs/ folder → GitHub Pages

### Configuration System

#### Main Configuration Files

**`config/config.yaml`** - News aggregation configuration:
- Platform selection (Weibo, Zhihu, Douyin, etc.)
- Keyword filtering rules
- RSS feed sources
- Notification channels (Feishu, Telegram, Email, etc.)
- Storage backend (local/remote)
- Report mode (incremental/current/daily)

**`config/market_config.yaml`** - Market dashboard configuration:
- Cryptocurrency list with categories
- Stock indices selection
- AI analysis settings (Claude model, API key)
- Update intervals
- Notification preferences
- Dashboard display options

**`config/frequency_words.txt`** - Keyword filtering:
- Supports word groups (e.g., `[AI|人工智能|机器学习]`)
- Global filters (lines starting with `!`)
- Category filters (lines starting with `#`)

#### Environment Variables
Many settings support environment variable overrides:
- `ANTHROPIC_API_KEY` - Claude API key for market analysis
- `STORAGE_RETENTION_DAYS` - Data retention period
- `FEISHU_WEBHOOK_URL` - Feishu notification webhook
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` - Telegram notifications
- `EMAIL_FROM` / `EMAIL_PASSWORD` / `EMAIL_TO` - Email notifications
- `GITHUB_ACTIONS=true` - Automatic detection for CI/CD mode

### Storage Format

#### News Storage
- **SQLite schema**:
  - `news` table: (title, platform, rank, weight, url, crawl_time, crawl_date)
  - `rss` table: (title, source, url, published_time, crawl_time)
- **TXT snapshots**: Optional legacy format in `output/YYYY-MM-DD/titles_HH-MM-SS.txt`
- **HTML reports**: Generated in `output/YYYY-MM-DD/html/`
- **Remote storage**: Mirrors local structure in S3 bucket with `YYYY-MM-DD/` prefixes

#### Market Storage
- **SQLite database**: `output/market/market_data.db`
- **Tables**:
  - `crypto`: (symbol, name, price, change_24h, volume_24h, timestamp)
  - `stocks`: (symbol, name, price, change_pct, volume, timestamp)
  - `analysis`: (analysis_text, timestamp)
- **Dashboard HTML**: `output/dashboard/index.html`
- **Deployment**: Copied to `docs/` for GitHub Pages hosting

### Notification System

#### Multi-Channel Support
- **Dispatcher pattern**: `NotificationDispatcher` handles all channels in parallel
- **Supported channels**: Feishu (飞书), DingTalk (钉钉), WeChat Work (企业微信), Telegram, Email, ntfy, Bark, Slack
- **Batch handling**: Large reports split into batches to avoid API limits
- **Push window control**: Optional time-window restrictions and once-per-day limits
- **Content merging**: Hot news + RSS feeds can be merged into single notification

#### Market Notifications
- **Feishu Cards**: Rich interactive cards with market data visualization
  - Header with update time
  - Crypto section with price/change/volume
  - Stock section with indices
  - AI analysis insights
  - Color-coded based on market sentiment
- **Text Format**: Fallback plain text format for other channels
- **Summary Format**: Condensed format for quick updates

### MCP Tools Reference

#### News Analysis MCP Server Tools (mcp_server/)

**Data Query Tools**:
- `resolve_date_range` - Convert natural language dates to ISO format (ALWAYS call first)
- `query_news_data` - Query news data by date range and keywords
- `query_rss_data` - Query RSS feed data
- `get_data_summary` - Get statistics summary
- `list_available_platforms` - List all available news platforms

**Analytics Tools**:
- `analyze_trends` - Analyze keyword trends over time
- `compare_platforms` - Compare keyword frequency across platforms
- `detect_hot_keywords` - Find trending keywords automatically
- `get_sentiment_distribution` - Analyze sentiment patterns

**Search Tools**:
- `search_by_keyword` - Exact keyword search
- `fuzzy_search` - Fuzzy/similar keyword search
- `search_by_platform` - Platform-specific search

**System Tools**:
- `get_system_status` - Check system health and data status
- `manual_crawl` - Trigger manual data crawl
- `sync_to_remote` - Sync data to S3 remote storage

#### Market Analysis MCP Server Tools (trendradar/mcp/)

**Market Data Tools**:
- `get_crypto_prices` - Get current cryptocurrency prices
- `get_stock_indices` - Get current stock market indices
- `get_market_summary` - Get comprehensive market summary
- `get_historical_data` - Query historical market data

## Important Implementation Notes

### When Modifying Storage
- Always update data structures in respective files:
  - News: `core/data.py` (NewsData, RSSData)
  - Market: `storage/market_models.py` (MarketData, CryptoItem, StockItem)
- Update SQLite schema in `storage/local.py::LocalStorage._init_db()`
- Ensure `StorageManager` methods support both local and remote backends
- Test data retention cleanup logic (`_cleanup_old_data()`)

### When Adding MCP Tools
- **News MCP**: Define in `mcp_server/server.py` with `@mcp.tool` decorator
- **Market MCP**: Define in `trendradar/mcp/market_analysis.py` with `@mcp.tool` decorator
- Implement business logic in appropriate service file (`tools/` directory)
- Add comprehensive docstring with Args/Returns/Examples
- Update tool list in `run_server()` startup message
- For date-sensitive tools, document the `resolve_date_range` workflow

### When Adding Notification Channels
- Implement sender in `notification/senders.py`
- For market notifications, add renderer in `notification/market_renderer.py`
- Register in `NotificationDispatcher._init_senders()`
- Add config validation in `core/config.py`
- Test batch splitting for large content
- Verify rate limiting and error handling

### When Adding Market Data Sources
- Create new fetcher in `trendradar/crawler/` (e.g., crypto.py, stocks.py)
- Define data model in `storage/market_models.py`
- Update storage schema in `storage/local.py`
- Add configuration section in `config/market_config.yaml`
- Update dashboard HTML renderer in `report/dashboard_html.py`
- Add corresponding MCP tools in `trendradar/mcp/market_analysis.py`

### When Working with Frontend (blog-nextjs)
- **API Routes**: Place in `src/app/api/` following Next.js conventions
- **Components**: Create reusable components in `src/components/`
- **Styling**: Use Tailwind CSS utilities, extend in `tailwind.config.js`
- **Data Fetching**:
  - Use SWR for client-side caching
  - Use Server Components for initial data
  - Integrate with Supabase for backend data
- **Charts**: Use ECharts (echarts-for-react) for market visualizations
- **Environment Variables**: Store in `.env.local` (not committed)

### Time Zone Handling
- All time operations go through `AppContext.get_time()` which uses configured timezone
- Storage always uses local timezone for folder/file naming
- Push window checks respect configured timezone
- RSS freshness filtering uses configured timezone
- Market data timestamps stored in UTC, displayed in local timezone

### GitHub Actions Integration

#### News Crawler Workflow (`.github/workflows/crawler.yml`)
- **Schedule**: Runs hourly at minute 33 (`cron: "33 * * * *"`)
- **Trial Mode**: 7-day cycle with check-in requirement (see workflow comments)
- **Environment**: Sets `GITHUB_ACTIONS=true` to disable browser opening and proxies
- **Deployment**: Automatically deploys HTML reports to GitHub Pages
- **Concurrency**: Only one crawler instance runs at a time

#### Market Dashboard Workflow (`.github/workflows/market_dashboard.yml`)
- **Schedule**: Runs daily at midnight Beijing time (`cron: "18 16 * * *"` = UTC 16:18)
- **Steps**:
  1. Fetch market data (crypto + stocks)
  2. Generate AI analysis (Claude API)
  3. Render dashboard HTML
  4. Deploy to `docs/` folder
  5. Commit and push to master branch
- **Artifacts**: Uploads SQLite database and HTML files
- **GitHub Pages**: Dashboard accessible at `https://<username>.github.io/<repo-name>/`

#### Docker Workflow (`.github/workflows/docker.yml`)
- Builds and publishes Docker images to container registry
- Triggered on releases or manual dispatch

### API Keys and Secrets Management
- **Never commit secrets** to the repository
- Store in GitHub Secrets for Actions workflows
- Use environment variables for local development
- Required secrets:
  - `ANTHROPIC_API_KEY` - Claude API for market analysis
  - `FEISHU_WEBHOOK_URL` - Feishu notifications
  - `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` - Telegram notifications
  - `EMAIL_FROM` / `EMAIL_PASSWORD` / `EMAIL_TO` - Email notifications

### Performance Considerations
- **Rate Limiting**:
  - CoinGecko API: Free tier allows 10-30 calls/minute
  - yfinance: Reasonable rate limits, add delays between requests
  - Claude API: Monitor token usage and costs
- **Caching**:
  - MCP server uses `cache_service.py` for query result caching
  - Frontend uses SWR for client-side caching
- **Batch Operations**: Use batch notification sending to avoid spam
- **Database Optimization**:
  - Index frequently queried columns (timestamp, symbol)
  - Regular cleanup of old data (retention policy)

### Error Handling Best Practices
- **Graceful Degradation**: If one data source fails, continue with others
- **Retry Logic**: Implement exponential backoff for network requests
- **Logging**: Use structured logging with timestamps and error context
- **User Feedback**: Provide clear error messages in notifications
- **Health Checks**: Use MCP `get_system_status` to monitor data freshness

### Testing Guidelines
- **Unit Tests**: Test individual fetchers, parsers, and utilities
- **Integration Tests**: Test full workflows (crawl → store → analyze → notify)
- **Manual Testing**:
  - `test_feishu_card.py` - Test Feishu card rendering
  - `test_market_storage.py` - Test market data storage
  - `test_claude_analyzer.py` - Test Claude API integration
  - `test_full_integration.py` - End-to-end test

### Common Debugging Scenarios

#### Issue: Market Data Not Updating
1. Check GitHub Actions workflow status
2. Verify API keys are set in GitHub Secrets
3. Check rate limiting (CoinGecko, yfinance)
4. Review logs in Actions workflow output
5. Test locally: `python -m trendradar.market_dashboard`

#### Issue: MCP Server Connection Failed
1. Verify FastMCP version compatibility (>=2.12.0)
2. Check port availability (default: stdio mode)
3. For HTTP mode, ensure host/port are accessible
4. Review server logs for startup errors
5. Test with: `trendradar-mcp --help`

#### Issue: Notification Not Sent
1. Verify webhook URLs in config/environment
2. Check push window configuration
3. Review notification dispatcher logs
4. Test individual senders with test scripts
5. Verify message size (may need splitting)

#### Issue: Frontend Not Loading Data
1. Check API routes in `src/app/api/`
2. Verify Supabase connection (if used)
3. Check CORS settings for API calls
4. Review browser console for errors
5. Ensure data files are in correct location (`output/`)

## Project Versioning

Current version: **4.6.0** (from pyproject.toml)

Version format: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes to API or data format
- MINOR: New features, backward compatible
- PATCH: Bug fixes, minor improvements

## Useful Resources

- **Project Repository**: Check README.md for latest setup instructions
- **MCP Documentation**: https://modelcontextprotocol.io/
- **FastMCP GitHub**: https://github.com/jlowin/fastmcp
- **Next.js Documentation**: https://nextjs.org/docs
- **CoinGecko API**: https://www.coingecko.com/en/api/documentation
- **yfinance Documentation**: https://pypi.org/project/yfinance/

## Quick Start for AI Assistants

When asked to work on this codebase:

1. **Understand the request**: Is it about news aggregation, market dashboard, frontend, or MCP server?
2. **Check relevant config**: Review config.yaml or market_config.yaml
3. **Locate the module**: Use the architecture diagram to find relevant files
4. **Read existing code**: Always read files before suggesting changes
5. **Test changes**: Suggest appropriate test commands
6. **Update docs**: If adding features, update this CLAUDE.md file

### Common Tasks Map

| Task | Start Here |
|------|------------|
| Add news platform | `trendradar/crawler/fetcher.py` |
| Add cryptocurrency | `trendradar/crawler/crypto.py` + `config/market_config.yaml` |
| Add stock index | `trendradar/crawler/stocks.py` + `config/market_config.yaml` |
| Add notification channel | `trendradar/notification/senders.py` |
| Add MCP tool (news) | `mcp_server/server.py` + `mcp_server/tools/` |
| Add MCP tool (market) | `trendradar/mcp/market_analysis.py` |
| Modify HTML report | `trendradar/report/html.py` or `dashboard_html.py` |
| Add frontend page | `blog-nextjs/src/app/` |
| Change schedule | `.github/workflows/crawler.yml` or `market_dashboard.yml` |
| Adjust storage | `trendradar/storage/local.py` or `remote.py` |

---

*This documentation is maintained for Claude Code and other AI assistants. For human-readable documentation, see README.md*
