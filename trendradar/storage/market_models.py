# coding=utf-8
"""
市场数据模型

定义加密货币、股票和市场数据的数据结构
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class CryptoItem:
    """加密货币数据项"""
    symbol: str                          # 交易对符号，如 "BTC", "ETH"
    price: float                         # 当前价格（USD）
    price_change_24h: float              # 24小时价格变化百分比
    volume_24h: float                    # 24小时交易量（USD）
    timestamp: str                       # 时间戳（ISO格式）
    exchange: str = "Binance"            # 交易所名称
    price_history: List[Dict] = field(default_factory=list)  # 价格历史（用于图表）

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "symbol": self.symbol,
            "price": self.price,
            "price_change_24h": self.price_change_24h,
            "volume_24h": self.volume_24h,
            "timestamp": self.timestamp,
            "exchange": self.exchange,
            "price_history": self.price_history,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'CryptoItem':
        """从字典创建"""
        return cls(
            symbol=data["symbol"],
            price=data["price"],
            price_change_24h=data["price_change_24h"],
            volume_24h=data["volume_24h"],
            timestamp=data["timestamp"],
            exchange=data.get("exchange", "Binance"),
            price_history=data.get("price_history", []),
        )


@dataclass
class StockItem:
    """股票数据项"""
    symbol: str                          # 股票代码，如 "^GSPC", "AAPL"
    name: str                            # 股票名称，如 "S&P 500"
    price: float                         # 当前价格
    change: float                        # 价格变化（绝对值）
    change_percent: float                # 价格变化百分比
    volume: int                          # 成交量
    timestamp: str                       # 时间戳（ISO格式）
    market: str                          # 市场类型：'US', 'HK', 'CN'
    price_history: List[Dict] = field(default_factory=list)  # 价格历史（用于图表）

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "symbol": self.symbol,
            "name": self.name,
            "price": self.price,
            "change": self.change,
            "change_percent": self.change_percent,
            "volume": self.volume,
            "timestamp": self.timestamp,
            "market": self.market,
            "price_history": self.price_history,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'StockItem':
        """从字典创建"""
        return cls(
            symbol=data["symbol"],
            name=data["name"],
            price=data["price"],
            change=data["change"],
            change_percent=data["change_percent"],
            volume=data["volume"],
            timestamp=data["timestamp"],
            market=data["market"],
            price_history=data.get("price_history", []),
        )


@dataclass
class MarketData:
    """
    统一的市场数据容器

    包含加密货币、股票数据，以及失败的数据源列表
    """
    date: str                                    # 日期（YYYY-MM-DD）
    crawl_time: str                              # 爬取时间（HH:MM）
    crypto_items: Dict[str, CryptoItem]          # 加密货币数据，key为symbol
    stock_items: Dict[str, StockItem]            # 股票数据，key为symbol
    failed_sources: List[str] = field(default_factory=list)  # 失败的数据源

    def to_dict(self) -> Dict:
        """转换为字典（用于JSON序列化）"""
        return {
            "date": self.date,
            "crawl_time": self.crawl_time,
            "crypto_items": {
                symbol: item.to_dict()
                for symbol, item in self.crypto_items.items()
            },
            "stock_items": {
                symbol: item.to_dict()
                for symbol, item in self.stock_items.items()
            },
            "failed_sources": self.failed_sources,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'MarketData':
        """从字典创建"""
        return cls(
            date=data["date"],
            crawl_time=data["crawl_time"],
            crypto_items={
                symbol: CryptoItem.from_dict(item_data)
                for symbol, item_data in data.get("crypto_items", {}).items()
            },
            stock_items={
                symbol: StockItem.from_dict(item_data)
                for symbol, item_data in data.get("stock_items", {}).items()
            },
            failed_sources=data.get("failed_sources", []),
        )

    def get_total_items(self) -> int:
        """获取总数据条目数"""
        return len(self.crypto_items) + len(self.stock_items)

    def has_crypto_data(self) -> bool:
        """是否有加密货币数据"""
        return len(self.crypto_items) > 0

    def has_stock_data(self) -> bool:
        """是否有股票数据"""
        return len(self.stock_items) > 0

    def has_any_data(self) -> bool:
        """是否有任何数据"""
        return self.has_crypto_data() or self.has_stock_data()
