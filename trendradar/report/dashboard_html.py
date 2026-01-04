# coding=utf-8
"""
金融仪表盘 HTML 渲染模块

生成带 ECharts 图表的金融市场仪表盘
"""

from datetime import datetime
from typing import Dict, List, Optional
from trendradar.storage.market_models import MarketData, CryptoItem, StockItem
from trendradar.storage.base import RSSData


def render_dashboard_html(
    market_data: MarketData,
    price_history: Dict[str, Dict[str, List[Dict]]],
    ai_insights: Optional[str] = None,
    rss_data: Optional[RSSData] = None,
) -> str:
    """
    渲染金融仪表盘 HTML

    Args:
        market_data: 市场数据（加密货币 + 股票）
        price_history: 多时间范围价格历史数据
            格式: {
                "24h": {"BTC": [{"timestamp": "...", "price": 123.0}, ...], ...},
                "7d": {...},
                "30d": {...},
                "1y": {...}
            }
        ai_insights: AI 分析结果（可选）
        rss_data: RSS 数据（可选，显示推文）

    Returns:
        渲染后的 HTML 字符串
    """

    # 处理旧格式兼容（如果传入的是简单dict，转换为新格式）
    if price_history and not any(isinstance(v, dict) for v in price_history.values()):
        # 旧格式: {"BTC": [...], "ETH": [...]}
        # 转换为新格式
        price_history = {"24h": price_history, "7d": {}, "30d": {}, "1y": {}}

    # 生成 ECharts 配置（多时间范围）
    charts_config = _generate_charts_config(price_history)

    # 生成加密货币卡片
    crypto_cards = _generate_crypto_cards(market_data.crypto_items)

    # 生成股票卡片
    stock_cards = _generate_stock_cards(market_data.stock_items)

    # 生成 AI 分析区域
    ai_section = _generate_ai_section(ai_insights) if ai_insights else ""

    # 生成 RSS 推文区域
    rss_section = _generate_rss_section(rss_data) if rss_data else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>敬湛飞轮精选 - {market_data.date}</title>
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * {{ box-sizing: border-box; }}
            body {{
                font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                margin: 0;
                padding: 0;
                background: #f5f7fa;
                color: #1f2937;
                line-height: 1.6;
                min-height: 100vh;
            }}

            .container {{
                max-width: 1400px;
                margin: 0 auto;
                padding: 0;
            }}

            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                color: white;
                padding: 48px 32px 32px;
                text-align: center;
                border-radius: 0;
                margin-bottom: 32px;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
            }}

            .header h1 {{
                margin: 0 0 12px 0;
                font-size: 42px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }}

            .header .subtitle {{
                font-size: 17px;
                opacity: 0.92;
                font-weight: 400;
            }}

            .section {{
                background: transparent;
                padding: 24px 32px;
                margin-bottom: 24px;
            }}

            .section-title {{
                font-size: 24px;
                font-weight: 700;
                margin: 0 0 24px 0;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }}

            /* 板块分类样式 */
            .crypto-category, .stock-category {{
                margin-bottom: 32px;
            }}

            .category-title {{
                font-size: 20px;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #374151;
                display: flex;
                align-items: center;
                gap: 10px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e5e7eb;
            }}

            .card-name {{
                font-size: 13px;
                color: #6b7280;
                font-weight: 500;
            }}

            .card-ticker {{
                font-size: 12px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 3px 8px;
                border-radius: 6px;
                font-weight: 500;
            }}

            .cards-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }}

            .card {{
                background: white;
                border-radius: 16px;
                padding: 24px;
                border: 1px solid #e5e7eb;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
            }}

            .card:hover {{
                border-color: #667eea;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15), 0 4px 8px rgba(102, 126, 234, 0.1);
                transform: translateY(-4px);
            }}

            .card-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }}

            .card-symbol {{
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }}

            .card-exchange {{
                font-size: 13px;
                color: white;
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                padding: 4px 12px;
                border-radius: 8px;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);
            }}

            .card-price {{
                font-size: 36px;
                font-weight: 700;
                margin: 12px 0;
                color: #1f2937;
                letter-spacing: -1px;
            }}

            .card-change {{
                font-size: 17px;
                font-weight: 600;
                padding: 6px 14px;
                border-radius: 8px;
                display: inline-block;
            }}

            .card-change.positive {{
                color: white;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
            }}

            .card-change.negative {{
                color: white;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
            }}

            .card-volume {{
                font-size: 14px;
                color: #6b7280;
                margin-top: 14px;
                padding: 8px 12px;
                background: #f9fafb;
                border-radius: 8px;
                font-weight: 500;
            }}

            .chart-container {{
                width: 100%;
                height: 400px;
                margin-bottom: 20px;
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
            }}

            .ai-insights {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 32px;
                margin: 24px 32px;
                border: none;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
            }}

            .ai-insights h3 {{
                margin: 0 0 20px 0;
                font-size: 24px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
            }}

            .ai-insights .content {{
                color: rgba(255, 255, 255, 0.95);
                line-height: 1.8;
                white-space: pre-wrap;
                font-size: 15px;
            }}

            .rss-feed {{
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
            }}

            .rss-item {{
                background: #f9fafb;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
                border-left: 4px solid #10b981;
                transition: all 0.2s ease;
            }}

            .rss-item:hover {{
                background: #f3f4f6;
                transform: translateX(4px);
                border-left-color: #059669;
            }}

            .rss-item .title {{
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 10px;
                line-height: 1.6;
            }}

            .rss-item .title a {{
                color: #1f2937;
                text-decoration: none;
                transition: color 0.2s ease;
            }}

            .rss-item .title a:hover {{
                color: #667eea;
            }}

            .rss-item .meta {{
                font-size: 13px;
                color: #6b7280;
                font-weight: 500;
            }}

            .rss-item .summary {{
                font-size: 14px;
                color: #6b7280;
                margin-top: 10px;
                line-height: 1.7;
            }}

            .time-range-tabs {{
                display: flex;
                gap: 8px;
                margin-bottom: 24px;
                padding: 6px;
                background: white;
                border-radius: 12px;
                overflow-x: auto;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }}

            .time-range-tab {{
                padding: 10px 24px;
                border: none;
                background: transparent;
                color: #6b7280;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                white-space: nowrap;
            }}

            .time-range-tab:hover {{
                background: #f3f4f6;
                color: #1f2937;
            }}

            .time-range-tab.active {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }}

            .timestamp {{
                text-align: center;
                color: #9ca3af;
                font-size: 14px;
                margin-top: 48px;
                padding: 24px;
                font-weight: 500;
            }}

            @media (max-width: 768px) {{
                .container {{
                    padding: 0;
                }}

                .section {{
                    padding: 20px 16px;
                }}

                .header {{
                    padding: 36px 24px 24px;
                    border-radius: 0;
                }}

                .header h1 {{
                    font-size: 32px;
                }}

                .header .subtitle {{
                    font-size: 15px;
                }}

                .section-title {{
                    font-size: 20px;
                }}

                .category-title {{
                    font-size: 18px;
                }}

                .cards-grid {{
                    grid-template-columns: 1fr;
                    gap: 16px;
                }}

                .card {{
                    padding: 20px;
                }}

                .card-price {{
                    font-size: 28px;
                }}

                .chart-container {{
                    height: 300px;
                    padding: 16px;
                }}

                .ai-insights {{
                    margin: 24px 16px;
                    padding: 24px;
                }}

                .time-range-tabs {{
                    padding: 4px;
                }}

                .time-range-tab {{
                    padding: 8px 16px;
                    font-size: 13px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- 头部 -->
            <div class="header">
                <h1>📈 敬湛飞轮精选</h1>
                <div class="subtitle">实时追踪加密货币、股票市场及AI智能分析</div>
            </div>

            <!-- 加密货币部分 -->
            <div class="section">
                <h2 class="section-title">💰 加密货币行情</h2>
                <div class="cards-grid">
                    {crypto_cards}
                </div>
            </div>

            <!-- 股票市场部分 -->
            <div class="section">
                <h2 class="section-title">📊 全球股票指数</h2>
                <div class="cards-grid">
                    {stock_cards}
                </div>
            </div>

            <!-- 价格走势图表 -->
            <div class="section">
                <h2 class="section-title">📉 价格走势</h2>
                {_generate_chart_section(price_history)}
            </div>

            <!-- AI 分析 -->
            {ai_section}

            <!-- RSS 推文 -->
            {rss_section}

            <!-- 时间戳 -->
            <div class="timestamp">
                更新时间: {market_data.date} {market_data.crawl_time} | 数据来源: CoinGecko, Yahoo Finance
            </div>
        </div>

        <script>
            {charts_config}
        </script>
    </body>
    </html>
    """

    return html


def _generate_crypto_cards(crypto_items: Dict[str, CryptoItem]) -> str:
    """生成加密货币卡片 - 按板块分组显示"""

    # 读取配置获取category信息
    from pathlib import Path
    import yaml

    category_map = {}
    try:
        config_path = Path("config/market_config.yaml")
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)
            coins = config.get("market", {}).get("crypto", {}).get("coins", [])
            for coin in coins:
                category_map[coin["symbol"]] = {
                    "name": coin.get("name", coin["symbol"]),
                    "category": coin.get("category", "其他")
                }
    except Exception as e:
        print(f"⚠️  读取crypto category失败: {e}")

    # 按category分组
    categories = {}
    for symbol, item in crypto_items.items():
        cat_info = category_map.get(symbol, {"name": symbol, "category": "其他"})
        category = cat_info["category"]

        if category not in categories:
            categories[category] = []

        categories[category].append((symbol, item, cat_info["name"]))

    # 定义category显示顺序
    category_order = ["主流币", "公链", "DeFi", "NFT", "其他"]
    category_icons = {
        "主流币": "💰",
        "公链": "⛓️",
        "DeFi": "🏦",
        "NFT": "🎨",
        "其他": "📊"
    }

    # 生成HTML（按category分组）
    html_sections = []

    for category in category_order:
        if category not in categories:
            continue

        icon = category_icons.get(category, "📊")
        items = categories[category]

        # Category标题
        section = f"""
        <div class="crypto-category">
            <h3 class="category-title">{icon} {category}</h3>
            <div class="cards-grid">
        """

        # 该category下的所有卡片
        for symbol, item, name in items:
            change_class = "positive" if item.price_change_24h >= 0 else "negative"
            change_sign = "+" if item.price_change_24h >= 0 else ""
            arrow = "▲" if item.price_change_24h >= 0 else "▼"

            card = f"""
            <div class="card">
                <div class="card-header">
                    <span class="card-symbol">{symbol}</span>
                    <span class="card-name">{name}</span>
                </div>
                <div class="card-price">${item.price:,.2f}</div>
                <div class="card-change {change_class}">
                    {arrow} {change_sign}{item.price_change_24h:.2f}%
                </div>
                <div class="card-volume">
                    成交量: ${item.volume_24h:,.0f}
                </div>
            </div>
            """
            section += card

        section += """
            </div>
        </div>
        """
        html_sections.append(section)

    return "\n".join(html_sections)


def _generate_stock_cards(stock_items: Dict[str, StockItem]) -> str:
    """生成股票卡片 - 指数和个股分开显示"""

    # 分类：指数 vs 个股
    indices = {}  # 指数
    stocks_by_market = {"US": [], "HK": [], "CN": []}  # 个股按市场分组

    for symbol, item in stock_items.items():
        # 判断是否为指数（symbol以^开头，或特定格式）
        is_index = (
            symbol.startswith("^") or
            symbol in ["000001.SS", "399001.SZ", "399006.SZ"]  # A股指数
        )

        if is_index:
            indices[symbol] = item
        else:
            market = item.market
            if market in stocks_by_market:
                stocks_by_market[market].append((symbol, item))

    html_sections = []

    # ===== 1. 市场指数区域 =====
    if indices:
        section = """
        <div class="stock-category">
            <h3 class="category-title">📊 市场指数</h3>
            <div class="cards-grid">
        """

        # 按市场排序指数
        market_order = {"US": 0, "HK": 1, "CN": 2}
        sorted_indices = sorted(
            indices.items(),
            key=lambda x: market_order.get(x[1].market, 99)
        )

        for symbol, item in sorted_indices:
            change_class = "positive" if item.change >= 0 else "negative"
            change_sign = "+" if item.change >= 0 else ""
            arrow = "▲" if item.change >= 0 else "▼"
            market_label = {"US": "美股", "HK": "港股", "CN": "A股"}.get(item.market, item.market)

            card = f"""
            <div class="card index-card">
                <div class="card-header">
                    <span class="card-symbol">{item.name}</span>
                    <span class="card-exchange">{market_label}</span>
                </div>
                <div class="card-price">{item.price:,.2f}</div>
                <div class="card-change {change_class}">
                    {arrow} {change_sign}{item.change:.2f} ({change_sign}{item.change_percent:.2f}%)
                </div>
                <div class="card-volume">
                    成交量: {item.volume:,}
                </div>
            </div>
            """
            section += card

        section += """
            </div>
        </div>
        """
        html_sections.append(section)

    # ===== 2. 个股区域 =====
    market_info = {
        "US": {"icon": "🇺🇸", "name": "美股科技股"},
        "HK": {"icon": "🇭🇰", "name": "港股"},
        "CN": {"icon": "🇨🇳", "name": "A股"}
    }

    for market in ["US", "HK", "CN"]:
        items = stocks_by_market[market]
        if not items:
            continue

        info = market_info[market]
        section = f"""
        <div class="stock-category">
            <h3 class="category-title">{info['icon']} {info['name']}</h3>
            <div class="cards-grid">
        """

        for symbol, item in items:
            change_class = "positive" if item.change >= 0 else "negative"
            change_sign = "+" if item.change >= 0 else ""
            arrow = "▲" if item.change >= 0 else "▼"

            card = f"""
            <div class="card stock-card">
                <div class="card-header">
                    <span class="card-symbol">{item.name}</span>
                    <span class="card-ticker">{symbol}</span>
                </div>
                <div class="card-price">${item.price:,.2f}</div>
                <div class="card-change {change_class}">
                    {arrow} {change_sign}{item.change:.2f} ({change_sign}{item.change_percent:.2f}%)
                </div>
                <div class="card-volume">
                    成交量: {item.volume:,}
                </div>
            </div>
            """
            section += card

        section += """
            </div>
        </div>
        """
        html_sections.append(section)

    return "\n".join(html_sections)


def _generate_chart_section(price_history: Dict[str, Dict[str, List[Dict]]]) -> str:
    """生成图表区域（包含时间范围选择器）"""
    # 获取所有资产符号（从24h数据中获取）
    symbols = list(price_history.get("24h", {}).keys())
    if not symbols:
        return "<p style='text-align: center; color: #94a3b8;'>暂无历史数据</p>"

    # 生成时间范围选择器
    time_ranges = [
        ("24h", "24小时"),
        ("7d", "7天"),
        ("30d", "30天"),
        ("1y", "1年")
    ]

    tabs_html = '<div class="time-range-tabs">'
    for range_key, range_label in time_ranges:
        active_class = ' active' if range_key == "24h" else ''
        tabs_html += f'<button class="time-range-tab{active_class}" data-range="{range_key}">{range_label}</button>'
    tabs_html += '</div>'

    # 生成图表容器（每个符号一个容器）
    containers = []
    for symbol in symbols:
        containers.append(f'<div id="chart-{symbol}" class="chart-container"></div>')

    return tabs_html + "\n".join(containers)


def _generate_charts_config(price_history: Dict[str, Dict[str, List[Dict]]]) -> str:
    """生成 ECharts 配置 JavaScript（支持多时间范围）"""
    # 存储所有时间范围的数据
    all_data = {}

    # 为每个符号准备所有时间范围的数据
    for range_key, range_data in price_history.items():
        for symbol, history in range_data.items():
            if symbol not in all_data:
                all_data[symbol] = {}

            if not history:
                all_data[symbol][range_key] = {"timestamps": [], "prices": []}
                continue

            # 提取时间和价格数据（根据时间范围调整格式）
            if range_key == "24h":
                # 24小时: 显示 HH:MM
                timestamps = [item["timestamp"].split("T")[1][:5] if "T" in item["timestamp"] else item["timestamp"][-8:-3] for item in history]
            elif range_key == "7d":
                # 7天: 显示 MM-DD HH:MM
                timestamps = [item["timestamp"][5:16].replace("T", " ") if "T" in item["timestamp"] else item["timestamp"][5:16] for item in history]
            elif range_key == "30d":
                # 30天: 显示 MM-DD
                timestamps = [item["timestamp"][:10][5:] if len(item["timestamp"]) >= 10 else item["timestamp"][:5] for item in history]
            else:  # 1y
                # 1年: 显示 YYYY-MM-DD
                timestamps = [item["timestamp"][:10] if len(item["timestamp"]) >= 10 else item["timestamp"] for item in history]

            prices = [item["price"] for item in history]
            all_data[symbol][range_key] = {"timestamps": timestamps, "prices": prices}

    # 生成图表初始化代码
    charts_js = []

    for symbol, range_data in all_data.items():
        chart_js = f"""
        (function() {{
            var chartDom = document.getElementById('chart-{symbol}');
            if (!chartDom) return;

            var myChart = echarts.init(chartDom);

            // 所有时间范围的数据
            var chartData = {str(range_data).replace("'", '"')};

            // 当前显示的时间范围
            var currentRange = '24h';

            // 更新图表函数
            function updateChart(range) {{
                currentRange = range;
                var data = chartData[range];

                if (!data || data.timestamps.length === 0) {{
                    console.warn('No data for', '{symbol}', range);
                    return;
                }}

                var option = {{
                    title: {{
                        text: '{symbol} 价格走势',
                        textStyle: {{
                            color: '#1f2937',
                            fontSize: 18,
                            fontWeight: 700
                        }},
                        left: '20px'
                    }},
                    tooltip: {{
                        trigger: 'axis',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: '#667eea',
                        borderWidth: 2,
                        textStyle: {{
                            color: '#1f2937'
                        }},
                        formatter: function(params) {{
                            var param = params[0];
                            return param.name + '<br/>' +
                                   '<span style="color:#667eea;">●</span> ' +
                                   '<b>$' + param.value.toFixed(2) + '</b>';
                        }},
                        shadowColor: 'rgba(0, 0, 0, 0.1)',
                        shadowBlur: 10
                    }},
                    grid: {{
                        left: '50px',
                        right: '50px',
                        top: '60px',
                        bottom: '50px',
                        containLabel: true
                    }},
                    xAxis: {{
                        type: 'category',
                        data: data.timestamps,
                        axisLine: {{
                            lineStyle: {{ color: '#e5e7eb' }}
                        }},
                        axisLabel: {{
                            color: '#6b7280',
                            fontSize: 12,
                            fontWeight: 500,
                            rotate: range === '1y' || range === '30d' ? 45 : 0
                        }}
                    }},
                    yAxis: {{
                        type: 'value',
                        axisLine: {{
                            lineStyle: {{ color: '#e5e7eb' }}
                        }},
                        splitLine: {{
                            lineStyle: {{ color: '#f3f4f6', type: 'solid' }}
                        }},
                        axisLabel: {{
                            color: '#6b7280',
                            fontSize: 12,
                            fontWeight: 500,
                            formatter: function(value) {{
                                return '$' + value.toFixed(0);
                            }}
                        }}
                    }},
                    series: [{{
                        name: '{symbol}',
                        type: 'line',
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: range === '24h' ? 7 : 5,
                        lineStyle: {{
                            color: '#667eea',
                            width: 3
                        }},
                        itemStyle: {{
                            color: '#667eea',
                            borderColor: '#ffffff',
                            borderWidth: 3
                        }},
                        areaStyle: {{
                            color: {{
                                type: 'linear',
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    {{ offset: 0, color: 'rgba(102, 126, 234, 0.25)' }},
                                    {{ offset: 1, color: 'rgba(102, 126, 234, 0.02)' }}
                                ]
                            }}
                        }},
                        data: data.prices
                    }}]
                }};
                myChart.setOption(option);
            }}

            // 初始化显示24小时数据
            updateChart('24h');

            // 响应式
            window.addEventListener('resize', function() {{
                myChart.resize();
            }});

            // 将更新函数存储到全局，供时间范围切换按钮调用
            window.updateChart_{symbol.replace("^", "").replace(".", "_")} = updateChart;
        }})();
        """
        charts_js.append(chart_js)

    # 添加时间范围切换逻辑
    switch_js = """
    // 时间范围切换
    document.addEventListener('DOMContentLoaded', function() {
        var tabs = document.querySelectorAll('.time-range-tab');

        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                // 更新选中状态
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // 获取选中的时间范围
                var range = this.dataset.range;

                // 更新所有图表
                Object.keys(window).forEach(function(key) {
                    if (key.startsWith('updateChart_')) {
                        window[key](range);
                    }
                });
            });
        });
    });
    """

    return "\n".join(charts_js) + "\n" + switch_js


def _generate_ai_section(ai_insights: str) -> str:
    """生成 AI 分析区域"""
    return f"""
    <div class="ai-insights">
        <h3>
            <span>🤖</span>
            <span>AI 智能分析</span>
        </h3>
        <div class="content">{ai_insights}</div>
    </div>
    """


def _generate_rss_section(rss_data: RSSData) -> str:
    """生成 RSS 推文区域"""
    items_html = []

    for feed_id, items in rss_data.items.items():
        feed_name = rss_data.id_to_name.get(feed_id, feed_id)

        for item in items[:10]:  # 只显示最新10条
            item_html = f"""
            <div class="rss-item">
                <div class="title">
                    <a href="{item.url}" target="_blank">
                        {item.title}
                    </a>
                </div>
                <div class="meta">
                    {item.author if item.author else feed_name} · {item.published_at}
                </div>
                {f'<div class="summary">{item.summary}</div>' if item.summary else ''}
            </div>
            """
            items_html.append(item_html)

    return f"""
    <div class="section">
        <h2 class="section-title">🐦 硅谷王川推文</h2>
        <div class="rss-feed">
            {"".join(items_html)}
        </div>
    </div>
    """
