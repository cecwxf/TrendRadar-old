# 📈 TrendRadar 金融市场仪表盘

> 实时追踪加密货币、全球股市，AI智能分析，自动推送通知

## ✨ 功能特性

### 📊 数据源
- **加密货币**：BTC、ETH 实时价格（CoinGecko API）
- **美股**：标普500、纳斯达克、道琼斯指数
- **港股**：恒生指数
- **A股**：上证指数、深证成指、创业板指
- **社交媒体**：硅谷王川 Twitter 推文（RSS）

### 🤖 AI 分析
- Claude API 智能分析市场趋势
- 识别关键变化和投资机会
- 提供风险提示和投资建议

### 📱 通知推送
- 飞书 Rich Card 格式通知
- 支持钉钉、企业微信、Telegram等
- 可配置推送时间窗口和触发条件

### 🎨 可视化仪表盘
- ECharts 交互式图表
- 24小时价格走势
- 暗色主题设计
- 响应式布局，支持移动设备

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/TrendRadar.git
cd TrendRadar
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置文件

编辑 `config/market_config.yaml`：

```yaml
# 修改你的 GitHub 仓库
dashboard:
  github_pages:
    repository: "your-username/TrendRadar"

# 配置通知渠道
notification:
  channels:
    feishu:
      webhook_url: "https://open.feishu.cn/open-apis/bot/v2/hook/..."
```

### 4. 本地测试

```bash
# 运行完整集成测试
python3 test_full_integration.py

# 查看生成的仪表盘
open output/dashboard/index.html
```

## 🔧 GitHub Actions 部署

### 1. 配置 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 | 必需 |
|------------|------|------|
| `ANTHROPIC_API_KEY` | Claude API 密钥 | 推荐 |
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook | 可选 |

### 2. 启用 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 `gh-pages` 分支
3. 保存后等待部署完成

### 3. 访问仪表盘

部署成功后访问：
```
https://your-username.github.io/TrendRadar
```

### 4. 自动更新

工作流每小时自动运行一次，无需手动操作。

## 📁 项目结构

```
TrendRadar/
├── trendradar/
│   ├── crawler/
│   │   ├── crypto.py          # 加密货币数据爬虫
│   │   └── stocks.py           # 股票数据爬虫
│   ├── storage/
│   │   ├── market_models.py    # 数据模型
│   │   ├── market_schema.sql   # 数据库表结构
│   │   └── local.py            # SQLite 存储
│   ├── analysis/
│   │   └── claude_analyzer.py  # Claude AI 分析
│   ├── report/
│   │   └── dashboard_html.py   # HTML 仪表盘生成
│   ├── notification/
│   │   └── market_renderer.py  # 飞书卡片渲染
│   ├── mcp/
│   │   └── market_analysis.py  # MCP Server（可选）
│   └── market_dashboard.py     # 主程序
├── config/
│   └── market_config.yaml      # 配置文件
├── .github/workflows/
│   └── market_dashboard.yml    # GitHub Actions 工作流
└── output/
    ├── market/                 # SQLite 数据库
    ├── dashboard/              # HTML 仪表盘
    └── feishu/                 # 飞书通知记录
```

## 🎯 核心组件

### 数据获取

**CryptoFetcher** (`crypto.py`)
- CoinGecko API 免费接口
- 支持 BTC、ETH 实时价格
- 24小时价格变化和成交量

**StockFetcher** (`stocks.py`)
- Yahoo Finance API
- 支持全球主要股票指数
- 可扩展自定义股票列表

### 数据存储

**LocalStorageBackend** (`local.py`)
- SQLite 数据库存储
- 价格历史数据积累
- 支持查询和分析

### AI 分析

**ClaudeMarketAnalyzer** (`claude_analyzer.py`)
- 使用 Claude Sonnet 4.5
- 市场概况、趋势识别
- 投资建议和风险提示

### 可视化

**render_dashboard_html** (`dashboard_html.py`)
- ECharts 5.x 图表库
- 24小时价格走势
- 响应式设计

## 🔌 MCP Server（可选）

提供 7 个市场分析工具供 Claude 使用：

```bash
# 启动 MCP Server
python -m trendradar.mcp.market_analysis
```

**可用工具**：
- `get_crypto_prices` - 获取加密货币价格
- `get_stock_prices` - 获取股票价格
- `get_market_summary` - 市场数据汇总
- `get_price_history` - 价格历史数据
- `calculate_volatility` - 计算波动率
- `compare_performance` - 资产表现对比
- `get_market_sentiment` - 市场情绪分析

## 📊 数据说明

### 价格历史积累

首次运行时历史数据为空，随着每小时更新：
- **1小时后**：开始有价格变化数据
- **24小时后**：可显示完整日线图
- **7天后**：可分析周趋势

### API 限制

- **CoinGecko Free**：50 calls/min（已足够）
- **Yahoo Finance**：无官方限制
- **Claude API**：按 Token 计费，约 $0.01/次分析

## ⚙️ 高级配置

### 自定义股票

编辑 `config/market_config.yaml`：

```yaml
market:
  stocks:
    custom_stocks:
      - symbol: "AAPL"
        name: "Apple"
        market: "US"
        enabled: true
```

### 推送条件

```yaml
notification:
  triggers:
    price_change_threshold: 5.0    # 价格变动超过5%时推送
    always_push: false              # 仅在触发条件时推送
```

### AI 分析选项

```yaml
ai_analysis:
  options:
    include_investment_advice: true   # 包含投资建议
    include_risk_warning: true        # 包含风险提示
```

## 🛠️ 开发指南

### 运行测试

```bash
# 测试市场数据存储
python3 test_market_storage.py

# 测试仪表盘生成
python3 test_dashboard.py

# 测试 Claude 分析
python3 test_claude_analyzer.py

# 测试飞书卡片
python3 test_feishu_card.py

# 完整集成测试
python3 test_full_integration.py
```

### 添加新数据源

1. 在 `trendradar/crawler/` 创建新爬虫
2. 在 `market_models.py` 定义数据模型
3. 更新 `market_dashboard.py` 集成新数据源
4. 修改 `dashboard_html.py` 添加可视化

## 📝 TODO

- [ ] 实现 RSS 数据集成（硅谷王川推文）
- [ ] 添加更多加密货币支持
- [ ] 支持自定义技术指标
- [ ] 添加价格预警功能
- [ ] 优化移动端体验

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## ⚠️ 免责声明

本项目仅用于技术学习和数据展示，不构成任何投资建议。投资有风险，决策需谨慎。

---

**由 TrendRadar 提供支持** | [GitHub](https://github.com/your-username/TrendRadar)
