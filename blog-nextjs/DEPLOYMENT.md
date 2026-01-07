# 部署指南

本文档提供完整的 Vercel 部署和配置指南。

> 💡 **首次部署？** 建议先查看 **[快速开始指南（QUICKSTART.md）](QUICKSTART.md)** - 这是一个更简化的、按步骤操作的入门版本，包含详细的截图和说明。
>
> 本文档适合需要了解完整配置选项和高级功能的用户。

## 前提条件

- [x] GitHub 账号
- [x] Vercel 账号（可使用 GitHub 登录）
- [x] Notion 账号和 API Token
- [x] Supabase 账号（如需金融功能）
- [x] GitHub 仓库（用于 Giscus 评论）

## 1. Vercel 部署

### 1.1 连接 GitHub 仓库

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New"** → **"Project"**
3. 选择你的 GitHub 仓库
4. 选择 `blog-nextjs` 目录（如果是 monorepo）

### 1.2 项目配置

**Framework Preset**: Next.js

**Root Directory**: `blog-nextjs`（如果是 monorepo）

**Build Command**:
```bash
npm run build
```

**Output Directory**: `.next`（默认）

**Install Command**:
```bash
npm install
```

### 1.3 环境变量配置

点击 **"Environment Variables"** 并添加以下变量：

#### 必需的环境变量

```bash
# Notion CMS 配置
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 网站基础信息
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_TITLE=敬湛飞轮精选
NEXT_PUBLIC_SITE_DESCRIPTION=分享加密货币、股市投资、个人成长的见解

# Giscus 评论配置
NEXT_PUBLIC_GISCUS_REPO=your-username/your-repo
NEXT_PUBLIC_GISCUS_REPO_ID=R_xxxxxxxxxxxxx
NEXT_PUBLIC_GISCUS_CATEGORY=General
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxxxxxxxxxxx
```

#### 可选的环境变量（金融功能）

```bash
# Supabase 配置（金融功能）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cron Job 安全密钥
CRON_SECRET=your-random-secret-key-here
```

### 1.4 部署

点击 **"Deploy"** 按钮，等待构建完成（通常需要 2-5 分钟）。

## 2. Notion CMS 配置

### 2.1 创建 Notion Integration

