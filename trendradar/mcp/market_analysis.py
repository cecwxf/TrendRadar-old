#!/usr/bin/env python3
# coding=utf-8
"""
市场分析 MCP Server

提供市场数据查询和分析工具，供 Claude 使用
"""

import sys
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime, timedelta

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastmcp import FastMCP

from trendradar.crawler.crypto import CryptoFetcher
from trendradar.crawler.stocks import StockFetcher
from trendradar.storage.local import LocalStorageBackend
from trendradar.storage.market_models import MarketData
from trendradar.utils.time import format_date_folder


# 初始化 MCP Server
mcp = FastMCP("TrendRadar Market Analysis")

# 全局存储后端
storage = LocalStorageBackend(
    data_dir="output",
    enable_txt=False,
    enable_html=False,
    timezone="Asia/Shanghai"
)


@mcp.tool()
def get_crypto_prices() -> str:
    """
    获取当前加密货币价格（BTC 和 ETH）

    返回实时的比特币和以太坊价格、24小时涨跌幅和成交量

    Returns:
        JSON 格式的加密货币数据
    """
    try:
        fetcher = CryptoFetcher()
        crypto_items = fetcher.fetch_prices()

        result = []
        for symbol, item in crypto_items.items():
            result.append({
                "symbol": symbol,
                "price": item.price,
                "price_change_24h": item.price_change_24h,
                "volume_24h": item.volume_24h,
                "exchange": item.exchange,
                "timestamp": item.timestamp
            })

        return str(result)

    except Exception as e:
        return f"获取加密货币价格失败: {e}"


@mcp.tool()
def get_stock_prices() -> str:
    """
    获取全球股票指数价格

    返回美股（标普500、纳斯达克、道琼斯）、港股（恒生指数）、
    A股（上证、深证、创业板）的实时数据

    Returns:
        JSON 格式的股票数据
    """
    try:
        fetcher = StockFetcher()
        stock_items = fetcher.fetch_current()

        result = []
        for symbol, item in stock_items.items():
            result.append({
                "symbol": symbol,
                "name": item.name,
                "price": item.price,
                "change": item.change,
                "change_percent": item.change_percent,
                "volume": item.volume,
                "market": item.market,
                "timestamp": item.timestamp
            })

        return str(result)

    except Exception as e:
        return f"获取股票价格失败: {e}"


@mcp.tool()
def get_market_summary() -> str:
    """
    获取市场数据汇总

    返回加密货币和股票市场的完整快照，包括所有资产的当前价格和涨跌幅

    Returns:
        完整的市场数据摘要
    """
    try:
        crypto_fetcher = CryptoFetcher()
        stock_fetcher = StockFetcher()

        crypto_items = crypto_fetcher.fetch_prices()
        stock_items = stock_fetcher.fetch_current()

        summary = {
            "date": format_date_folder(),
            "crypto": {},
            "stocks": {},
            "statistics": {
                "crypto_count": len(crypto_items),
                "stock_count": len(stock_items)
            }
        }

        # 加密货币汇总
        for symbol, item in crypto_items.items():
            summary["crypto"][symbol] = {
                "price": item.price,
                "change_24h": item.price_change_24h,
                "volume_24h": item.volume_24h
            }

        # 股票汇总
        for symbol, item in stock_items.items():
            summary["stocks"][symbol] = {
                "name": item.name,
                "price": item.price,
                "change_percent": item.change_percent,
                "market": item.market
            }

        # 统计数据
        crypto_gains = [item for item in crypto_items.values() if item.price_change_24h >= 0]
        crypto_losses = [item for item in crypto_items.values() if item.price_change_24h < 0]

        stock_gains = [item for item in stock_items.values() if item.change >= 0]
        stock_losses = [item for item in stock_items.values() if item.change < 0]

        summary["statistics"]["crypto_gains"] = len(crypto_gains)
        summary["statistics"]["crypto_losses"] = len(crypto_losses)
        summary["statistics"]["stock_gains"] = len(stock_gains)
        summary["statistics"]["stock_losses"] = len(stock_losses)

        if crypto_gains:
            summary["statistics"]["crypto_avg_gain"] = sum(
                item.price_change_24h for item in crypto_gains
            ) / len(crypto_gains)

        if stock_gains:
            summary["statistics"]["stock_avg_gain"] = sum(
                item.change_percent for item in stock_gains
            ) / len(stock_gains)

        return str(summary)

    except Exception as e:
        return f"获取市场汇总失败: {e}"


@mcp.tool()
def get_price_history(asset_type: str, symbol: str, hours: int = 24) -> str:
    """
    获取资产的价格历史数据

    Args:
        asset_type: 资产类型，"crypto" 或 "stock"
        symbol: 资产符号，如 "BTC", "^GSPC"
        hours: 获取多少小时的历史数据，默认 24 小时

    Returns:
        价格历史数据列表
    """
    try:
        history = storage.get_price_history(
            asset_type=asset_type,
            symbol=symbol,
            hours=hours
        )

        if not history:
            return f"未找到 {asset_type}/{symbol} 的历史数据（可能需要运行一段时间积累数据）"

        return str(history)

    except Exception as e:
        return f"获取价格历史失败: {e}"


