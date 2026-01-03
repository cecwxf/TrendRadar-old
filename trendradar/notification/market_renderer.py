# coding=utf-8
"""
市场数据飞书卡片渲染模块

生成飞书 Rich Card 格式的市场数据通知
"""

from typing import Dict, Optional
from datetime import datetime

from trendradar.storage.market_models import MarketData, CryptoItem, StockItem


def render_market_feishu_card(
    market_data: MarketData,
    ai_insights: Optional[str] = None,
    rss_summary: Optional[str] = None
) -> Dict:
    """
    渲染市场数据飞书卡片（Rich Card JSON 格式）

    Args:
        market_data: 市场数据
        ai_insights: AI 分析摘要（可选）
        rss_summary: RSS 推文摘要（可选）

    Returns:
        飞书 Rich Card JSON 对象
    """

    # 构建卡片内容
    elements = []

    # 1. 标题和时间
    elements.append({
        "tag": "markdown",
        "content": f"**📈 金融市场仪表盘**\n\n<font color='grey'>{market_data.date} {market_data.crawl_time}</font>"
    })

    # 2. 分隔线
    elements.append({"tag": "hr"})

    # 3. 加密货币部分
    if market_data.crypto_items:
        crypto_md = _render_crypto_section(market_data.crypto_items)
        elements.append({
            "tag": "markdown",
            "content": crypto_md
        })

    # 4. 股票市场部分
    if market_data.stock_items:
        if market_data.crypto_items:
            elements.append({"tag": "hr"})

        stock_md = _render_stock_section(market_data.stock_items)
        elements.append({
            "tag": "markdown",
            "content": stock_md
        })

    # 5. AI 分析部分
    if ai_insights:
        elements.append({"tag": "hr"})
        elements.append({
            "tag": "markdown",
            "content": f"**🤖 AI 智能分析**\n\n{_truncate_text(ai_insights, 800)}"
        })

    # 6. RSS 推文部分
    if rss_summary:
        elements.append({"tag": "hr"})
        elements.append({
            "tag": "markdown",
            "content": f"**🐦 硅谷王川推文**\n\n{rss_summary}"
        })

    # 7. 底部操作按钮
    elements.append({"tag": "hr"})
    elements.append({
        "tag": "action",
        "actions": [
            {
                "tag": "button",
                "text": {
                    "tag": "plain_text",
                    "content": "查看完整仪表盘"
                },
                "type": "primary",
                "url": "https://your-github-username.github.io/TrendRadar"  # 用户需要替换
            }
        ]
    })

    # 构建完整卡片
    card = {
        "msg_type": "interactive",
        "card": {
            "config": {
                "wide_screen_mode": True
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": "📊 金融市场实时数据"
                },
                "template": "blue"
            },
            "elements": elements
        }
    }

    return card


def _render_crypto_section(crypto_items: Dict[str, CryptoItem]) -> str:
    """渲染加密货币部分"""
    lines = ["**💰 加密货币行情**\n"]

    for symbol, item in crypto_items.items():
        # 判断涨跌
        if item.price_change_24h >= 0:
            color = "green"
            arrow = "📈"
            sign = "+"
        else:
            color = "red"
            arrow = "📉"
            sign = ""

        lines.append(
            f"{arrow} **{symbol}**: ${item.price:,.2f} "
            f"<font color='{color}'>({sign}{item.price_change_24h:.2f}%)</font>"
        )
        lines.append(f"   成交量: ${item.volume_24h:,.0f}")
        lines.append("")

    return "\n".join(lines)


