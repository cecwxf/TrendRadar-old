# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TrendRadar** is a two-part project:

1. **Python Backend** — News aggregation and analysis tool:
   - Crawls hot topics from multiple Chinese news platforms (Weibo, Zhihu, Douyin, Baidu, etc.)
   - RSS feed monitoring, keyword filtering, frequency analysis
   - Multi-channel notifications (WeChat, Telegram, Email, Feishu, DingTalk, etc.)
   - MCP (Model Context Protocol) server for AI-powered analysis
   - Local and remote (S3-compatible) storage backends

2. **Next.js Frontend** (`blog-nextjs/`) — Blog + market dashboard:
   - Notion CMS-backed blog with markdown rendering
   - Real-time crypto & stock market data (Supabase + ECharts)
   - AI news dock (right sidebar) aggregating RSS from LLM/Agent/AI chip sources
   - Dark mode by default, Giscus comments, Vercel Speed Insights

## Development Commands

### Python Backend

```bash
# Install & run
pip install -e .
python -m trendradar

# MCP server
trendradar-mcp
trendradar-mcp --transport http --host 0.0.0.0 --port 3333

# Docker
docker build -t trendradar .
docker run -d --name trendradar \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/output:/app/output \
  trendradar
```

### Next.js Frontend (`blog-nextjs/`)

```bash
cd blog-nextjs
cp .env.example .env.local  # fill in NOTION_TOKEN, NOTION_DATABASE_ID, etc.
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint    # ESLint
```

Required env vars: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GISCUS_*` (4 vars).
Optional: `NEXT_PUBLIC_SUPABASE_*` (market data), `CRON_SECRET` (market cron).

## Code Architecture

### High-Level Structure

The project follows a modular architecture with clear separation of concerns:

```
trendradar/              # Main application package
├── __main__.py          # Entry point: NewsAnalyzer orchestrates the workflow
├── context.py           # AppContext: encapsulates all config-dependent operations
├── core/                # Core business logic
│   ├── config.py        # Configuration loading
│   ├── loader.py        # Data loading utilities
│   ├── analyzer.py      # Keyword frequency analysis
│   ├── frequency.py     # Word matching logic
│   └── data.py          # Data structures (NewsData, RSSData)
├── crawler/             # Data fetching layer
│   ├── fetcher.py       # Platform crawling (via newsnow API)
│   └── rss/             # RSS feed handling
├── storage/             # Storage abstraction layer
│   ├── base.py          # StorageBackend interface
│   ├── local.py         # Local file storage
│   ├── remote.py        # S3-compatible remote storage
│   └── manager.py       # StorageManager: unified storage access
├── report/              # Report generation
│   ├── generator.py     # HTML report orchestration
│   ├── html.py          # HTML rendering
│   └── formatter.py     # Data formatting
└── notification/        # Notification dispatch
    ├── dispatcher.py    # Multi-channel notification dispatcher
    ├── senders.py       # Individual channel senders
    └── batch.py         # Batch notification handling

mcp_server/              # MCP server for AI analysis
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
- Data stored in standardized `NewsData` and `RSSData` formats

#### 3. Three Report Modes
The analyzer supports three operating modes (`REPORT_MODE` in config):
- **incremental**: Only reports new news items (no push if nothing new)
- **current**: Shows current trending news + new items section (periodic push)
- **daily**: Daily summary of all matched news (scheduled push)

Mode strategy is defined in `NewsAnalyzer.MODE_STRATEGIES` and executed via `_execute_mode_strategy()`

#### 4. MCP Server Architecture
- Built with **FastMCP 2.0** for production-grade MCP tool serving
- 20+ tools organized by category (data query, analytics, search, config, system)
- **Important**: Always call `resolve_date_range` first for natural language dates ("本周", "最近7天") before other tools
- Tools use singleton pattern for service instances (`_get_tools()`)

### Data Flow

1. **Crawling**: `DataFetcher` → fetches from newsnow API → `NewsData`
2. **Storage**: `NewsData` → `StorageManager.save_news_data()` → SQLite/S3
3. **Analysis**: Load via `AppContext.read_today_titles()` → `count_word_frequency()` → stats
4. **Reporting**: stats → `generate_html_report()` → HTML file
5. **Notification**: stats → `NotificationDispatcher.dispatch_all()` → multi-channel push

### Configuration System

- **Main config**: `config/config.yaml` (platforms, keywords, notification channels, storage)
- **Keyword filtering**: `config/frequency_words.txt` (supports word groups, filters, global filters)
- **Environment overrides**: Many settings support environment variable overrides (e.g., `STORAGE_RETENTION_DAYS`)
- **Config loading**: `trendradar/core/config.py::load_config()` merges YAML + env vars

### Storage Format

