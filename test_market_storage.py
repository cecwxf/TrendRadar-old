#!/usr/bin/env python3
# coding=utf-8
"""
测试市场数据存储功能
"""

import sys
from pathlib import Path
from datetime import datetime

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from trendradar.crawler.crypto import CryptoFetcher
from trendradar.crawler.stocks import StockFetcher
from trendradar.storage.local import LocalStorageBackend
from trendradar.storage.market_models import MarketData
from trendradar.utils.time import format_date_folder, format_time_filename


def test_market_storage():
    """测试市场数据存储功能"""

    print("=" * 60)
    print("开始测试市场数据存储功能")
    print("=" * 60)

    # 1. 获取加密货币数据
    print("\n[步骤 1] 获取加密货币数据...")
    crypto_fetcher = CryptoFetcher()
    crypto_items = crypto_fetcher.fetch_prices()
    print(f"✓ 成功获取 {len(crypto_items)} 个加密货币数据")
    for symbol, item in crypto_items.items():
        print(f"  - {symbol}: ${item.price:,.2f} ({item.price_change_24h:+.2f}%)")

    # 2. 获取股票数据
    print("\n[步骤 2] 获取股票数据...")
    stock_fetcher = StockFetcher()
    stock_items = stock_fetcher.fetch_current()
    print(f"✓ 成功获取 {len(stock_items)} 个股票数据")
    for symbol, item in list(stock_items.items())[:5]:  # 只显示前5个
        print(f"  - {item.name} ({symbol}): ${item.price:.2f} ({item.change_percent:+.2f}%)")

    # 3. 构建 MarketData 对象
    print("\n[步骤 3] 构建 MarketData 对象...")
    market_data = MarketData(
        date=format_date_folder(),
        crawl_time=format_time_filename(),
        crypto_items=crypto_items,
        stock_items=stock_items,
        failed_sources=[],
    )
    print(f"✓ MarketData 对象创建成功")
    print(f"  - 日期: {market_data.date}")
    print(f"  - 抓取时间: {market_data.crawl_time}")
    print(f"  - 加密货币数量: {len(market_data.crypto_items)}")
    print(f"  - 股票数量: {len(market_data.stock_items)}")

    # 4. 保存到数据库
    print("\n[步骤 4] 保存到数据库...")
    storage = LocalStorageBackend(
        data_dir="output",
        enable_txt=False,
        enable_html=False,
        timezone="Asia/Shanghai"
    )

    success = storage.save_market_data(market_data)
    if success:
        print("✓ 数据保存成功！")
    else:
        print("✗ 数据保存失败！")
        return False

    # 5. 从数据库读取数据
    print("\n[步骤 5] 从数据库读取数据...")
    retrieved_data = storage.get_latest_market_data()

    if retrieved_data:
        print(f"✓ 数据读取成功！")
        print(f"  - 日期: {retrieved_data.date}")
        print(f"  - 抓取时间: {retrieved_data.crawl_time}")
        print(f"  - 加密货币数量: {len(retrieved_data.crypto_items)}")
        print(f"  - 股票数量: {len(retrieved_data.stock_items)}")

        # 验证数据一致性
        print("\n[验证] 检查数据一致性...")
        crypto_match = len(retrieved_data.crypto_items) == len(market_data.crypto_items)
        stock_match = len(retrieved_data.stock_items) == len(market_data.stock_items)

        if crypto_match and stock_match:
            print("✓ 数据一致性检查通过！")
        else:
            print("✗ 数据一致性检查失败！")
            return False

        # 显示读取的部分数据
        print("\n[样本数据] 加密货币:")
        for symbol, item in list(retrieved_data.crypto_items.items())[:2]:
            print(f"  - {symbol}: ${item.price:,.2f} ({item.price_change_24h:+.2f}%)")

        print("\n[样本数据] 股票:")
        for symbol, item in list(retrieved_data.stock_items.items())[:3]:
            print(f"  - {item.name}: ${item.price:.2f} ({item.change_percent:+.2f}%)")
    else:
        print("✗ 数据读取失败！")
        return False

    # 6. 测试价格历史查询
    print("\n[步骤 6] 测试价格历史查询...")

    # 查询 BTC 价格历史
    btc_history = storage.get_price_history(
        asset_type="crypto",
        symbol="BTC",
        hours=24
    )
    print(f"✓ BTC 价格历史: {len(btc_history)} 条记录")
    if btc_history:
        print(f"  最新价格: ${btc_history[-1]['price']:,.2f} @ {btc_history[-1]['timestamp']}")

    # 查询标普500价格历史
    sp500_history = storage.get_price_history(
        asset_type="stock",
        symbol="^GSPC",
        hours=24
    )
    print(f"✓ S&P 500 价格历史: {len(sp500_history)} 条记录")
    if sp500_history:
        print(f"  最新价格: ${sp500_history[-1]['price']:,.2f} @ {sp500_history[-1]['timestamp']}")

    # 7. 清理资源
    print("\n[步骤 7] 清理资源...")
    storage.cleanup()
    print("✓ 资源清理完成")

    print("\n" + "=" * 60)
    print("✓ 所有测试通过！市场数据存储功能正常工作")
    print("=" * 60)

    return True


if __name__ == "__main__":
    try:
        success = test_market_storage()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
