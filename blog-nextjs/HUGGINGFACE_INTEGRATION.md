# HuggingFace 数据源集成指南

## 概述

LLM 排行榜现已集成 HuggingFace API，可以获取真实的模型数据和下载统计。

## 功能特性

### 真实数据
- ✅ 从 HuggingFace 获取真实模型列表
- ✅ 基于实际下载量排名
- ✅ 真实的模型元数据（作者、标签、创建时间等）
- ✅ 自动分类（通用、编程、多模态）
- ✅ 提供商识别（Meta、OpenAI、Google 等）

### 数据指标
- **下载量**: 真实的模型下载次数
- **点赞数**: 社区点赞数量
- **使用量估算**: 基于下载量的使用量估算
- **请求数估算**: 基于下载量的 API 请求估算
- **其他指标**: 延迟、吞吐量等（模拟数据）

### 自动回退
如果 HuggingFace API 不可用，系统会自动回退到模拟数据，确保服务可用性。

## 配置说明

### 环境变量

创建或编辑 `.env.local` 文件：

```bash
# 数据源选择
LLM_DATA_SOURCE=huggingface

# HuggingFace 配置
HF_MODEL_LIMIT=50                    # 获取模型数量（默认 50）
HF_FILTER=text-generation            # 筛选条件
HF_SORT_BY=downloads                 # 排序方式: downloads | likes | trending
HF_API_TOKEN=hf_xxxxxxxxxxxxx        # API Token（可选）

# 缓存配置
LLM_CACHE_TTL=3600                   # 缓存 1 小时
LLM_CACHE_SWR=7200                   # stale-while-revalidate 2 小时

# 趋势配置
LLM_TRENDS_DAYS=30                   # 显示 30 天趋势
LLM_TRENDS_TOP_N=10                  # Top 10 模型
```

### 配置选项详解

#### 1. 数据源选择
```bash
LLM_DATA_SOURCE=huggingface  # 使用 HuggingFace 数据
# 或
LLM_DATA_SOURCE=mock         # 使用模拟数据
```

#### 2. HuggingFace API Token（可选）

获取 API Token 可以提高速率限制：

1. 访问 https://huggingface.co/settings/tokens
2. 创建新的 Access Token
3. 复制 Token 并添加到 `.env.local`：
   ```bash
   HF_API_TOKEN=hf_xxxxxxxxxxxxx
   ```

**注意**: Token 是可选的，不配置也能正常使用，但可能受到速率限制。

#### 3. 筛选条件

```bash
# 只显示文本生成模型
HF_FILTER=text-generation

# 显示所有模型
HF_FILTER=

# 其他筛选选项
HF_FILTER=conversational      # 对话模型
HF_FILTER=text2text-generation # 文本转换模型
```

#### 4. 排序方式

```bash
HF_SORT_BY=downloads  # 按下载量排序（推荐）
HF_SORT_BY=likes      # 按点赞数排序
HF_SORT_BY=trending   # 按趋势排序
```

## 使用方法

### 1. 安装依赖

```bash
cd blog-nextjs
npm install
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.llm.example .env.local

# 编辑配置（可选）
nano .env.local
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问排行榜

```
http://localhost:3000/llm
```

## 数据流程

```
用户请求
    ↓
API 路由 (/api/llm/leaderboard)
    ↓
尝试获取 HuggingFace 数据
    ↓
成功? ──→ 是 ──→ 返回真实数据
    ↓
    否
    ↓
回退到模拟数据
    ↓
返回响应
```

## 数据转换

### HuggingFace 模型 → LLM 模型

```typescript
HuggingFace 模型:
{
  id: "meta-llama/Llama-3.3-70B-Instruct",
  downloads: 1234567,
  likes: 890,
  tags: ["text-generation", "llama"],
  ...
}

