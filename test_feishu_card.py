#!/usr/bin/env python3
# coding=utf-8
"""
测试飞书卡片渲染功能
"""

import sys
import json
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from trendradar.crawler.crypto import CryptoFetcher
from trendradar.crawler.stocks import StockFetcher
from trendradar.storage.market_models import MarketData
from trendradar.notification.market_renderer import (
    render_market_feishu_card,
    render_market_feishu_text,
    render_market_summary
)
from trendradar.utils.time import format_date_folder, format_time_filename


def test_feishu_card():
    """测试飞书卡片生成"""

    print("=" * 60)
    print("开始测试飞书卡片渲染功能")
    print("=" * 60)

    # 1. 获取市场数据
    print("\n[步骤 1] 获取市场数据...")
    crypto_fetcher = CryptoFetcher()
    stock_fetcher = StockFetcher()

    crypto_items = crypto_fetcher.fetch_prices()
    stock_items = stock_fetcher.fetch_current()

    market_data = MarketData(
        date=format_date_folder(),
        crawl_time=format_time_filename(),
        crypto_items=crypto_items,
        stock_items=stock_items,
        failed_sources=[],
    )

    print(f"✓ 市场数据获取成功：{len(crypto_items)} 个加密货币，{len(stock_items)} 个股票")

    # 2. 生成 AI 分析模拟数据
    print("\n[步骤 2] 准备 AI 分析数据...")
    ai_insights = """市场分析摘要：

🔹 加密货币市场整体向好，BTC 和 ETH 均呈现上涨趋势
🔹 美股三大指数涨跌互现，科技股承压
🔹 港股恒生指数强势上涨 2.76%
🔹 A股市场表现平稳，创业板承压

💡 投资建议：关注港股和加密货币市场机会"""

    rss_summary = "• AI 驱动的金融创新正在加速\n• 加密货币监管政策即将明朗化\n• 全球经济复苏迹象显现"

    print("✓ 准备完成")

    # 3. 生成飞书 Rich Card
    print("\n[步骤 3] 生成飞书 Rich Card...")
    card = render_market_feishu_card(
        market_data=market_data,
        ai_insights=ai_insights,
        rss_summary=rss_summary
    )

    print("✓ Rich Card 生成成功")

    # 4. 保存 Rich Card JSON
    print("\n[步骤 4] 保存 Rich Card JSON...")
    output_dir = Path("output/feishu")
    output_dir.mkdir(parents=True, exist_ok=True)

    card_file = output_dir / f"card_{market_data.date}_{market_data.crawl_time}.json"

    with open(card_file, "w", encoding="utf-8") as f:
        json.dump(card, f, ensure_ascii=False, indent=2)

    print(f"✓ Rich Card 已保存: {card_file}")
    print(f"  文件大小: {card_file.stat().st_size:,} 字节")

    # 5. 生成 Markdown 文本版本
    print("\n[步骤 5] 生成 Markdown 文本版本...")
    text = render_market_feishu_text(
        market_data=market_data,
        ai_insights=ai_insights,
        rss_summary=rss_summary
    )

    text_file = output_dir / f"text_{market_data.date}_{market_data.crawl_time}.md"

    with open(text_file, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"✓ Markdown 文本已保存: {text_file}")
    print(f"  文件大小: {text_file.stat().st_size:,} 字节")

    # 6. 生成摘要
    print("\n[步骤 6] 生成市场摘要...")
    summary = render_market_summary(market_data)
    print(f"✓ 摘要: {summary}")

    # 7. 输出 Rich Card 预览
    print("\n" + "=" * 60)
    print("📋 Rich Card 预览")
    print("=" * 60)
    print(json.dumps(card, ensure_ascii=False, indent=2))
    print("=" * 60)

    # 8. 输出 Markdown 预览
    print("\n" + "=" * 60)
    print("📝 Markdown 文本预览")
    print("=" * 60)
    print(text)
    print("=" * 60)

    print("\n✓ 测试完成！")
    print(f"\n📂 输出文件:")
    print(f"  - Rich Card JSON: {card_file}")
    print(f"  - Markdown 文本: {text_file}")

    return True


if __name__ == "__main__":
    try:
        success = test_feishu_card()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
