# coding=utf-8
"""
Claude AI 市场分析模块

使用 Claude API 对市场数据进行智能分析
"""

import os
from typing import Optional, Dict, List
from anthropic import Anthropic

from trendradar.storage.market_models import MarketData, CryptoItem, StockItem


class ClaudeMarketAnalyzer:
    """
    Claude 市场分析器

    使用 Claude API 分析加密货币和股票市场数据
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-sonnet-4-5-20250929"):
        """
        初始化分析器

        Args:
            api_key: Anthropic API Key（如果不提供，从环境变量 ANTHROPIC_API_KEY 读取）
            model: Claude 模型名称
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("需要提供 ANTHROPIC_API_KEY 环境变量或 api_key 参数")

        self.model = model
        self.client = Anthropic(api_key=self.api_key)

    def analyze_market(self, market_data: MarketData, include_advice: bool = True) -> str:
        """
        分析市场数据

        Args:
            market_data: 市场数据
            include_advice: 是否包含投资建议

        Returns:
            AI 分析结果（Markdown 格式）
        """

        # 构建分析提示词
        prompt = self._build_analysis_prompt(market_data, include_advice)

        try:
            # 调用 Claude API
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.7,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # 提取文本内容
            analysis = message.content[0].text

            print(f"[Claude 分析] 成功生成分析报告（{len(analysis)} 字符）")
            return analysis

        except Exception as e:
            print(f"[Claude 分析] API 调用失败: {e}")
            return self._generate_fallback_analysis(market_data)

    def _build_analysis_prompt(self, market_data: MarketData, include_advice: bool) -> str:
        """构建分析提示词"""

        # 格式化加密货币数据
        crypto_summary = self._format_crypto_data(market_data.crypto_items)

        # 格式化股票数据
        stock_summary = self._format_stock_data(market_data.stock_items)

        # 构建提示词
        prompt = f"""你是一位资深的金融分析师。请分析以下市场数据，并提供专业的市场洞察。

**日期**: {market_data.date}
**时间**: {market_data.crawl_time}

## 📈 加密货币市场数据

{crypto_summary}

## 📊 股票市场数据

{stock_summary}

请提供以下分析：

1. **市场概况**：总结当前加密货币和股票市场的整体表现
2. **关键趋势**：识别市场中的重要趋势和变化
3. **板块分析**：分析不同市场（美股、港股、A股、加密货币）的表现差异
4. **风险提示**：指出当前市场的潜在风险
{'5. **投资建议**：基于当前数据提供简要的投资策略建议' if include_advice else ''}

要求：
- 使用中文输出
- 语言专业、客观、简洁
- 使用 Markdown 格式
- 重点突出关键数据和趋势
- 每个部分使用表情符号标记（如 🔹、💡、⚠️）
"""

        return prompt

    def _format_crypto_data(self, crypto_items: Dict[str, CryptoItem]) -> str:
        """格式化加密货币数据"""
        if not crypto_items:
            return "（暂无数据）"

        lines = []
        for symbol, item in crypto_items.items():
            change_indicator = "📈" if item.price_change_24h >= 0 else "📉"
            lines.append(
                f"- **{symbol}**: ${item.price:,.2f} "
                f"{change_indicator} {item.price_change_24h:+.2f}% "
                f"| 成交量: ${item.volume_24h:,.0f}"
            )

        return "\n".join(lines)

    def _format_stock_data(self, stock_items: Dict[str, StockItem]) -> str:
        """格式化股票数据"""
        if not stock_items:
            return "（暂无数据）"

        # 按市场分组
        markets = {"US": [], "HK": [], "CN": []}

        for symbol, item in stock_items.items():
            change_indicator = "📈" if item.change >= 0 else "📉"
            line = (
                f"- **{item.name}**: ${item.price:,.2f} "
                f"{change_indicator} {item.change:+.2f} ({item.change_percent:+.2f}%) "
                f"| 成交量: {item.volume:,}"
            )
            markets.get(item.market, []).append(line)

        # 组合输出
        sections = []
        if markets["US"]:
            sections.append("### 美股\n" + "\n".join(markets["US"]))
        if markets["HK"]:
            sections.append("### 港股\n" + "\n".join(markets["HK"]))
        if markets["CN"]:
            sections.append("### A股\n" + "\n".join(markets["CN"]))

        return "\n\n".join(sections)

    def _generate_fallback_analysis(self, market_data: MarketData) -> str:
        """
        生成备用分析（当 API 调用失败时使用）

        Args:
            market_data: 市场数据

        Returns:
            简单的统计分析
        """

        analysis_lines = ["## 📊 市场数据概览\n"]

        # 加密货币分析
        if market_data.crypto_items:
            analysis_lines.append("### 💰 加密货币市场\n")

            crypto_gains = [item for item in market_data.crypto_items.values() if item.price_change_24h >= 0]
            crypto_losses = [item for item in market_data.crypto_items.values() if item.price_change_24h < 0]

            if crypto_gains:
                avg_gain = sum(item.price_change_24h for item in crypto_gains) / len(crypto_gains)
                analysis_lines.append(f"🔹 上涨: {len(crypto_gains)} 个，平均涨幅 {avg_gain:.2f}%")

            if crypto_losses:
                avg_loss = sum(item.price_change_24h for item in crypto_losses) / len(crypto_losses)
                analysis_lines.append(f"🔹 下跌: {len(crypto_losses)} 个，平均跌幅 {avg_loss:.2f}%")

            analysis_lines.append("")

        # 股票分析
        if market_data.stock_items:
            analysis_lines.append("### 📊 股票市场\n")

            stock_gains = [item for item in market_data.stock_items.values() if item.change >= 0]
            stock_losses = [item for item in market_data.stock_items.values() if item.change < 0]

            if stock_gains:
                avg_gain = sum(item.change_percent for item in stock_gains) / len(stock_gains)
                analysis_lines.append(f"🔹 上涨: {len(stock_gains)} 个指数，平均涨幅 {avg_gain:.2f}%")

            if stock_losses:
                avg_loss = sum(item.change_percent for item in stock_losses) / len(stock_losses)
                analysis_lines.append(f"🔹 下跌: {len(stock_losses)} 个指数，平均跌幅 {avg_loss:.2f}%")

            analysis_lines.append("")

        analysis_lines.append("---\n")
        analysis_lines.append("⚠️ **注意**: Claude API 暂时不可用，以上为简化统计分析。")

        return "\n".join(analysis_lines)

    def analyze_with_context(
        self,
        market_data: MarketData,
        previous_data: Optional[MarketData] = None,
        news_context: Optional[str] = None
    ) -> str:
        """
        带上下文的市场分析

        Args:
            market_data: 当前市场数据
            previous_data: 上一次的市场数据（可选）
            news_context: 相关新闻上下文（可选）

        Returns:
            AI 分析结果
        """

        # 构建增强的提示词
        prompt_parts = [self._build_analysis_prompt(market_data, include_advice=True)]

        # 添加历史对比
        if previous_data:
            comparison = self._build_comparison_context(market_data, previous_data)
            prompt_parts.append(f"\n## 📉 与上次数据对比\n\n{comparison}")

        # 添加新闻上下文
        if news_context:
            prompt_parts.append(f"\n## 📰 相关新闻\n\n{news_context}")
            prompt_parts.append("\n请结合以上新闻信息，分析市场变化的可能原因。")

        prompt = "\n".join(prompt_parts)

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=3000,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text

        except Exception as e:
            print(f"[Claude 分析] API 调用失败: {e}")
            return self._generate_fallback_analysis(market_data)

    def _build_comparison_context(self, current: MarketData, previous: MarketData) -> str:
        """构建数据对比上下文"""
        comparisons = []

        # 对比加密货币
        for symbol in current.crypto_items.keys():
            if symbol in previous.crypto_items:
                curr = current.crypto_items[symbol]
                prev = previous.crypto_items[symbol]
                price_change = ((curr.price - prev.price) / prev.price) * 100

                comparisons.append(
                    f"- {symbol}: ${prev.price:,.2f} → ${curr.price:,.2f} "
                    f"({price_change:+.2f}%)"
                )

        # 对比股票
        for symbol in current.stock_items.keys():
            if symbol in previous.stock_items:
                curr = current.stock_items[symbol]
                prev = previous.stock_items[symbol]
                price_change = ((curr.price - prev.price) / prev.price) * 100

                comparisons.append(
                    f"- {curr.name}: ${prev.price:,.2f} → ${curr.price:,.2f} "
                    f"({price_change:+.2f}%)"
                )

        return "\n".join(comparisons) if comparisons else "（无可对比数据）"


def analyze_market_simple(market_data: MarketData, api_key: Optional[str] = None) -> str:
    """
    简单的市场分析函数（便捷接口）

    Args:
        market_data: 市场数据
        api_key: Claude API Key（可选）

    Returns:
        分析结果
    """
    try:
        analyzer = ClaudeMarketAnalyzer(api_key=api_key)
        return analyzer.analyze_market(market_data)
    except ValueError:
        print("[Claude 分析] 未配置 API Key，使用备用分析")
        analyzer = ClaudeMarketAnalyzer.__new__(ClaudeMarketAnalyzer)
        return analyzer._generate_fallback_analysis(market_data)