转换为:
{
  id: "meta-llama/Llama-3.3-70B-Instruct",
  name: "Llama-3.3-70B-Instruct",
  provider: "Meta",
  category: "通用",
  ...
}
```

### 指标估算

基于真实下载量估算其他指标：

```typescript
下载量 (downloads) → 真实数据
点赞数 (likes) → 真实数据
请求数 = downloads × 0.1
Token数 = 请求数 × 1000
活跃用户 = likes × 10
```

## API 响应示例

### 成功响应

```json
{
  "success": true,
  "data": {
    "overall_rankings": [
      {
        "rank": 1,
        "model": {
          "id": "meta-llama/Llama-3.3-70B-Instruct",
          "name": "Llama-3.3-70B-Instruct",
          "provider": "Meta",
          "category": "通用",
          "release_date": "2024-12-06T00:00:00.000Z"
        },
        "metrics": {
          "model_id": "meta-llama/Llama-3.3-70B-Instruct",
          "total_tokens": 123456789000,
          "total_requests": 12345678,
          "active_users": 8900,
          "avg_latency_ms": 850,
          "quality_score": 92.5,
          "timestamp": "2026-02-21T12:00:00.000Z"
        },
        "trend": "up",
        "rank_change": 2
      }
      // ... 更多模型
    ],
    "usage_trends": [...],
    "market_shares": [...],
    "category_rankings": [...],
    "last_updated": "2026-02-21T12:00:00.000Z",
    "data_period": {
      "start": "2026-02-14",
      "end": "2026-02-21"
    }
  },
  "timestamp": "2026-02-21T12:00:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Failed to fetch LLM leaderboard data",
  "timestamp": "2026-02-21T12:00:00.000Z"
}
```

## 性能优化

### 1. 缓存策略

- **服务端缓存**: 1 小时（可配置）
- **CDN 缓存**: stale-while-revalidate 2 小时
- **客户端缓存**: 浏览器自动缓存

### 2. 速率限制

HuggingFace API 速率限制：
- **无 Token**: ~60 请求/小时
- **有 Token**: ~1000 请求/小时

建议配置 API Token 以提高限制。

### 3. 错误处理

- 自动重试（3次）
- 超时设置（10秒）
- 自动回退到模拟数据

## 监控和日志

### 控制台日志

```bash
# 成功获取数据
✅ 成功获取 HuggingFace 数据

# 回退到模拟数据
⚠️ HuggingFace 数据获取失败，使用模拟数据: Error: ...

# API 错误
❌ 获取 LLM 排行榜数据失败: Error: ...
```

### 检查数据源

在浏览器开发者工具中查看 API 响应，检查是否使用了 HuggingFace 数据。

## 故障排查

### 问题 1: 无法获取 HuggingFace 数据

**症状**: 控制台显示 "HuggingFace 数据获取失败"

**解决方案**:
1. 检查网络连接
2. 验证 HuggingFace API 是否可访问
3. 检查速率限制（配置 API Token）
4. 查看详细错误信息

### 问题 2: 数据更新不及时

**症状**: 排行榜数据没有更新

**解决方案**:
1. 清除浏览器缓存
2. 等待缓存过期（默认 1 小时）
3. 调整 `LLM_CACHE_TTL` 环境变量
4. 重启开发服务器

### 问题 3: 速率限制

**症状**: 频繁请求导致 429 错误

**解决方案**:
1. 配置 HuggingFace API Token
2. 增加缓存时间
3. 减少请求频率

### 问题 4: 模型分类不准确

**症状**: 某些模型分类错误

**解决方案**:
1. 检查 `CATEGORY_MAP` 配置
2. 添加更多标签映射
3. 手动调整分类逻辑

## 扩展功能

### 1. 添加更多数据源

可以扩展支持其他数据源：

```typescript
// src/lib/llm/openrouter-fetcher.ts
export async function fetchOpenRouterData() {
  // 实现 OpenRouter 数据获取
}

// src/app/api/llm/leaderboard/route.ts
import { fetchOpenRouterData } from "@/lib/llm/openrouter-fetcher";

// 合并多个数据源
const hfData = await fetchLeaderboardData();
const orData = await fetchOpenRouterData();
const mergedData = mergeData(hfData, orData);
```

### 2. 自定义指标计算

修改 `generateMetrics` 函数：

```typescript
function generateMetrics(hfModel: HFModel, rank: number): ModelMetrics {
  // 自定义指标计算逻辑
  return {
    // ... 你的指标
  };
}
```

### 3. 添加更多筛选条件

在配置中添加更多筛选选项：

```typescript
export const LLM_CONFIG = {
  huggingface: {
    // 添加更多筛选条件
    minDownloads: 1000,
    minLikes: 10,
    excludeTags: ["deprecated"],
  },
};
```

## 最佳实践

1. **配置 API Token**: 提高速率限制
2. **合理设置缓存**: 平衡数据新鲜度和性能
3. **监控日志**: 及时发现问题
4. **定期更新**: 保持依赖包最新
5. **备份方案**: 确保模拟数据可用

## 相关资源

- [HuggingFace API 文档](https://huggingface.co/docs/hub/api)
- [HuggingFace Models](https://huggingface.co/models)
- [Next.js 数据获取](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [LLM 排行榜完整文档](./LLM_RANKINGS_README.md)

## 支持

如有问题，请：
1. 查看本文档的故障排查章节
2. 检查控制台日志
3. 提交 GitHub Issue

---

**更新时间**: 2026-02-21
**版本**: v2.0.0 (HuggingFace 集成)
