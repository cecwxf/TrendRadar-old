#!/usr/bin/env python3
# coding=utf-8
"""
TrendRadar 金融市场仪表盘主程序

整合加密货币、股票、AI分析、RSS推文，生成仪表盘并推送通知
"""

import os
import sys
from pathlib import Path
from typing import Optional, Dict
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
        enable_notifications: bool = True
    ):
        """
        初始化仪表盘

        Args:
            data_dir: 数据目录
            timezone: 时区
            enable_ai: 是否启用 AI 分析
            enable_notifications: 是否启用通知推送
        """
        self.data_dir = Path(data_dir)
        self.timezone = timezone
        self.enable_ai = enable_ai
        self.enable_notifications = enable_notifications

        # 初始化组件
        self.crypto_fetcher = CryptoFetcher()
        self.stock_fetcher = StockFetcher()
        self.storage = LocalStorageBackend(
            data_dir=str(self.data_dir),
            enable_txt=False,
            enable_html=True,
            timezone=self.timezone
        )

        print("=" * 60)
        print("📈 TrendRadar Market Dashboard")
        print("=" * 60)

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
            print("✅ 市场仪表盘更新完成")
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

    def _fetch_price_history(self, market_data: MarketData) -> Dict[str, list]:
        """获取价格历史数据"""
        price_history = {}

        try:
            # 获取加密货币历史
            for symbol in market_data.crypto_items.keys():
                history = self.storage.get_price_history(
                    asset_type="crypto",
                    symbol=symbol,
                    hours=24
                )
                if history:
                    price_history[symbol] = history
                    print(f"  ✓ {symbol}: {len(history)} 条历史")

            # 获取股票历史（主要指数）
            major_indices = ["^GSPC", "^IXIC", "^HSI"]
            for symbol in market_data.stock_items.keys():
                if symbol in major_indices:
                    history = self.storage.get_price_history(
                        asset_type="stock",
                        symbol=symbol,
                        hours=24
                    )
                    if history:
                        # 使用友好的名称
                        display_name = {
                            "^GSPC": "S&P500",
                            "^IXIC": "NASDAQ",
                            "^HSI": "HSI"
                        }.get(symbol, symbol)
                        price_history[display_name] = history
                        print(f"  ✓ {display_name}: {len(history)} 条历史")

            if not price_history:
                print("  ⚠️  暂无历史数据（需运行一段时间积累）")

            return price_history

        except Exception as e:
            print(f"  ✗ 获取价格历史失败: {e}")
            return {}

    def _analyze_market(self, market_data: MarketData) -> Optional[str]:
        """AI 市场分析"""
        try:
            api_key = os.environ.get("ANTHROPIC_API_KEY")

            if not api_key:
                print("  ⚠️  未配置 ANTHROPIC_API_KEY，跳过 AI 分析")
                return None

            analysis = analyze_market_simple(market_data, api_key=api_key)

            if analysis:
                print(f"  ✓ AI 分析完成: {len(analysis)} 字符")
                return analysis
            else:
                print("  ✗ AI 分析失败")
                return None

        except Exception as e:
            print(f"  ✗ AI 分析异常: {e}")
            return None

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
