# coding=utf-8
"""
加密货币数据抓取器

使用 CoinGecko 公开 API 获取 BTC/ETH 等加密货币的实时价格和历史数据
CoinGecko API 免费，无需密钥，在中国大陆可访问
"""

import time
import random
from typing import Dict, List, Optional
from datetime import datetime, timedelta

import requests

from trendradar.storage.market_models import CryptoItem


class CryptoFetcher:
    """
    加密货币数据抓取器

    使用 CoinGecko 公开 API（无需API密钥，免费）获取：
    - 实时价格
    - 24小时涨跌幅
    - 24小时交易量
    - 历史价格数据（用于图表）
    """

    BASE_URL = "https://api.coingecko.com/api/v3"

    # CoinGecko 的币种ID映射
    COIN_IDS = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "BNB": "binancecoin",          # 公链
        "SOL": "solana",               # 公链
        "AVAX": "avalanche-2",         # 公链
        "MATIC": "matic-network",      # 公链
        "UNI": "uniswap",              # DeFi
        "AAVE": "aave",                # DeFi
        "LINK": "chainlink",           # DeFi/Oracle
        "XRP": "ripple",
    }

    def __init__(self, symbols: Optional[List[str]] = None, proxy_url: Optional[str] = None):
        """
        初始化抓取器

        Args:
            symbols: 要监控的加密货币符号列表，默认 ["BTC", "ETH"]
            proxy_url: 代理URL（可选）
        """
        self.symbols = symbols or ["BTC", "ETH"]
        self.proxy_url = proxy_url
        self.session = requests.Session()

        # 设置代理
        if proxy_url:
            self.session.proxies = {
                "http": proxy_url,
                "https": proxy_url
            }

    def fetch_prices(self) -> Dict[str, CryptoItem]:
        """
        获取当前价格和24小时统计数据

        Returns:
            Dict[symbol, CryptoItem]: 加密货币数据字典
        """
        result = {}

        for symbol in self.symbols:
            try:
                item = self._fetch_single_price(symbol)
                if item:
                    result[symbol] = item
                    print(f"✅ 获取 {symbol} 成功: ${item.price:,.2f} ({item.price_change_24h:+.2f}%)")

                # 避免请求过快
                time.sleep(0.1)

            except Exception as e:
                print(f"❌ 获取 {symbol} 失败: {e}")
                continue

        return result

    def _fetch_single_price(self, symbol: str) -> Optional[CryptoItem]:
        """
        获取单个加密货币的价格

        Args:
            symbol: 加密货币符号（如 "BTC", "ETH"）

        Returns:
            CryptoItem 或 None
        """
        # 获取 CoinGecko 的币种ID
        coin_id = self.COIN_IDS.get(symbol)
        if not coin_id:
            print(f"⚠️ 不支持的币种: {symbol}")
            return None

        # CoinGecko API: /simple/price
        url = f"{self.BASE_URL}/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_24hr_vol": "true"
        }

        try:
            response = self._request_with_retry(url, params=params, max_retries=2)
            if not response:
                return None

            data = response.json()

            # CoinGecko 返回格式: {"bitcoin": {"usd": 42000, "usd_24h_change": 2.5, "usd_24h_vol": 1000000000}}
            coin_data = data.get(coin_id, {})
            if not coin_data:
                print(f"⚠️ {symbol} 无数据")
                return None

            # 解析数据
            return CryptoItem(
                symbol=symbol,
                price=float(coin_data.get("usd", 0)),
                price_change_24h=float(coin_data.get("usd_24h_change", 0)),
                volume_24h=float(coin_data.get("usd_24h_vol", 0)),
                timestamp=datetime.now().isoformat(),
                exchange="CoinGecko",
                price_history=[],  # 稍后通过 fetch_historical 填充
            )

        except Exception as e:
            print(f"解析 {symbol} 数据失败: {e}")
            return None

    def fetch_historical(
        self,
        symbol: str,
        days: int = 1,
        interval: str = "hourly"
    ) -> List[Dict]:
        """
        获取历史价格数据（用于绘制图表）

        使用CoinGecko免费API获取历史数据
        API: /coins/{id}/market_chart?vs_currency=usd&days={days}

        Args:
            symbol: 加密货币符号（如 "BTC"）
            days: 历史天数 (1=24h, 7=7d, 30=30d, 365=1y, max=全部历史)
            interval: 时间间隔 ("hourly" 或 "daily")

        Returns:
            历史价格数据列表 [{"timestamp": "2024-01-01T00:00:00", "price": 42000}, ...]
        """
        coin_id = self.COIN_IDS.get(symbol)
        if not coin_id:
            print(f"⚠️ {symbol} 不在支持列表中")
            return []

        try:
            # CoinGecko market_chart API
            url = f"{self.BASE_URL}/coins/{coin_id}/market_chart"
            params = {
                "vs_currency": "usd",
                "days": days,
                "interval": interval if days <= 90 else "daily"  # >90天自动切换到daily
            }

            response = self.session.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            # 解析价格数据: data["prices"] = [[timestamp_ms, price], ...]
            prices = data.get("prices", [])
            if not prices:
                return []

            # 转换格式
            history = []
            for timestamp_ms, price in prices:
                dt = datetime.fromtimestamp(timestamp_ms / 1000)
                history.append({
                    "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "price": float(price)
                })

            return history

        except Exception as e:
            print(f"❌ 获取 {symbol} 历史数据失败: {e}")
            return []

        print(f"ℹ️  {symbol} 历史数据将从数据库读取（需运行一段时间后积累）")
        return []

    def _request_with_retry(
        self,
        url: str,
        params: Optional[Dict] = None,
        max_retries: int = 2,
        timeout: int = 10
    ) -> Optional[requests.Response]:
        """
        带重试机制的HTTP请求

        Args:
            url: 请求URL
            params: 请求参数
            max_retries: 最大重试次数
            timeout: 超时时间（秒）

        Returns:
            Response 对象或 None
        """
        for attempt in range(max_retries + 1):
            try:
                response = self.session.get(
                    url,
                    params=params,
                    timeout=timeout,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                )
                response.raise_for_status()
                return response

            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    # 指数退避 + 随机抖动
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    print(f"⚠️ 请求失败，{wait_time:.1f}秒后重试... (尝试 {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    print(f"❌ 请求失败（已重试{max_retries}次）: {e}")
                    return None

    def close(self):
        """关闭会话"""
        self.session.close()


# 测试代码
if __name__ == "__main__":
    # 创建抓取器
    fetcher = CryptoFetcher(symbols=["BTC", "ETH"])

    # 获取实时价格
    print("\n=== 获取实时价格 ===")
    prices = fetcher.fetch_prices()

    for symbol, item in prices.items():
        print(f"\n{symbol}:")
        print(f"  价格: ${item.price:,.2f}")
        print(f"  24h变化: {item.price_change_24h:+.2f}%")
        print(f"  24h交易量: ${item.volume_24h:,.0f}")

    # 获取BTC历史数据（24小时）
    print("\n=== 获取BTC 24小时历史数据 ===")
    history = fetcher.fetch_historical("BTC", interval="1h", limit=24)

    if history:
        print(f"数据点数: {len(history)}")
        print(f"最早: {history[0]['timestamp']} - ${history[0]['price']:,.2f}")
        print(f"最新: {history[-1]['timestamp']} - ${history[-1]['price']:,.2f}")

    fetcher.close()
