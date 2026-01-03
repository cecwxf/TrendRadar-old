# coding=utf-8
"""
股票数据抓取器

使用 yfinance 库获取美股、港股、A股的指数和个股数据
"""

import time
from typing import Dict, List, Optional
from datetime import datetime

try:
    import yfinance as yf
except ImportError:
    yf = None
    print("⚠️ yfinance 未安装，请运行: pip install yfinance")

from trendradar.storage.market_models import StockItem


# 预定义的主要指数
PREDEFINED_INDICES = {
    # 美股三大指数
    "^GSPC": {"name": "S&P 500", "market": "US"},
    "^IXIC": {"name": "Nasdaq", "market": "US"},
    "^DJI": {"name": "道琼斯指数", "market": "US"},

    # 港股
    "^HSI": {"name": "恒生指数", "market": "HK"},

    # A股
    "000001.SS": {"name": "上证指数", "market": "CN"},
    "399001.SZ": {"name": "深证成指", "market": "CN"},
    "399006.SZ": {"name": "创业板指", "market": "CN"},
}


class StockFetcher:
    """
    股票数据抓取器

    支持：
    - 美股主要指数（S&P 500, Nasdaq, Dow Jones）
    - 港股恒生指数
    - A股三大指数（上证、深证、创业板）
    - 自定义个股（用户配置）
    """

    def __init__(
        self,
        custom_stocks: Optional[List[str]] = None,
        use_predefined_indices: bool = True
    ):
        """
        初始化抓取器

        Args:
            custom_stocks: 自定义股票代码列表，如 ["AAPL", "TSLA", "NVDA"]
            use_predefined_indices: 是否包含预定义的主要指数
        """
        if yf is None:
            raise ImportError("yfinance 未安装，请运行: pip install yfinance>=0.2.36")

        self.symbols = {}

        # 添加预定义指数
        if use_predefined_indices:
            self.symbols.update(PREDEFINED_INDICES)

        # 添加自定义股票
        if custom_stocks:
            for symbol in custom_stocks:
                self.symbols[symbol] = {
                    "name": symbol,  # 稍后会从yfinance获取完整名称
                    "market": self._detect_market(symbol)
                }

    def _detect_market(self, symbol: str) -> str:
        """
        根据股票代码检测所属市场

        Args:
            symbol: 股票代码

        Returns:
            市场类型：'US', 'HK', 'CN'
        """
        if symbol.endswith('.SS') or symbol.endswith('.SZ'):
            return "CN"  # A股
        elif symbol.endswith('.HK'):
            return "HK"  # 港股
        else:
            return "US"  # 默认美股

    def fetch_current(self) -> Dict[str, StockItem]:
        """
        获取所有配置股票的当前价格

        Returns:
            Dict[symbol, StockItem]: 股票数据字典
        """
        result = {}

        for symbol, info in self.symbols.items():
            try:
                item = self._fetch_single_stock(symbol, info)
                if item:
                    result[symbol] = item
                    change_symbol = "▲" if item.change_percent >= 0 else "▼"
                    print(f"✅ 获取 {item.name} 成功: {item.price:.2f} {change_symbol} {item.change_percent:+.2f}%")

                # 避免请求过快（yfinance有速率限制）
                time.sleep(0.2)

            except Exception as e:
                print(f"❌ 获取 {symbol} 失败: {e}")
                continue

        return result

    def _fetch_single_stock(self, symbol: str, info: Dict) -> Optional[StockItem]:
        """
        获取单只股票的数据

        Args:
            symbol: 股票代码
            info: 股票信息（包含name和market）

        Returns:
            StockItem 或 None
        """
        try:
            # 使用yfinance获取股票数据
            ticker = yf.Ticker(symbol)
            data = ticker.info

            # 获取当前价格（尝试多个字段）
            price = (
                data.get('regularMarketPrice') or
                data.get('currentPrice') or
                data.get('previousClose', 0)
            )

            if not price:
                print(f"⚠️ {symbol} 无法获取价格数据")
                return None

            # 获取价格变化
            previous_close = data.get('previousClose', price)
            change = price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else 0

            # 获取成交量
            volume = data.get('regularMarketVolume', 0) or data.get('volume', 0)

            # 获取完整名称（如果可用）
            name = data.get('longName') or data.get('shortName') or info['name']

            return StockItem(
                symbol=symbol,
                name=name,
                price=float(price),
                change=float(change),
                change_percent=float(change_percent),
                volume=int(volume),
                timestamp=datetime.now().isoformat(),
                market=info['market'],
                price_history=[],  # 稍后通过 fetch_historical 填充
            )

        except Exception as e:
            print(f"解析 {symbol} 数据失败: {e}")
            return None

    def fetch_historical(
        self,
        symbol: str,
        period: str = "1d",
        interval: str = "1h"
    ) -> List[Dict]:
        """
        获取历史价格数据（用于绘制图表）

        Args:
            symbol: 股票代码
            period: 时间周期，可选: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
            interval: 数据间隔，可选: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

        Returns:
            List[Dict]: 价格历史列表
            [{"timestamp": "2025-01-03T10:00:00", "price": 4850.0}, ...]
        """
        try:
            ticker = yf.Ticker(symbol)

            # 下载历史数据
            hist = ticker.history(period=period, interval=interval)

            if hist.empty:
                print(f"⚠️ {symbol} 无历史数据")
                return []

            # 解析数据
            history = []
            for timestamp, row in hist.iterrows():
                # timestamp 是 pandas Timestamp 对象
                dt = timestamp.to_pydatetime()

                history.append({
                    "timestamp": dt.isoformat(),
                    "price": float(row['Close'])
                })

            print(f"✅ 获取 {symbol} 历史数据成功: {len(history)} 个数据点")
            return history

        except Exception as e:
            print(f"❌ 获取 {symbol} 历史数据失败: {e}")
            return []


# 测试代码
if __name__ == "__main__":
    # 创建抓取器（包含预定义指数 + 自定义股票）
    fetcher = StockFetcher(
        custom_stocks=["AAPL", "TSLA", "NVDA"],
        use_predefined_indices=True
    )

    # 获取实时价格
    print("\n=== 获取实时股票数据 ===")
    stocks = fetcher.fetch_current()

    # 按市场分组显示
    markets = {"US": [], "HK": [], "CN": []}
    for symbol, item in stocks.items():
        markets[item.market].append(item)

    for market, items in markets.items():
        if items:
            print(f"\n【{market} 市场】")
            for item in items:
                change_symbol = "▲" if item.change_percent >= 0 else "▼"
                print(f"  {item.name}: {item.price:.2f} {change_symbol} {item.change_percent:+.2f}%")

    # 获取S&P 500历史数据（24小时）
    print("\n=== 获取S&P 500 当日历史数据 ===")
    history = fetcher.fetch_historical("^GSPC", period="1d", interval="1h")

    if history:
        print(f"数据点数: {len(history)}")
        print(f"最早: {history[0]['timestamp']} - {history[0]['price']:.2f}")
        print(f"最新: {history[-1]['timestamp']} - {history[-1]['price']:.2f}")
