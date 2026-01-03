#!/usr/bin/env python3
# coding=utf-8
"""
测试金融仪表盘生成功能
"""

import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from trendradar.crawler.crypto import CryptoFetcher
from trendradar.crawler.stocks import StockFetcher
from trendradar.storage.local import LocalStorageBackend
from trendradar.storage.market_models import MarketData
from trendradar.report.dashboard_html import render_dashboard_html
from trendradar.utils.time import format_date_folder, format_time_filename


def test_dashboard():
    """测试仪表盘生成功能"""

    print("=" * 60)
    print("开始测试金融仪表盘生成功能")
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

    # 2. 保存数据到数据库
    print("\n[步骤 2] 保存数据到数据库...")
    storage = LocalStorageBackend(
        data_dir="output",
        enable_txt=False,
        enable_html=False,
        timezone="Asia/Shanghai"
    )

    storage.save_market_data(market_data)
    print("✓ 数据保存成功")

    # 3. 获取价格历史（用于图表）
    print("\n[步骤 3] 获取价格历史数据...")
    price_history = {}

    # 获取 BTC 和 ETH 历史
    for symbol in ["BTC", "ETH"]:
        history = storage.get_price_history(
            asset_type="crypto",
            symbol=symbol,
            hours=24
        )
        if history:
            price_history[symbol] = history
            print(f"  - {symbol}: {len(history)} 条历史记录")

    # 获取主要股票指数历史
    for symbol in ["^GSPC", "^IXIC", "^HSI"]:
        history = storage.get_price_history(
            asset_type="stock",
            symbol=symbol,
            hours=24
        )
        if history:
            # 使用更友好的名称作为 key
            display_name = {
                "^GSPC": "S&P500",
                "^IXIC": "NASDAQ",
                "^HSI": "HSI"
            }.get(symbol, symbol)
            price_history[display_name] = history
            print(f"  - {display_name}: {len(history)} 条历史记录")

    print(f"✓ 价格历史获取完成：共 {len(price_history)} 个资产")

    # 4. 生成 HTML
    print("\n[步骤 4] 生成仪表盘 HTML...")

    # 模拟 AI 分析（后续会接入真实的 Claude API）
    ai_insights = """市场分析摘要：

🔹 加密货币市场：BTC 和 ETH 今日均呈现上涨趋势。BTC 在 $89,000 附近震荡，24小时涨幅约 1.14%。ETH 表现更强，涨幅达 2.44%，显示市场情绪积极。

🔹 美股市场：三大指数表现分化。标普500指数微涨 0.19%，道琼斯工业平均指数上涨 0.66%，纳斯达克综合指数小幅下跌 0.03%，科技股承压。

🔹 港股市场：恒生指数强势上涨 2.76%，可能受到内地政策利好消息影响。

🔹 A股市场：上证指数微涨 0.09%，深证成指下跌 0.58%，创业板指下跌 1.23%，市场整体偏弱。

💡 投资建议：当前市场情绪谨慎乐观，建议关注港股和加密货币市场的机会，同时注意美股科技股的回调风险。"""

    html = render_dashboard_html(
        market_data=market_data,
        price_history=price_history,
        ai_insights=ai_insights,
        rss_data=None  # 暂时不测试 RSS 数据
    )

    print(f"✓ HTML 生成成功：{len(html)} 字符")

    # 5. 保存 HTML 文件
    print("\n[步骤 5] 保存 HTML 文件...")
    output_dir = Path("output/dashboard")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / f"dashboard_{market_data.date}_{market_data.crawl_time}.html"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✓ HTML 文件已保存: {output_file}")
    print(f"  文件大小: {output_file.stat().st_size:,} 字节")

    # 6. 同时保存一个 index.html（最新版本）
    index_file = output_dir / "index.html"
    with open(index_file, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✓ 最新版本已保存: {index_file}")

    # 7. 清理资源
    storage.cleanup()

    print("\n" + "=" * 60)
    print("✓ 测试完成！")
    print("=" * 60)
    print(f"\n📂 请在浏览器中打开: file://{output_file.absolute()}")
    print(f"   或访问: file://{index_file.absolute()}")

    return True


if __name__ == "__main__":
    try:
        success = test_dashboard()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
