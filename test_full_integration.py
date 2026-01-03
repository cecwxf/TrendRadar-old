#!/usr/bin/env python3
# coding=utf-8
"""
完整集成测试 - 测试所有组件

测试流程：
1. 获取市场数据
2. 保存到数据库
3. 获取价格历史
4. AI 分析（可选）
5. 生成 HTML 仪表盘
6. 生成飞书通知
"""

import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from trendradar.market_dashboard import MarketDashboard


def test_full_integration():
    """完整集成测试"""

    print("=" * 70)
    print("🚀 TrendRadar 金融市场仪表盘 - 完整集成测试")
    print("=" * 70)

    # 配置
    print("\n📝 测试配置:")
    print(f"  - 数据目录: output")
    print(f"  - 时区: Asia/Shanghai")

    # 检查环境变量
    has_ai_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_feishu_webhook = bool(os.environ.get("FEISHU_WEBHOOK_URL"))

    print(f"  - ANTHROPIC_API_KEY: {'✓ 已配置' if has_ai_key else '✗ 未配置（将使用备用分析）'}")
    print(f"  - FEISHU_WEBHOOK_URL: {'✓ 已配置' if has_feishu_webhook else '✗ 未配置（将跳过通知）'}")

    # 创建仪表盘实例
    print("\n" + "=" * 70)
    dashboard = MarketDashboard(
        data_dir="output",
        timezone="Asia/Shanghai",
        enable_ai=True,  # 总是启用，即使没有 API key 也会使用备用分析
        enable_notifications=has_feishu_webhook  # 只在有 webhook 时启用
    )

    # 运行
    success = dashboard.run()

    # 结果总结
    print("\n" + "=" * 70)
    print("📊 测试结果总结")
    print("=" * 70)

    if success:
        print("\n✅ **所有测试通过！**")
        print("\n生成的文件:")

        # 检查数据库
        db_files = list(Path("output/market").glob("*.db"))
        print(f"  📂 数据库: {len(db_files)} 个")
        for db_file in db_files:
            print(f"     - {db_file}")

        # 检查仪表盘
        dashboard_files = list(Path("output/dashboard").glob("*.html"))
        print(f"  📂 仪表盘: {len(dashboard_files)} 个")
        for html_file in dashboard_files:
            print(f"     - {html_file}")

        # 检查飞书卡片（如果有）
        feishu_files = list(Path("output/feishu").glob("*.json"))
        if feishu_files:
            print(f"  📂 飞书卡片: {len(feishu_files)} 个")
            for feishu_file in feishu_files:
                print(f"     - {feishu_file}")

        print("\n📖 下一步:")
        print("  1. 在浏览器中打开 output/dashboard/index.html 查看仪表盘")
        print("  2. 配置 GitHub Secrets 后推送到 GitHub 启用自动更新")
        print("  3. 访问 https://your-username.github.io/TrendRadar 查看在线版本")

        print("\n🔧 配置 GitHub Secrets:")
        print("  - ANTHROPIC_API_KEY: Claude API 密钥（用于 AI 分析）")
        print("  - FEISHU_WEBHOOK_URL: 飞书机器人 Webhook（用于通知）")

    else:
        print("\n❌ **测试失败**")
        print("\n请检查上方的错误信息")

    return success


if __name__ == "__main__":
    try:
        success = test_full_integration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n💥 测试异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
