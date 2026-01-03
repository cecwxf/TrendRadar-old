#!/usr/bin/env python3
# coding=utf-8
"""
测试 Claude 市场分析功能
"""

import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from trendradar.crawler.crypto import CryptoFetcher
from trendradar.crawler.stocks import StockFetcher
from trendradar.storage.market_models import MarketData
from trendradar.analysis.claude_analyzer import ClaudeMarketAnalyzer, analyze_market_simple
from trendradar.utils.time import format_date_folder, format_time_filename


def test_claude_analyzer():
    """测试 Claude 分析器"""

    print("=" * 60)
    print("开始测试 Claude 市场分析功能")
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

    # 2. 检查 API Key
    print("\n[步骤 2] 检查 Claude API Key...")
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    if api_key:
        print(f"✓ 检测到 API Key: {api_key[:10]}...{api_key[-4:]}")
        use_real_api = True
    else:
        print("⚠️  未检测到 ANTHROPIC_API_KEY 环境变量")
        print("   将使用备用分析功能（统计分析）")
        use_real_api = False

    # 3. 执行分析
    print("\n[步骤 3] 执行市场分析...")

    if use_real_api:
        try:
            analyzer = ClaudeMarketAnalyzer(api_key=api_key)
            print("✓ Claude 分析器初始化成功")

            print("\n正在调用 Claude API 分析市场数据...")
            analysis = analyzer.analyze_market(market_data, include_advice=True)

            print("✓ 分析完成！")

        except Exception as e:
            print(f"✗ Claude API 调用失败: {e}")
            print("  回退到备用分析...")
            analysis = analyze_market_simple(market_data)

    else:
        # 使用备用分析
        analysis = analyze_market_simple(market_data)
        print("✓ 备用分析完成")

    # 4. 输出分析结果
    print("\n" + "=" * 60)
    print("📊 市场分析报告")
    print("=" * 60)
    print(analysis)
    print("=" * 60)

    # 5. 保存分析结果
    print("\n[步骤 4] 保存分析结果...")
    output_dir = Path("output/analysis")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / f"analysis_{market_data.date}_{market_data.crawl_time}.md"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"# 市场分析报告\n\n")
        f.write(f"**日期**: {market_data.date}\n")
        f.write(f"**时间**: {market_data.crawl_time}\n")
        f.write(f"**分析引擎**: {'Claude API' if use_real_api else '备用统计分析'}\n\n")
        f.write("---\n\n")
        f.write(analysis)

    print(f"✓ 分析结果已保存: {output_file}")
    print(f"  文件大小: {output_file.stat().st_size:,} 字节")

    # 6. 测试带上下文的分析（如果有 API）
    if use_real_api:
        print("\n[步骤 5] 测试带上下文的分析...")
        try:
            news_context = """
硅谷王川最新推文：
- 加密货币市场持续看涨，机构投资者入场明显
- 美联储利率政策转向，可能刺激风险资产上涨
- 港股受益于内地政策利好，恒生指数创近期新高
            """

            analyzer = ClaudeMarketAnalyzer(api_key=api_key)
            context_analysis = analyzer.analyze_with_context(
                market_data=market_data,
                news_context=news_context.strip()
            )

            print("✓ 带上下文分析完成！")

            # 保存带上下文的分析
            context_file = output_dir / f"context_analysis_{market_data.date}_{market_data.crawl_time}.md"
            with open(context_file, "w", encoding="utf-8") as f:
                f.write(f"# 市场分析报告（含新闻上下文）\n\n")
                f.write(f"**日期**: {market_data.date}\n")
                f.write(f"**时间**: {market_data.crawl_time}\n\n")
                f.write("---\n\n")
                f.write(context_analysis)

            print(f"✓ 上下文分析已保存: {context_file}")

        except Exception as e:
            print(f"✗ 带上下文分析失败: {e}")

    print("\n" + "=" * 60)
    print("✓ 测试完成！")
    print("=" * 60)

    return True


if __name__ == "__main__":
    try:
        success = test_claude_analyzer()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