1. 访问 [Notion Integrations](https://www.notion.so/my-integrations)
2. 点击 **"+ New integration"**
3. 填写信息：
   - **Name**: Blog CMS
   - **Associated workspace**: 选择你的工作区
   - **Type**: Internal
4. 点击 **"Submit"**
5. 复制 **Internal Integration Token**（以 `secret_` 开头）

### 2.2 创建 Database

1. 在 Notion 中创建新页面
2. 添加 **Database - Table** 视图
3. 添加以下属性（Properties）:

| Property Name | Type | Required | Description |
|--------------|------|----------|-------------|
| Title | Title | ✅ | 文章标题 |
| Slug | Rich Text | ✅ | URL 路径（唯一） |
| Summary | Rich Text | ✅ | 文章摘要 |
| Category | Select | ✅ | 文章分类 |
| Tags | Multi-select | ❌ | 文章标签 |
| Published | Checkbox | ✅ | 是否发布 |
| PublishDate | Date | ✅ | 发布日期 |
| CoverImage | URL | ❌ | 封面图片 URL |
| Author | Rich Text | ❌ | 作者名称 |

### 2.3 连接 Integration 到 Database

1. 打开 Database 页面
2. 点击右上角 **"•••"** → **"Connections"**
3. 选择你创建的 Integration（Blog CMS）

### 2.4 获取 Database ID

从 Database 页面 URL 中提取 ID：

```
https://www.notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                      这是 Database ID
```

## 3. Supabase 配置（可选）

### 3.1 创建项目

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 点击 **"New project"**
3. 填写项目信息：
   - **Name**: blog-market-data
   - **Database Password**: 生成强密码并保存
   - **Region**: 选择最近的区域（如 Singapore）

### 3.2 执行数据库脚本

1. 进入项目 Dashboard
2. 点击左侧 **"SQL Editor"**
3. 点击 **"New query"**
4. 复制 `supabase/schema.sql` 的内容并粘贴
5. 点击 **"Run"** 执行

### 3.3 获取 API Keys

1. 点击左侧 **"Settings"** → **"API"**
2. 复制以下信息：
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (点击 "Reveal" 显示): `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **安全警告**: `service_role` key 拥有完全权限，只能用于服务端，绝不能暴露给客户端！

### 3.4 配置 RLS 策略

数据库脚本已包含 RLS 策略，但请验证：

1. 点击左侧 **"Authentication"** → **"Policies"**
2. 确认每个表都有策略：
   - `crypto_data`: 公开读取，service_role 写入
   - `stock_data`: 公开读取，service_role 写入
   - `price_history`: 公开读取，service_role 写入
   - `view_stats`: 公开读取和写入（用于浏览量统计）

## 4. Giscus 评论配置

### 4.1 准备 GitHub 仓库

1. 仓库必须是 **public**
2. 启用 **Discussions** 功能：
   - 进入仓库 **Settings** → **General**
   - 勾选 **Features** 下的 **Discussions**

### 4.2 安装 Giscus App

1. 访问 [Giscus App](https://github.com/apps/giscus)
2. 点击 **"Install"**
3. 选择仓库或授权所有仓库

### 4.3 配置 Giscus

1. 访问 [Giscus 配置页面](https://giscus.app/zh-CN)
2. 填写配置：
   - **仓库**: `your-username/your-repo`
   - **页面 ↔️ discussion 映射关系**: `pathname`
   - **Discussion 分类**: 选择或创建（建议 "General"）
   - **主题**: `preferred_color_scheme`（跟随系统）

3. 复制生成的配置：
   - `data-repo`: `NEXT_PUBLIC_GISCUS_REPO`
   - `data-repo-id`: `NEXT_PUBLIC_GISCUS_REPO_ID`
   - `data-category`: `NEXT_PUBLIC_GISCUS_CATEGORY`
   - `data-category-id`: `NEXT_PUBLIC_GISCUS_CATEGORY_ID`

## 5. Vercel Cron Jobs 配置

### 5.1 验证 vercel.json

确认 `vercel.json` 包含 cron 配置：

```json
{
  "crons": [
    {
      "path": "/api/cron/market",
      "schedule": "0 * * * *"
    }
  ]
}
```

**解释**:
- `schedule`: 每小时整点执行（使用 Cron 表达式）
- `path`: API 路由路径

### 5.2 生成 Cron Secret

```bash
# 使用 openssl 生成随机密钥
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

将生成的密钥添加到环境变量 `CRON_SECRET`。

### 5.3 测试 Cron Job

部署后，在 Vercel Dashboard 中：

1. 进入项目
2. 点击 **"Settings"** → **"Cron Jobs"**
3. 查看 cron 任务状态
4. 点击任务可以手动触发测试

## 6. 自定义域名配置

### 6.1 添加域名

在 Vercel 项目中：

1. 点击 **"Settings"** → **"Domains"**
2. 输入你的域名（如 `yourdomain.com`）
3. 点击 **"Add"**

### 6.2 配置 DNS

根据 Vercel 提供的说明，在你的域名注册商处添加 DNS 记录：

**选项 A: A Record**
```
Type: A
Name: @
Value: 76.76.21.21
```

**选项 B: CNAME Record（推荐）**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**www 子域名（可选）**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 6.3 等待 DNS 生效

- DNS 传播通常需要 24-48 小时
- 可使用 [DNS Checker](https://dnschecker.org/) 检查状态
- Vercel 会自动配置 SSL 证书（Let's Encrypt）

### 6.4 更新环境变量

部署完成后，更新 `NEXT_PUBLIC_SITE_URL`:

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 7. 监控和分析配置

### 7.1 Vercel Analytics（推荐）

1. 进入项目 Dashboard
2. 点击 **"Analytics"** 标签
3. 点击 **"Enable"**
4. 无需代码修改，自动启用

**功能**:
- 页面浏览量
- 访客统计
- 设备和浏览器分布
- 页面性能指标（Core Web Vitals）

### 7.2 Vercel Speed Insights（推荐）

1. 进入项目 Dashboard
2. 点击 **"Speed Insights"** 标签
3. 点击 **"Enable"**
4. 安装包：

```bash
npm install @vercel/speed-insights
```

5. 在 `src/app/layout.tsx` 中添加：

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 7.3 Google Analytics（可选）

1. 创建 [Google Analytics 4](https://analytics.google.com/) 账号
2. 获取 Measurement ID（格式：`G-XXXXXXXXXX`）
3. 安装 next-ga4：

```bash
npm install next-ga4
```

4. 在 `src/app/layout.tsx` 中添加：

```typescript
import { GoogleAnalytics } from 'next-ga4';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <GoogleAnalytics measurementId="G-XXXXXXXXXX" />
      </body>
    </html>
  );
}
```

5. 添加环境变量：

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 7.4 Sentry 错误监控（可选）

1. 注册 [Sentry](https://sentry.io/)
2. 创建新项目（选择 Next.js）
3. 安装 Sentry SDK：

```bash
npx @sentry/wizard@latest -i nextjs
```

4. 配置向导会自动创建：
   - `sentry.client.config.ts`
   - `sentry.server.config.ts`
   - `sentry.edge.config.ts`

5. 添加环境变量：

```bash
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxx
```

## 8. Sitemap 生成

### 8.1 创建 Sitemap 路由

创建 `src/app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next";
import { getPosts } from "@/lib/notion/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/article/${post.slug}`,
    lastModified: new Date(post.publishDate),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/market`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...postEntries,
  ];
}
```

### 8.2 创建 robots.txt

创建 `src/app/robots.ts`:

```typescript
import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/_next/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

### 8.3 验证生成

部署后访问：
- `https://yourdomain.com/sitemap.xml`
- `https://yourdomain.com/robots.txt`

### 8.4 提交到搜索引擎

**Google Search Console**:
1. 访问 [Google Search Console](https://search.google.com/search-console/)
2. 添加网站
3. 提交 Sitemap: `https://yourdomain.com/sitemap.xml`

**Bing Webmaster Tools**:
1. 访问 [Bing Webmaster](https://www.bing.com/webmasters/)
2. 添加网站
3. 提交 Sitemap

## 9. 部署检查清单

### 9.1 部署前检查

- [ ] 所有环境变量已配置
- [ ] Notion Database 已创建并连接
- [ ] Supabase 数据库已初始化（如需金融功能）
- [ ] Giscus 已配置（如需评论功能）
- [ ] `vercel.json` cron 配置正确
- [ ] 本地构建成功 (`npm run build`)

### 9.2 部署后检查

- [ ] 网站可访问
- [ ] 首页文章列表正常显示
- [ ] 文章详情页正常显示
- [ ] 金融市场页面数据正常（如启用）
- [ ] 搜索功能正常
- [ ] 评论功能正常（如启用）
- [ ] 暗色模式切换正常
- [ ] RSS 订阅可访问 (`/rss.xml`)
- [ ] Sitemap 可访问 (`/sitemap.xml`)
- [ ] 移动端显示正常

### 9.3 功能测试

**文章功能**:
- [ ] 创建新文章在 Notion
- [ ] 设置 Published = true
- [ ] 等待 1 小时（ISR revalidate）或手动触发重新部署
- [ ] 验证文章在首页显示
- [ ] 访问文章详情页
- [ ] 验证浏览量统计增加
- [ ] 测试评论发表

**金融功能**（如启用）:
- [ ] 访问市场页面
- [ ] 验证加密货币数据显示
- [ ] 验证股票数据显示
- [ ] 查看价格图表
- [ ] 验证 Cron Job 运行（检查 Supabase 数据更新时间）

**搜索功能**:
- [ ] 在首页搜索框输入关键词
- [ ] 验证搜索结果正确
- [ ] 验证关键词高亮

**暗色模式**:
- [ ] 点击主题切换按钮
- [ ] 验证颜色切换正常
- [ ] 验证主题持久化（刷新页面）

## 10. 性能优化建议

### 10.1 图片优化

使用 Next.js Image 组件：

```typescript
import Image from 'next/image';

<Image
  src="/cover.jpg"
  alt="Cover"
  width={1200}
  height={630}
  priority // 首屏图片使用 priority
/>
```

### 10.2 字体优化

已使用 `next/font` 优化，确保 `layout.tsx` 中：

```typescript
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
```

### 10.3 缓存策略

已配置最优缓存：
- 首页: ISR 1 小时
- 文章页: SSG + ISR 1 小时
- 市场页: ISR 1 分钟
- RSS: ISR 1 小时

### 10.4 Bundle 分析

```bash
# 安装分析工具
npm install @next/bundle-analyzer

# 创建 next.config.js 配置
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // 现有配置
})

# 运行分析
ANALYZE=true npm run build
```

## 11. 常见问题排查

### 11.1 构建失败

**问题**: "Cannot find module '@/...'**

**解决**:
- 检查 `tsconfig.json` 中的 paths 配置
- 确认文件路径正确

**问题**: "notion.databases.query is not a function"

**解决**:
- 使用 `(notion.databases as any).query()`
- 或更新 `@notionhq/client` 版本

### 11.2 Notion 数据不更新

**问题**: 新文章不显示

**解决**:
1. 确认文章 `Published = true`
2. 等待 ISR revalidate（1 小时）
3. 或在 Vercel 手动触发重新部署
4. 检查 Notion Integration 是否连接到 Database

### 11.3 Supabase 连接失败

**问题**: "Failed to fetch market data"

**解决**:
1. 检查环境变量是否正确
2. 验证 RLS 策略已启用
3. 检查 Supabase 项目是否暂停（免费版闲置 7 天后暂停）
4. 查看 Vercel 函数日志

### 11.4 Cron Job 不运行

**问题**: 市场数据不更新

**解决**:
1. 检查 `vercel.json` cron 配置
2. 验证 `CRON_SECRET` 环境变量
3. 在 Vercel Dashboard 查看 Cron 日志
4. 手动测试 API: `curl -X POST https://yourdomain.com/api/cron/market -H "Authorization: Bearer YOUR_CRON_SECRET"`

### 11.5 暗色模式闪烁

**问题**: 页面加载时主题闪烁

**解决**:
- 确认 `layout.tsx` 中有 `suppressHydrationWarning`
- 确认 ThemeProvider 有 `disableTransitionOnChange`

## 12. 维护和更新

### 12.1 内容更新

直接在 Notion 中：
1. 创建新文章
2. 设置 Published = true
3. 等待 1 小时自动更新（ISR）

### 12.2 代码更新

```bash
# 推送到 GitHub
git add .
git commit -m "Update features"
git push origin main

# Vercel 自动构建部署
```

### 12.3 依赖更新

```bash
# 检查过期依赖
npm outdated

# 更新所有依赖
npm update

# 测试构建
npm run build

# 推送更新
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### 12.4 数据备份

**Notion 备份**:
- Notion 自动保存版本历史
- 可在 Settings → Workspace → Export 导出

**Supabase 备份**:
1. 进入项目 Dashboard
2. Database → Backups
3. 手动触发备份或配置自动备份

## 13. 安全最佳实践

### 13.1 环境变量

- ✅ 使用 Vercel 环境变量（加密存储）
- ❌ 不要在代码中硬编码密钥
- ✅ 区分 `NEXT_PUBLIC_*`（客户端）和服务端变量
- ❌ 不要将 `service_role` key 暴露给客户端

### 13.2 API 路由保护

Cron Job 已使用 Bearer Token 保护：

```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### 13.3 Supabase RLS

确保 Row Level Security 已启用：
- 公开读取: 允许匿名用户查询
- 服务端写入: 只有 service_role 可写

### 13.4 依赖安全

```bash
# 检查漏洞
npm audit

# 自动修复
npm audit fix

# 定期更新
npm update
```

## 14. 联系和支持

### 文档资源

- [Next.js 文档](https://nextjs.org/docs)
- [Vercel 文档](https://vercel.com/docs)
- [Notion API 文档](https://developers.notion.com/)
- [Supabase 文档](https://supabase.com/docs)
- [Giscus 文档](https://giscus.app/)

### 问题排查

1. 检查 Vercel 函数日志
2. 查看浏览器控制台错误
3. 验证环境变量配置
4. 测试 API 端点

---

**部署成功后，你的博客将具备：**

- ✅ 服务端渲染（SSR）+ 增量静态再生成（ISR）
- ✅ Notion CMS 内容管理
- ✅ 金融市场数据展示
- ✅ 文章搜索和评论
- ✅ 暗色模式支持
- ✅ RSS 订阅
- ✅ SEO 优化（Sitemap、robots.txt）
- ✅ 性能监控和分析
- ✅ 自动化 Cron Jobs
- ✅ 完全响应式设计
