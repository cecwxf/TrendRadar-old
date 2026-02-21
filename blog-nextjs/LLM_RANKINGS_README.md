# LLM 排行榜功能说明

## 功能概述

LLM 排行榜是一个类似 [OpenRouter Rankings](https://openrouter.ai/rankings) 的功能模块，用于展示各类大语言模型的使用情况、性能指标和市场份额。

## 功能特性

### 1. 总体排名
- 展示所有 LLM 模型的综合排名
- 包含以下指标：
  - 使用量（Token 数）
  - 请求数
  - 平均延迟
  - 质量评分
  - 排名趋势（上升/下降/稳定）

### 2. 使用趋势图
- 最近 30 天的使用量趋势
- 支持多模型对比
- 交互式图表（ECharts）
- 数据缩放功能

### 3. 市场份额
- 按提供商统计的市场份额
- 饼图可视化
- 显示 Token 总量和模型数量

### 4. 分类排名
- 按用途分类（通用、编程、多模态）
- 每个分类的 Top 5 模型
- 分类总使用量统计

## 技术架构

### 前端组件
```
blog-nextjs/src/
├── app/
│   ├── llm/page.tsx              # 主页面
│   └── api/llm/leaderboard/      # API 路由
├── components/llm/
│   ├── RankingTable.tsx          # 排名表格
│   ├── UsageTrendsChart.tsx      # 使用趋势图
│   ├── MarketShareChart.tsx      # 市场份额图
│   └── CategoryRankings.tsx      # 分类排名
├── lib/llm/
│   └── mock-data.ts              # 模拟数据生成器
└── types/
    └── llm.ts                    # 类型定义
```

### 数据模型

#### LLMModel（模型信息）
```typescript
{
  id: string;              // 模型ID
  name: string;            // 显示名称
  provider: string;        // 提供商
  category: string;        // 分类
  context_length: number;  // 上下文长度
  release_date: string;    // 发布日期
}
```

#### ModelMetrics（性能指标）
```typescript
{
  total_tokens: number;      // 总Token数
  total_requests: number;    // 总请求数
  avg_latency_ms: number;    // 平均延迟
  quality_score: number;     // 质量评分
  // ... 更多指标
}
```

## 使用方法

### 访问排行榜
1. 启动开发服务器：
   ```bash
   cd blog-nextjs
   npm run dev
   ```

2. 访问 http://localhost:3000/llm

### 导航
- 页面顶部提供快速导航按钮
- 点击可跳转到对应板块：
  - 总体排名
  - 使用趋势
  - 市场份额
  - 分类排名

## 数据源配置

### 当前状态
目前使用模拟数据（`lib/llm/mock-data.ts`），包含以下模型：
- Claude Opus 4.6 / Sonnet 4.6 (Anthropic)
- GPT-4 Turbo / GPT-4o (OpenAI)
- Gemini 2.0 Flash (Google)
- DeepSeek V3 (DeepSeek)
- Qwen 2.5 Coder (Alibaba)
- Llama 3.3 70B (Meta)
- Grok 2 (xAI)
- Mistral Large 2 (Mistral AI)

### 接入真实数据源

#### 方案 1: API 接入
修改 `app/api/llm/leaderboard/route.ts`：

```typescript
export async function GET() {
  try {
    // 替换为真实 API 调用
    const response = await fetch('https://your-api.com/llm/rankings');
    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // 错误处理
  }
}
```

#### 方案 2: 数据库接入
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('llm_rankings')
    .select('*')
    .order('rank', { ascending: true });

  // 处理数据...
}
```

#### 方案 3: Python 后端集成
在 TrendRadar Python 后端添加 LLM 数据抓取：

```python
# trendradar/crawler/llm_fetcher.py
class LLMDataFetcher:
    def fetch_rankings(self):
        # 从各个来源抓取 LLM 使用数据
        pass

    def calculate_metrics(self):
        # 计算性能指标
        pass
```

然后通过 API 暴露给前端。

## 自定义配置

### 修改模型列表
编辑 `lib/llm/mock-data.ts` 中的 `MOCK_MODELS` 数组：

```typescript
const MOCK_MODELS: LLMModel[] = [
  {
    id: "your-model-id",
    name: "Your Model Name",
    provider: "Your Provider",
    category: "通用",
    context_length: 100000,
    release_date: "2025-01-01",
  },
  // 添加更多模型...
];
```

### 调整更新频率
修改 `app/api/llm/leaderboard/route.ts` 中的缓存时间：

```typescript
export const revalidate = 3600; // 改为你需要的秒数
```

### 自定义图表样式
修改各个图表组件中的 ECharts 配置：
- `UsageTrendsChart.tsx` - 折线图
- `MarketShareChart.tsx` - 饼图

## 性能优化

### 缓存策略
- API 响应缓存 1 小时（可调整）
- 使用 ISR (Incremental Static Regeneration)
- 客户端数据缓存

### 加载优化
- 骨架屏加载状态
- 懒加载图表组件
- 响应式设计

## 未来扩展

### 计划功能
1. 实时数据更新（WebSocket）
2. 用户自定义筛选器
3. 模型对比功能
4. 历史数据回溯
5. 导出报告功能
6. 更多可视化图表类型

### 数据源扩展
- OpenRouter API 集成
- HuggingFace 模型数据
- 自建监控系统数据
- 第三方评测数据

## 故障排查

### 常见问题

1. **图表不显示**
   - 检查 ECharts 是否正确安装
   - 查看浏览器控制台错误
   - 确认数据格式正确

2. **数据加载失败**
   - 检查 API 路由是否正常
   - 查看网络请求状态
   - 确认数据生成器无错误

3. **样式问题**
   - 确认 Tailwind CSS 配置正确
   - 检查暗色模式支持
   - 验证响应式断点

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个功能！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证

与 TrendRadar 项目保持一致。