def _render_stock_section(stock_items: Dict[str, StockItem]) -> str:
    """渲染股票市场部分"""

    # 按市场分组
    us_stocks = {}
    hk_stocks = {}
    cn_stocks = {}

    for symbol, item in stock_items.items():
        if item.market == "US":
            us_stocks[symbol] = item
        elif item.market == "HK":
            hk_stocks[symbol] = item
        elif item.market == "CN":
            cn_stocks[symbol] = item

    lines = ["**📊 全球股票指数**\n"]

    # 渲染美股
    if us_stocks:
        lines.append("**美股**")
        for symbol, item in us_stocks.items():
            lines.append(_format_stock_item(item))
        lines.append("")

    # 渲染港股
    if hk_stocks:
        lines.append("**港股**")
        for symbol, item in hk_stocks.items():
            lines.append(_format_stock_item(item))
        lines.append("")

    # 渲染A股
    if cn_stocks:
        lines.append("**A股**")
        for symbol, item in cn_stocks.items():
            lines.append(_format_stock_item(item))
        lines.append("")

    return "\n".join(lines)


def _format_stock_item(item: StockItem) -> str:
    """格式化单个股票条目"""
    if item.change >= 0:
        color = "green"
        arrow = "📈"
        sign = "+"
    else:
        color = "red"
        arrow = "📉"
        sign = ""

    return (
        f"{arrow} **{item.name}**: ${item.price:,.2f} "
        f"<font color='{color}'>({sign}{item.change_percent:.2f}%)</font>"
    )


def _truncate_text(text: str, max_length: int) -> str:
    """截断文本到指定长度"""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def render_market_feishu_text(
    market_data: MarketData,
    ai_insights: Optional[str] = None,
    rss_summary: Optional[str] = None
) -> str:
    """
    渲染市场数据飞书文本（Markdown 格式，简化版）

    用于不支持 Rich Card 的场景

    Args:
        market_data: 市场数据
        ai_insights: AI 分析摘要（可选）
        rss_summary: RSS 推文摘要（可选）

    Returns:
        Markdown 格式的文本内容
    """

    lines = [
        "📈 **金融市场仪表盘**\n",
        f"<font color='grey'>{market_data.date} {market_data.crawl_time}</font>\n",
        "---\n"
    ]

    # 加密货币
    if market_data.crypto_items:
        lines.append(_render_crypto_section(market_data.crypto_items))
        lines.append("\n---\n")

    # 股票
    if market_data.stock_items:
        lines.append(_render_stock_section(market_data.stock_items))
        lines.append("\n---\n")

    # AI 分析
    if ai_insights:
        lines.append("🤖 **AI 智能分析**\n")
        lines.append(_truncate_text(ai_insights, 500))
        lines.append("\n\n---\n")

    # RSS
    if rss_summary:
        lines.append("🐦 **硅谷王川推文**\n")
        lines.append(rss_summary)
        lines.append("\n\n")

    lines.append(f"<font color='grey'>数据来源: CoinGecko, Yahoo Finance</font>")

    return "\n".join(lines)


def render_market_summary(market_data: MarketData) -> str:
    """
    渲染市场数据简要摘要（用于 RSS 标题等）

    Args:
        market_data: 市场数据

    Returns:
        简要文本摘要
    """

    summaries = []

    # 加密货币摘要
    if market_data.crypto_items:
        crypto_gains = sum(1 for item in market_data.crypto_items.values() if item.price_change_24h >= 0)
        crypto_total = len(market_data.crypto_items)

        if crypto_gains == crypto_total:
            summaries.append("加密货币全线上涨")
        elif crypto_gains == 0:
            summaries.append("加密货币全线下跌")
        else:
            summaries.append(f"加密货币涨{crypto_gains}跌{crypto_total - crypto_gains}")

    # 股票摘要
    if market_data.stock_items:
        stock_gains = sum(1 for item in market_data.stock_items.values() if item.change >= 0)
        stock_total = len(market_data.stock_items)

        if stock_gains > stock_total * 0.7:
            summaries.append("股市普遍上涨")
        elif stock_gains < stock_total * 0.3:
            summaries.append("股市普遍下跌")
        else:
            summaries.append("股市涨跌互现")

    if summaries:
        return f"市场快报：{' | '.join(summaries)}"
    else:
        return "市场数据更新"
