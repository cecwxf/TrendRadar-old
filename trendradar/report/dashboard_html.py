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
    price_history: Dict[str, List[Dict]],
    ai_insights: Optional[str] = None,
    rss_data: Optional[RSSData] = None,
) -> str:
    """
    渲染金融仪表盘 HTML

    Args:
        market_data: 市场数据（加密货币 + 股票）
        price_history: 价格历史数据 {"BTC": [{"timestamp": "...", "price": 123.0}, ...], ...}
        ai_insights: AI 分析结果（可选）
        rss_data: RSS 数据（可选，显示推文）

    Returns:
        渲染后的 HTML 字符串
    """

    # 生成 ECharts 配置
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
        <title>金融市场仪表盘 - {market_data.date}</title>
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
        <style>
            * {{ box-sizing: border-box; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                margin: 0;
                padding: 0;
                background: #0f172a;
                color: #e2e8f0;
                line-height: 1.6;
            }}

            .container {{
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }}

            .header {{
                background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%);
                color: white;
                padding: 40px 32px;
                text-align: center;
                border-radius: 16px;
                margin-bottom: 32px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }}

            .header h1 {{
                margin: 0 0 12px 0;
                font-size: 36px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }}

            .header .subtitle {{
                font-size: 16px;
                opacity: 0.9;
                font-weight: 400;
            }}

            .section {{
                background: #1e293b;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            }}

            .section-title {{
                font-size: 20px;
                font-weight: 600;
                margin: 0 0 20px 0;
                color: #f1f5f9;
                border-left: 4px solid #3b82f6;
                padding-left: 12px;
            }}

            .cards-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }}

            .card {{
                background: #334155;
                border-radius: 10px;
                padding: 20px;
                border: 1px solid #475569;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }}

            .card:hover {{
                border-color: #3b82f6;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                transform: translateY(-2px);
            }}

            .card-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }}

            .card-symbol {{
                font-size: 18px;
                font-weight: 700;
                color: #f1f5f9;
            }}

            .card-exchange {{
                font-size: 12px;
                color: #94a3b8;
                background: #1e293b;
                padding: 4px 8px;
                border-radius: 4px;
            }}

            .card-price {{
                font-size: 32px;
                font-weight: 700;
                margin: 8px 0;
                color: #f1f5f9;
            }}

            .card-change {{
                font-size: 16px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 6px;
                display: inline-block;
            }}

            .card-change.positive {{
                color: #22c55e;
                background: rgba(34, 197, 94, 0.1);
            }}

            .card-change.negative {{
                color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }}

            .card-volume {{
                font-size: 13px;
                color: #94a3b8;
                margin-top: 12px;
            }}

            .chart-container {{
                width: 100%;
                height: 400px;
                margin-bottom: 16px;
            }}

            .ai-insights {{
                background: linear-gradient(135deg, #1e3a8a 0%, #6b21a8 100%);
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                border: 1px solid #3730a3;
            }}

            .ai-insights h3 {{
                margin: 0 0 16px 0;
                font-size: 20px;
                color: #f1f5f9;
                display: flex;
                align-items: center;
                gap: 8px;
            }}

            .ai-insights .content {{
                color: #e2e8f0;
                line-height: 1.8;
                white-space: pre-wrap;
            }}

            .rss-feed {{
                background: #1e293b;
                border-radius: 12px;
                padding: 24px;
            }}

            .rss-item {{
                background: #334155;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                border-left: 3px solid #3b82f6;
                transition: all 0.2s ease;
            }}

            .rss-item:hover {{
                background: #3f4d63;
                transform: translateX(4px);
            }}

            .rss-item .title {{
                font-size: 16px;
                font-weight: 600;
                color: #f1f5f9;
                margin-bottom: 8px;
            }}

            .rss-item .meta {{
                font-size: 13px;
                color: #94a3b8;
            }}

            .rss-item .summary {{
                font-size: 14px;
                color: #cbd5e1;
                margin-top: 8px;
                line-height: 1.6;
            }}

            .timestamp {{
                text-align: center;
                color: #64748b;
                font-size: 14px;
                margin-top: 32px;
                padding: 16px;
            }}

            @media (max-width: 768px) {{
                .container {{
                    padding: 12px;
                }}

                .header h1 {{
                    font-size: 28px;
                }}

                .cards-grid {{
                    grid-template-columns: 1fr;
                }}

                .chart-container {{
                    height: 300px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- 头部 -->
            <div class="header">
                <h1>📈 金融市场仪表盘</h1>
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
                <h2 class="section-title">📉 价格走势（24小时）</h2>
                {_generate_chart_containers(price_history)}
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
    """生成加密货币卡片"""
    cards = []

    for symbol, item in crypto_items.items():
        change_class = "positive" if item.price_change_24h >= 0 else "negative"
        change_sign = "+" if item.price_change_24h >= 0 else ""
        arrow = "▲" if item.price_change_24h >= 0 else "▼"

        card = f"""
        <div class="card">
            <div class="card-header">
                <span class="card-symbol">{symbol}</span>
                <span class="card-exchange">{item.exchange}</span>
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
        cards.append(card)

    return "\n".join(cards)


def _generate_stock_cards(stock_items: Dict[str, StockItem]) -> str:
    """生成股票卡片"""
    cards = []

    # 按市场分组排序（US -> HK -> CN）
    market_order = {"US": 0, "HK": 1, "CN": 2}
    sorted_items = sorted(
        stock_items.items(),
        key=lambda x: market_order.get(x[1].market, 99)
    )

    for symbol, item in sorted_items:
        change_class = "positive" if item.change >= 0 else "negative"
        change_sign = "+" if item.change >= 0 else ""
        arrow = "▲" if item.change >= 0 else "▼"

        # 市场标签
        market_label = {"US": "美股", "HK": "港股", "CN": "A股"}.get(item.market, item.market)

        card = f"""
        <div class="card">
            <div class="card-header">
                <span class="card-symbol">{item.name}</span>
                <span class="card-exchange">{market_label}</span>
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
        cards.append(card)

    return "\n".join(cards)


def _generate_chart_containers(price_history: Dict[str, List[Dict]]) -> str:
    """生成图表容器"""
    containers = []

    for symbol in price_history.keys():
        container = f'<div id="chart-{symbol}" class="chart-container"></div>'
        containers.append(container)

    return "\n".join(containers)


def _generate_charts_config(price_history: Dict[str, List[Dict]]) -> str:
    """生成 ECharts 配置 JavaScript"""
    charts_js = []

    for symbol, history in price_history.items():
        if not history:
            continue

        # 提取时间和价格数据
        timestamps = [item["timestamp"].split("T")[1][:5] if "T" in item["timestamp"] else item["timestamp"][-8:-3] for item in history]
        prices = [item["price"] for item in history]

        chart_js = f"""
        (function() {{
            var chartDom = document.getElementById('chart-{symbol}');
            if (!chartDom) return;

            var myChart = echarts.init(chartDom);
            var option = {{
                title: {{
                    text: '{symbol} 价格走势',
                    textStyle: {{
                        color: '#f1f5f9',
                        fontSize: 18,
                        fontWeight: 600
                    }},
                    left: '20px'
                }},
                tooltip: {{
                    trigger: 'axis',
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    textStyle: {{
                        color: '#f1f5f9'
                    }},
                    formatter: function(params) {{
                        var param = params[0];
                        return param.name + '<br/>' +
                               '<span style="color:#3b82f6;">●</span> ' +
                               '$' + param.value.toFixed(2);
                    }}
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
                    data: {timestamps},
                    axisLine: {{
                        lineStyle: {{ color: '#475569' }}
                    }},
                    axisLabel: {{
                        color: '#94a3b8',
                        fontSize: 12
                    }}
                }},
                yAxis: {{
                    type: 'value',
                    axisLine: {{
                        lineStyle: {{ color: '#475569' }}
                    }},
                    splitLine: {{
                        lineStyle: {{ color: '#334155', type: 'dashed' }}
                    }},
                    axisLabel: {{
                        color: '#94a3b8',
                        fontSize: 12,
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
                    symbolSize: 6,
                    lineStyle: {{
                        color: '#3b82f6',
                        width: 3
                    }},
                    itemStyle: {{
                        color: '#3b82f6',
                        borderColor: '#60a5fa',
                        borderWidth: 2
                    }},
                    areaStyle: {{
                        color: {{
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                {{ offset: 0, color: 'rgba(59, 130, 246, 0.3)' }},
                                {{ offset: 1, color: 'rgba(59, 130, 246, 0.05)' }}
                            ]
                        }}
                    }},
                    data: {prices}
                }}]
            }};
            myChart.setOption(option);

            // 响应式
            window.addEventListener('resize', function() {{
                myChart.resize();
            }});
        }})();
        """
        charts_js.append(chart_js)

    return "\n".join(charts_js)


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
                    <a href="{item.url}" target="_blank" style="color: #f1f5f9; text-decoration: none;">
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
