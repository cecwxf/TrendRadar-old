#!/usr/bin/env python3
# coding=utf-8
"""
TrendRadar 金融市场仪表盘主程序

整合加密货币、股票、AI分析、RSS推文，生成仪表盘并推送通知
"""

import os
import sys
import yaml
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime

from trendradar.crawler.crypto import CryptoFetcher
from trendradar.crawler.stocks import StockFetcher
from trendradar.storage.local import LocalStorageBackend
from trendradar.storage.market_models import MarketData
from trendradar.analysis.claude_analyzer import analyze_market_simple
from trendradar.report.dashboard_html import render_dashboard_html
from trendradar.notification.market_renderer import (
    render_market_feishu_card,
    render_market_feishu_text,
    render_market_summary
)
from trendradar.utils.time import format_date_folder, format_time_filename


class MarketDashboard:
    """
    金融市场仪表盘

    主要功能：
    1. 获取加密货币和股票数据
    2. 存储到 SQLite 数据库
    3. 调用 Claude AI 分析
    4. 生成 HTML 仪表盘
    5. 发送飞书通知
    """

    def __init__(
        self,
        data_dir: str = "output",
        timezone: str = "Asia/Shanghai",
        enable_ai: bool = True,
        enable_notifications: bool = True,
        config: Optional[Dict] = None
    ):
        """
        初始化仪表盘

        Args:
            data_dir: 数据目录
            timezone: 时区
            enable_ai: 是否启用 AI 分析
            enable_notifications: 是否启用通知推送
            config: 配置字典（可选，如不提供则从配置文件读取）
        """
        self.data_dir = Path(data_dir)
        self.timezone = timezone
        self.enable_ai = enable_ai
        self.enable_notifications = enable_notifications

        # 读取配置文件（如果没有提供config参数）
        if config is None:
            config = self._load_config()
        self.config = config

        # 从配置中提取crypto symbols和custom stocks
        crypto_symbols = self._extract_crypto_symbols(config)
        custom_stocks_list = self._extract_custom_stocks(config)

        # 初始化组件（传入配置）
        self.crypto_fetcher = CryptoFetcher(symbols=crypto_symbols)
        self.stock_fetcher = StockFetcher(
            custom_stocks=custom_stocks_list,
            use_predefined_indices=True
        )
        self.storage = LocalStorageBackend(
            data_dir=str(self.data_dir),
            enable_txt=False,
            enable_html=True,
            timezone=self.timezone
        )

        print("=" * 60)
        print("📈 空间超算精选")
        print("=" * 60)
        print(f"  加载了 {len(crypto_symbols)} 个加密货币")
        print(f"  加载了 {len(custom_stocks_list)} 个自定义股票")

    def _load_config(self) -> Dict:
        """读取配置文件"""
        config_path = Path("config/market_config.yaml")

        if not config_path.exists():
            print(f"⚠️  配置文件不存在: {config_path}，使用默认配置")
            return {}

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)
            print(f"✓ 已加载配置文件: {config_path}")
            return config
        except Exception as e:
            print(f"⚠️  读取配置文件失败: {e}，使用默认配置")
            return {}

    def _extract_crypto_symbols(self, config: Dict) -> List[str]:
        """从配置中提取加密货币符号列表"""
        try:
            # 支持新格式 (coins) 和旧格式 (symbols)
            crypto_config = config.get("market", {}).get("crypto", {})

            # 尝试新格式：coins (带category)
            coins = crypto_config.get("coins", [])
            if coins:
                symbols = [
                    coin["symbol"]
                    for coin in coins
                    if coin.get("enabled", True)
                ]
                if symbols:
                    return symbols

            # 尝试旧格式：symbols (向后兼容)
            symbols = crypto_config.get("symbols", [])
            if symbols:
                return symbols

            print("⚠️  配置中未找到crypto coins/symbols，使用默认: BTC, ETH")
            return ["BTC", "ETH"]

        except Exception as e:
            print(f"⚠️  提取crypto symbols失败: {e}，使用默认: BTC, ETH")
            return ["BTC", "ETH"]

    def _extract_custom_stocks(self, config: Dict) -> List[str]:
        """从配置中提取自定义股票代码列表"""
        try:
            custom_stocks_config = config.get("market", {}).get("stocks", {}).get("custom_stocks", [])

            # 过滤出enabled=true的股票
            enabled_stocks = [
                stock["symbol"]
                for stock in custom_stocks_config
                if stock.get("enabled", True)  # 默认enabled
            ]

            if not enabled_stocks:
                print("⚠️  配置中未找到enabled的custom stocks")

            return enabled_stocks
        except Exception as e:
            print(f"⚠️  提取custom stocks失败: {e}")
            return []

    def run(self) -> bool:
        """
        运行仪表盘更新流程

        Returns:
            是否成功
        """
        try:
            # 1. 获取市场数据
            print("\n[步骤 1/7] 📊 获取市场数据...")
            market_data = self._fetch_market_data()

            if not market_data:
                print("✗ 市场数据获取失败")
                return False

            # 2. 保存到数据库
            print("\n[步骤 2/7] 💾 保存到数据库...")
            save_success = self.storage.save_market_data(market_data)

            if not save_success:
                print("✗ 数据保存失败")
                return False

            # 3. 获取价格历史
            print("\n[步骤 3/7] 📉 获取价格历史...")
            price_history = self._fetch_price_history(market_data)

            # 4. AI 分析
            ai_insights = None
            if self.enable_ai:
                print("\n[步骤 4/7] 🤖 AI 分析...")
                ai_insights = self._analyze_market(market_data)
            else:
                print("\n[步骤 4/7] ⏭️  跳过 AI 分析（已禁用）")

            # 5. 获取 RSS 数据（可选）
            print("\n[步骤 5/7] 🐦 获取 RSS 推文...")
            rss_data = self._fetch_rss_data()

            # 6. 生成 HTML 仪表盘
            print("\n[步骤 6/7] 🎨 生成 HTML 仪表盘...")
            dashboard_path = self._generate_dashboard(
                market_data,
                price_history,
                ai_insights,
                rss_data
            )

            if dashboard_path:
                print(f"✓ 仪表盘已生成: {dashboard_path}")
            else:
                print("✗ 仪表盘生成失败")

            # 7. 发送通知
            if self.enable_notifications:
                print("\n[步骤 7/7] 📮 发送通知...")
                self._send_notifications(market_data, ai_insights, rss_data)
            else:
                print("\n[步骤 7/7] ⏭️  跳过通知（已禁用）")

            # 完成
            print("\n" + "=" * 60)
            print("✅ 空间超算精选更新完成")
            print("=" * 60)
            print(f"\n📊 数据概览:")
            print(f"  - 加密货币: {len(market_data.crypto_items)} 个")
            print(f"  - 股票指数: {len(market_data.stock_items)} 个")
            print(f"  - 价格历史: {sum(len(v) for v in price_history.values())} 条")
            if ai_insights:
                print(f"  - AI 分析: {len(ai_insights)} 字符")
            if dashboard_path:
                print(f"\n📂 输出文件: {dashboard_path}")

            return True

        except Exception as e:
            print(f"\n✗ 运行失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _fetch_market_data(self) -> Optional[MarketData]:
        """获取市场数据"""
        try:
            # 获取加密货币
            crypto_items = self.crypto_fetcher.fetch_prices()
            print(f"  ✓ 加密货币: {len(crypto_items)} 个")

            # 获取股票
            stock_items = self.stock_fetcher.fetch_current()
            print(f"  ✓ 股票指数: {len(stock_items)} 个")

            # 构建 MarketData
            market_data = MarketData(
                date=format_date_folder(timezone=self.timezone),
                crawl_time=format_time_filename(timezone=self.timezone),
                crypto_items=crypto_items,
                stock_items=stock_items,
                failed_sources=[]
            )

            return market_data

        except Exception as e:
            print(f"  ✗ 获取市场数据失败: {e}")
            return None

    def _fetch_price_history(self, market_data: MarketData) -> Dict[str, Dict[str, list]]:
        """
        获取价格历史数据（多个时间范围）- 直接从API获取

        Returns:
            Dict[time_range, Dict[symbol, history]]
            例如: {
                "24h": {"BTC": [...], "ETH": [...]},
                "7d": {"BTC": [...], "ETH": [...]},
                "30d": {"BTC": [...], "ETH": [...]}
            }
        """
        # 定义时间范围（API参数映射）
        time_ranges = {
            "24h": {"days": 1, "period": "1d", "interval": "1h"},      # 1天，每小时
            "7d": {"days": 7, "period": "5d", "interval": "1h"},       # 7天，每小时
            "30d": {"days": 30, "period": "1mo", "interval": "1d"},    # 30天，每天
            "1y": {"days": 365, "period": "1y", "interval": "1d"}      # 365天，每天
        }

        price_history = {range_name: {} for range_name in time_ranges.keys()}

        try:
            # 获取加密货币历史（直接从CoinGecko API）
            print("  📊 从API获取加密货币历史数据...")
            for symbol in market_data.crypto_items.keys():
                for range_name, params in time_ranges.items():
                    history = self.crypto_fetcher.fetch_historical(
                        symbol=symbol,
                        days=params["days"]
                    )
                    if history:
                        price_history[range_name][symbol] = history
                        if range_name == "24h":  # 只打印24小时的统计
                            print(f"    ✓ {symbol}: {len(history)} 条历史数据")

                # 短暂延迟避免API限流
                import time
                time.sleep(0.2)

            # 获取股票历史（直接从Yahoo Finance API）
            print("  📊 从API获取股票历史数据...")
            major_indices = {
                "^GSPC": "S&P500",
                "^IXIC": "NASDAQ",
                "^HSI": "HSI"
            }

            for symbol, display_name in major_indices.items():
                if symbol in market_data.stock_items:
                    for range_name, params in time_ranges.items():
                        history = self.stock_fetcher.fetch_historical(
                            symbol=symbol,
                            period=params["period"],
                            interval=params["interval"]
                        )
                        if history:
                            price_history[range_name][display_name] = history
                            if range_name == "24h":  # 只打印24小时的统计
                                print(f"    ✓ {display_name}: {len(history)} 条历史数据")

                    # 短暂延迟避免API限流
                    import time
                    time.sleep(0.2)

            # 统计所有时间范围的数据
            total_points = sum(
                sum(len(data) for data in range_data.values())
                for range_data in price_history.values()
            )

            print(f"  ✓ 共获取 {total_points} 条历史数据点（来自API）")

            return price_history

        except Exception as e:
            print(f"  ✗ 获取价格历史失败: {e}")
            import traceback
            traceback.print_exc()
            return {range_name: {} for range_name in time_ranges.keys()}

    def _analyze_market(self, market_data: MarketData) -> Optional[str]:
        """AI 市场分析（支持每日一次缓存）"""
        try:
            api_key = os.environ.get("ANTHROPIC_API_KEY")

            if not api_key:
                print("  ⚠️  未配置 ANTHROPIC_API_KEY，跳过 AI 分析")
                return None

            # 检查是否已经有今日的 AI 分析（每日一次）
            today_analysis = self._get_today_ai_analysis()
            if today_analysis:
                print(f"  ✓ 使用今日已缓存的 AI 分析: {len(today_analysis)} 字符")
                return today_analysis

            # 获取一周历史数据（7天 = 168小时）
            print("  📊 获取一周历史趋势...")
            weekly_history = self._fetch_trend_history(market_data, hours=168)

            # 获取一个月历史数据（30天 = 720小时）
            print("  📊 获取一个月历史趋势...")
            monthly_history = self._fetch_trend_history(market_data, hours=720)

            # 调用 AI 分析（包含历史趋势）
            from trendradar.analysis.claude_analyzer import ClaudeMarketAnalyzer

            analyzer = ClaudeMarketAnalyzer(api_key=api_key)
            analysis = analyzer.analyze_market(
                market_data,
                include_advice=True,
                weekly_history=weekly_history,
                monthly_history=monthly_history
            )

            if analysis:
                print(f"  ✓ AI 分析完成: {len(analysis)} 字符")
                # 缓存今日的分析结果
                self._save_today_ai_analysis(analysis)
                return analysis
            else:
                print("  ✗ AI 分析失败")
                return None

        except Exception as e:
            print(f"  ✗ AI 分析异常: {e}")
            return None

    def _fetch_trend_history(self, market_data: MarketData, hours: int) -> Dict[str, list]:
        """
        获取趋势历史数据

        Args:
            market_data: 市场数据
            hours: 历史时间跨度（小时）

        Returns:
            历史价格数据字典
        """
        history = {}

        try:
            # 获取主要加密货币的历史数据
            for symbol in ["BTC", "ETH", "BNB", "SOL"]:
                if symbol in market_data.crypto_items:
                    data = self.storage.get_price_history(
                        asset_type="crypto",
                        symbol=symbol,
                        hours=hours
                    )
                    if data and len(data) > 1:
                        history[symbol] = data

            # 获取主要股票指数的历史数据
            major_indices = {
                "^GSPC": "S&P500",
                "^IXIC": "NASDAQ",
                "^HSI": "HSI"
            }
            for symbol, display_name in major_indices.items():
                if symbol in market_data.stock_items:
                    data = self.storage.get_price_history(
                        asset_type="stock",
                        symbol=symbol,
                        hours=hours
                    )
                    if data and len(data) > 1:
                        history[display_name] = data

            return history

        except Exception as e:
            print(f"  ⚠️  获取趋势历史失败: {e}")
            return {}

    def _get_today_ai_analysis(self) -> Optional[str]:
        """获取今日已缓存的 AI 分析"""
        try:
            cache_dir = self.data_dir / "ai_cache"
            cache_dir.mkdir(parents=True, exist_ok=True)

            today = format_date_folder(timezone=self.timezone)
            cache_file = cache_dir / f"analysis_{today}.txt"

            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    return f.read()

            return None

        except Exception as e:
            print(f"  ⚠️  读取 AI 分析缓存失败: {e}")
            return None

    def _save_today_ai_analysis(self, analysis: str):
        """保存今日的 AI 分析到缓存"""
        try:
            cache_dir = self.data_dir / "ai_cache"
            cache_dir.mkdir(parents=True, exist_ok=True)

            today = format_date_folder(timezone=self.timezone)
            cache_file = cache_dir / f"analysis_{today}.txt"

            with open(cache_file, "w", encoding="utf-8") as f:
                f.write(analysis)

            print(f"  ✓ AI 分析已缓存到: {cache_file}")

        except Exception as e:
            print(f"  ⚠️  保存 AI 分析缓存失败: {e}")

    def _fetch_rss_data(self) -> Optional[str]:
        """获取 RSS 数据（硅谷王川推文）"""
        try:
            # TODO: 实现 RSS 数据获取
            # 这里可以复用现有的 RSS 抓取逻辑
            print("  ⚠️  RSS 功能待实现")
            return None

        except Exception as e:
            print(f"  ✗ 获取 RSS 失败: {e}")
            return None

    def _generate_dashboard(
        self,
        market_data: MarketData,
        price_history: Dict,
        ai_insights: Optional[str],
        rss_data: Optional[str]
    ) -> Optional[Path]:
        """生成 HTML 仪表盘"""
        try:
            # 生成 HTML
            html = render_dashboard_html(
                market_data=market_data,
                price_history=price_history,
                ai_insights=ai_insights,
                rss_data=None  # RSS 数据格式需要调整
            )

            # 保存文件
            dashboard_dir = self.data_dir / "dashboard"
            dashboard_dir.mkdir(parents=True, exist_ok=True)

            # 保存到 index.html（最新版本）
            index_path = dashboard_dir / "index.html"
            with open(index_path, "w", encoding="utf-8") as f:
                f.write(html)

            # 同时保存带时间戳的版本
            timestamped_path = dashboard_dir / f"dashboard_{market_data.date}_{market_data.crawl_time}.html"
            with open(timestamped_path, "w", encoding="utf-8") as f:
                f.write(html)

            return index_path

        except Exception as e:
            print(f"  ✗ 生成仪表盘失败: {e}")
            return None

    def _send_notifications(
        self,
        market_data: MarketData,
        ai_insights: Optional[str],
        rss_data: Optional[str]
    ):
        """发送通知"""
        try:
            # 获取飞书 webhook
            feishu_webhook = os.environ.get("FEISHU_WEBHOOK_URL")

            if not feishu_webhook:
                print("  ⚠️  未配置 FEISHU_WEBHOOK_URL，跳过通知")
                return

            # 生成 Rich Card
            card = render_market_feishu_card(
                market_data=market_data,
                ai_insights=ai_insights,
                rss_summary=rss_data
            )

            # 发送通知
            import requests

            response = requests.post(
                feishu_webhook,
                json=card,
                timeout=10
            )

            if response.status_code == 200:
                print("  ✓ 飞书通知发送成功")
            else:
                print(f"  ✗ 飞书通知发送失败: {response.status_code} {response.text}")

        except Exception as e:
            print(f"  ✗ 发送通知失败: {e}")


def main():
    """主函数"""
    # 读取环境变量配置
    data_dir = os.environ.get("DATA_DIR", "output")
    timezone = os.environ.get("TIMEZONE", "Asia/Shanghai")
    enable_ai = os.environ.get("ENABLE_AI", "true").lower() == "true"
    enable_notifications = os.environ.get("ENABLE_NOTIFICATIONS", "true").lower() == "true"

    # 创建并运行仪表盘
    dashboard = MarketDashboard(
        data_dir=data_dir,
        timezone=timezone,
        enable_ai=enable_ai,
        enable_notifications=enable_notifications
    )

    success = dashboard.run()

    # 退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