@mcp.tool()
def calculate_volatility(asset_type: str, symbol: str, hours: int = 24) -> str:
    """
    计算资产的价格波动率

    Args:
        asset_type: 资产类型，"crypto" 或 "stock"
        symbol: 资产符号
        hours: 计算时间窗口（小时）

    Returns:
        波动率统计数据
    """
    try:
        history = storage.get_price_history(
            asset_type=asset_type,
            symbol=symbol,
            hours=hours
        )

        if not history or len(history) < 2:
            return f"数据不足，无法计算波动率（至少需要 2 个数据点）"

        prices = [item["price"] for item in history]

        # 计算统计数据
        min_price = min(prices)
        max_price = max(prices)
        avg_price = sum(prices) / len(prices)
        price_range = max_price - min_price
        volatility_pct = (price_range / avg_price) * 100

        # 计算价格变化
        first_price = prices[0]
        last_price = prices[-1]
        total_change_pct = ((last_price - first_price) / first_price) * 100

        result = {
            "symbol": symbol,
            "asset_type": asset_type,
            "period_hours": hours,
            "data_points": len(prices),
            "min_price": min_price,
            "max_price": max_price,
            "avg_price": avg_price,
            "current_price": last_price,
            "price_range": price_range,
            "volatility_percent": volatility_pct,
            "total_change_percent": total_change_pct
        }

        return str(result)

    except Exception as e:
        return f"计算波动率失败: {e}"


@mcp.tool()
def compare_performance(symbols: list, asset_type: str = "stock") -> str:
    """
    比较多个资产的表现

    Args:
        symbols: 资产符号列表，如 ["^GSPC", "^IXIC", "^DJI"]
        asset_type: 资产类型，"crypto" 或 "stock"

    Returns:
        资产表现对比数据
    """
    try:
        if asset_type == "crypto":
            fetcher = CryptoFetcher()
            items = fetcher.fetch_prices()
        else:
            fetcher = StockFetcher()
            items = fetcher.fetch_current()

        comparison = []

        for symbol in symbols:
            if symbol in items:
                item = items[symbol]

                if asset_type == "crypto":
                    comparison.append({
                        "symbol": symbol,
                        "price": item.price,
                        "change_percent": item.price_change_24h,
                        "volume": item.volume_24h
                    })
                else:
                    comparison.append({
                        "symbol": symbol,
                        "name": item.name,
                        "price": item.price,
                        "change_percent": item.change_percent,
                        "volume": item.volume
                    })

        # 按涨跌幅排序
        comparison.sort(key=lambda x: x["change_percent"], reverse=True)

        return str(comparison)

    except Exception as e:
        return f"比较资产表现失败: {e}"


@mcp.tool()
def get_market_sentiment() -> str:
    """
    分析当前市场情绪

    基于涨跌幅分布判断市场是看涨、看跌还是中性

    Returns:
        市场情绪分析
    """
    try:
        crypto_fetcher = CryptoFetcher()
        stock_fetcher = StockFetcher()

        crypto_items = crypto_fetcher.fetch_prices()
        stock_items = stock_fetcher.fetch_current()

        # 加密货币情绪
        crypto_sentiment = "neutral"
        if crypto_items:
            crypto_gains = sum(1 for item in crypto_items.values() if item.price_change_24h > 0)
            crypto_total = len(crypto_items)
            crypto_gain_ratio = crypto_gains / crypto_total if crypto_total > 0 else 0

            if crypto_gain_ratio > 0.7:
                crypto_sentiment = "bullish"
            elif crypto_gain_ratio < 0.3:
                crypto_sentiment = "bearish"

        # 股票情绪
        stock_sentiment = "neutral"
        if stock_items:
            stock_gains = sum(1 for item in stock_items.values() if item.change > 0)
            stock_total = len(stock_items)
            stock_gain_ratio = stock_gains / stock_total if stock_total > 0 else 0

            if stock_gain_ratio > 0.7:
                stock_sentiment = "bullish"
            elif stock_gain_ratio < 0.3:
                stock_sentiment = "bearish"

        sentiment = {
            "crypto_sentiment": crypto_sentiment,
            "stock_sentiment": stock_sentiment,
            "crypto_gain_ratio": round(crypto_gain_ratio * 100, 2) if crypto_items else 0,
            "stock_gain_ratio": round(stock_gain_ratio * 100, 2) if stock_items else 0,
            "overall_sentiment": "bullish" if crypto_sentiment == "bullish" and stock_sentiment == "bullish" else
                                "bearish" if crypto_sentiment == "bearish" and stock_sentiment == "bearish" else "neutral"
        }

        return str(sentiment)

    except Exception as e:
        return f"分析市场情绪失败: {e}"


if __name__ == "__main__":
    # 运行 MCP Server
    mcp.run()
