# Vercel 部署故障排查指南

## 问题：404 NOT_FOUND

### 原因分析

404 错误通常是因为构建时无法生成静态页面，可能的原因：

1. **环境变量未配置** - Vercel 上没有设置 `NOTION_TOKEN` 和 `NOTION_DATABASE_ID`
2. **构建时 API 访问失败** - `generateStaticParams` 在构建时调用 Notion API 失败
3. **Notion 数据库为空** - 没有已发布的文章

---

## 解决方案

### 方案 1：检查 Vercel 环境变量（首选）

1. 登录 Vercel Dashboard
2. 进入你的项目 → Settings → Environment Variables
3. 确保已添加以下变量：

```bash
NOTION_TOKEN=你的Notion集成Token
NOTION_DATABASE_ID=你的Notion数据库ID
```

4. **重要**：环境变量添加后，需要 **重新部署** 才能生效
   - 进入 Deployments 页面
   - 点击最新的部署 → 右上角三个点 → Redeploy

### 方案 2：检查构建日志

1. 在 Vercel Dashboard 中打开你的项目
2. 进入 Deployments 页面
3. 点击最新的部署，查看构建日志
4. 搜索关键词：
   - `Error fetching posts from Notion`
   - `NOTION_TOKEN not configured`
   - `generateStaticParams`

如果看到 Notion 相关错误，说明环境变量配置有问题。

### 方案 3：使用动态渲染（临时方案）

如果急需上线，可以暂时关闭静态生成，使用完全动态渲染：

在 `src/app/article/[slug]/page.tsx` 中添加：

```typescript
// 添加在文件顶部，export 语句之前
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// 注释掉 generateStaticParams
// export async function generateStaticParams() { ... }
```

**注意**：这会导致每次访问都调用 Notion API，响应较慢，建议只作为临时方案。

---

## 验证步骤

### 1. 检查 Notion 数据库

确保至少有一篇文章的 `Published` 复选框被勾选。

### 2. 本地测试构建

在本地运行生产构建，检查是否有错误：

```bash
npm run build
npm run start
```

如果本地构建失败，修复错误后再部署到 Vercel。

### 3. 检查 Vercel 函数日志

部署后，访问你的网站：
- 打开 Vercel Dashboard → 你的项目 → Functions
- 查看实时日志，看是否有 Notion API 错误

---

## 常见错误及解决方法

### 错误 1: "NOTION_TOKEN not configured"

**原因**：Vercel 环境变量未设置

**解决**：在 Vercel 项目设置中添加 `NOTION_TOKEN` 环境变量，然后重新部署

### 错误 2: "Could not find database with ID"

**原因**：
- `NOTION_DATABASE_ID` 配置错误
- Notion Integration 未连接到 Database

**解决**：
1. 检查 Database ID 是否正确
2. 在 Notion 中：Database → ··· → Connections → 连接你的 Integration

### 错误 3: "API token is invalid"

**原因**：`NOTION_TOKEN` 配置错误

**解决**：重新复制 Integration Token，确保完整复制（以 `ntn_` 开头）

### 错误 4: 构建成功但访问 404

**原因**：`generateStaticParams` 返回空数组，没有生成任何静态页面

**解决**：
1. 检查 Notion 中是否有已发布的文章（Published = true）
2. 查看构建日志中是否有 "Error fetching posts" 错误
3. 使用方案 3 切换到动态渲染

---

## 推荐配置（最佳实践）

在 Vercel 中设置以下环境变量：

```bash
# 必需
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxx

# 可选（如果需要金融功能）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# 可选（如果需要评论功能）
NEXT_PUBLIC_GISCUS_REPO=your-username/your-repo
NEXT_PUBLIC_GISCUS_REPO_ID=R_xxx
NEXT_PUBLIC_GISCUS_CATEGORY=General
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxx
```

部署后等待 1-2 分钟，Vercel 会自动构建并发布你的网站。

---

## 调试技巧

### 查看 Vercel 实时日志

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 查看实时日志
vercel logs [deployment-url] --follow
```

### 测试 Notion API 连接

在 Vercel Functions 中创建测试端点，验证 API 连接：

创建 `src/app/api/test-notion/route.ts`：

```typescript
import { NextResponse } from 'next/server';
import { getPosts } from '@/lib/notion/client';

export async function GET() {
  try {
    const posts = await getPosts();
    return NextResponse.json({
      success: true,
      count: posts.length,
      posts: posts.map(p => ({ id: p.id, title: p.title }))
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

部署后访问 `https://你的域名/api/test-notion` 检查响应。