- **SQLite schema**: `news` table (title, platform, rank, weight, url, crawl_time, crawl_date) + `rss` table
- **TXT snapshots**: Optional legacy format in `output/YYYY-MM-DD/titles_HH-MM-SS.txt`
- **HTML reports**: Generated in `output/YYYY-MM-DD/html/`
- **Remote storage**: Mirrors local structure in S3 bucket with `YYYY-MM-DD/` prefixes

### Notification System

- **Dispatcher pattern**: `NotificationDispatcher` handles all channels in parallel
- **Supported channels**: Feishu, DingTalk, WeChat Work, Telegram, Email, ntfy, Bark, Slack
- **Batch handling**: Large reports split into batches to avoid API limits
- **Push window control**: Optional time-window restrictions and once-per-day limits
- **Content merging**: Hot news + RSS feeds can be merged into single notification

### Blog-NextJS Frontend Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 3 + Supabase + ECharts

```
blog-nextjs/src/
├── app/
│   ├── layout.tsx              # Root layout: Header + AIDock + Footer + ThemeProvider
│   ├── page.tsx                # Home: Hero + MarketBanner + MarketCharts + PostList
│   ├── article/[slug]/         # Dynamic article pages (Notion content)
│   ├── market/                 # Market dashboard page
│   └── api/
│       ├── ai-news/route.ts    # RSS aggregator for AI Dock (3 categories)
│       ├── market/             # Crypto & stock data endpoints
│       ├── views/[slug]/       # View count tracking
│       └── cron/market/        # Vercel cron for market data refresh
├── components/
│   ├── layout/                 # Header, Footer, AIDock, PageTransition
│   ├── blog/                   # PostCard, SearchBar, Comments, ViewCount, DateArchive
│   ├── market/                 # MarketBanner (ticker), MarketCharts (ECharts), MiniChart
│   ├── theme/                  # ThemeProvider (next-themes), ThemeToggle
│   └── ui/                     # Skeleton loader
├── lib/
│   ├── notion/client.ts        # Notion API: getPosts, getPostBySlug, getCategories
│   ├── notion/renderer.ts      # notion-to-md conversion + reading time
│   ├── market/                 # market-service, crypto-fetcher, stock-fetcher
│   └── supabase/client.ts      # Supabase client init
└── types/                      # blog.ts, market.ts, notion.ts
```

**Key patterns**:
- ISR with `revalidate = 600` on homepage; 1-hour cache on AI news API
- AI Dock (`AIDock.tsx`): right sidebar panel, fetches `/api/ai-news`, tabs for 大模型/Agent/AI芯片
- Market data: Supabase for persistence, Yahoo Finance API for stocks, CoinGecko for crypto
- All layout components accept `lang` prop for i18n (zh/en/vi/de)
- Footer uses Google Favicon API (`google.com/s2/favicons`) for link icons
- Dark mode default via `next-themes` with `defaultTheme="dark"`

## Important Implementation Notes

### When Modifying Storage
- Always update both `NewsData`/`RSSData` structures in `core/data.py`
- Update SQLite schema in `storage/local.py::LocalStorage._init_db()`
- Ensure `StorageManager` methods support both local and remote backends
- Test data retention cleanup logic (`_cleanup_old_data()`)

### When Adding MCP Tools
- Define tool in `mcp_server/server.py` with `@mcp.tool` decorator
- Implement business logic in appropriate service file (`tools/` directory)
- Add comprehensive docstring with Args/Returns/Examples
- Update tool list in `run_server()` startup message
- For date-sensitive tools, document the `resolve_date_range` workflow

### When Adding Notification Channels
- Implement sender in `notification/senders.py`
- Register in `NotificationDispatcher._init_senders()`
- Add config validation in `core/config.py`
- Test batch splitting for large content

### Time Zone Handling
- All time operations go through `AppContext.get_time()` which uses configured timezone
- Storage always uses local timezone for folder/file naming
- Push window checks respect configured timezone
- RSS freshness filtering uses configured timezone

### GitHub Actions Integration
- `GITHUB_ACTIONS=true` environment variable detected automatically
- Actions mode disables browser opening and proxy usage
- Workflow schedule in `.github/workflows/crawler.yml`
- Supports automatic deployment to GitHub Pages

### When Modifying the Blog Frontend
- Layout components (`Header`, `Footer`, `AIDock`) are composed in `blog-nextjs/src/app/layout.tsx`
- AIDock categories are defined in `api/ai-news/route.ts` (`RSS_SOURCES` array) and must match `CATEGORY_ORDER` in `AIDock.tsx`
- i18n translations live inline in each component (`UI_TEXT`, `CATEGORY_LABELS` dictionaries) — there is no centralized i18n framework
- Market data flows: Vercel Cron → `/api/cron/market` → Supabase → `/api/market/latest` → `MarketBanner`/`MarketCharts`
- Notion CMS schema requires properties: Name, slug, Published, Category, Tags, Summary, CoverImage, PublishDate, Pinned
