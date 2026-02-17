# 🚀 快速开始指南

这是一个最简化的部署流程，只需 **15-20 分钟**即可完成基础部署。

## 📋 准备工作检查清单

在开始之前，请确保你有：

- [ ] GitHub 账号
- [ ] Notion 账号（免费）
- [ ] Vercel 账号（免费，可用 GitHub 登录）

**注意**：金融功能（Supabase）和评论功能（Giscus）是**可选的**，可以稍后再配置。

---

## 第一步：准备 Notion CMS（5 分钟）

> 💡 **已有 Notion workspace？** 太好了！你可以直接使用现有的 workspace，不需要创建新的。

### 1.1 创建 Notion Integration

**最简单的方法（推荐）：**

1. **直接点击这个链接**：[https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)

2. **登录后**，你会看到自己的 workspace 名称在页面上

2. 如果页面显示"No integrations yet"（还没有集成）或看到已有的集成列表

3. 找到页面上的按钮（可能是以下任意一种）：
   - **"+ New integration"**（蓝色按钮）
   - **"Create new integration"**
   - **"+ Create integration"**

**方法 2：从 Notion 设置进入**

如果上面的链接不行，尝试：

1. 打开 Notion 应用或网页版

2. 点击左侧边栏底部的 **"Settings & members"**（设置和成员）

3. 找到左侧菜单中的以下选项之一：
   - **"Connections"** → **"Develop or manage integrations"**
   - **"Integrations"** → **"Develop your own integrations"**
   - **"My integrations"**

4. 点击后会跳转到 integrations 页面

5. 点击 **"+ New integration"** 或 **"Create new integration"**

**填写 Integration 信息**

不管通过哪种方法，都会看到创建表单：

```
Name: Blog CMS
Associated workspace: 选择你的工作区（下拉菜单）
Type: Internal Integration（内部集成）
```

**Capabilities（权限，默认即可）**:
- ✅ Read content
- ✅ Update content
- ✅ Insert content

点击 **"Submit"** 提交

**复制 Integration Token**

创建成功后，你会看到：

```
Internal Integration Token
secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ 重要**：点击 **"Show"** 或 **"Copy"** 按钮复制这个 Token

- 格式必须是：`secret_` 开头
- 长度约 50 个字符
- 保存到记事本，稍后会用到

**如果还是找不到入口**：

1. 确认你已经登录 Notion
2. 确认你有 workspace 的管理员权限
3. 尝试直接访问：`https://www.notion.so/profile/integrations`
4. 或者发送邮件给 Notion 支持询问

### 1.2 创建 Notion Database

1. 在 Notion 中创建一个新页面（任意位置）

2. 输入 `/database` 然后选择 **"Database - Full page"**

   ![创建 Database](https://www.notion.so/cdn-cgi/image/format=auto,width=640,quality=100/front-static/pages/product/super-duper/modular-table.png)

3. 给 Database 命名，例如 **"博客文章"**

### 1.3 配置 Database 属性

点击右上角 **"Properties"** 按钮，添加以下列：

| 属性名称 | 类型 | 是否必需 | 说明 |
|---------|------|----------|------|
| Title | Title | ✅ 必需 | 自动存在，文章标题 |
| Slug | Text | ✅ 必需 | URL 路径，如 `my-first-post` |
| Summary | Text | ✅ 必需 | 文章摘要 |
| Category | Select | ✅ 必需 | 文章分类，如 "技术" |
| Tags | Multi-select | ❌ 可选 | 文章标签，如 "Next.js", "React" |
| Published | Checkbox | ✅ 必需 | 是否发布 |
| PublishDate | Date | ✅ 必需 | 发布日期 |
| CoverImage | URL | ❌ 可选 | 封面图片 URL |

**添加属性步骤**：
1. 点击 **"+ Add a property"**
2. 输入属性名称（如 `Slug`）
3. 选择类型（如 `Text`）
4. 重复以上步骤添加所有属性

### 1.4 连接 Integration 到 Database

1. 在 Database 页面，点击右上角 **"•••"**（三个点）

2. 选择 **"Connections"** → **"Connect to"**

   ![连接 Integration](https://files.readme.io/0a267dd-connect_integration.png)

3. 找到并选择刚才创建的 **"Blog CMS"** Integration

4. 点击 **"Confirm"** 确认

### 1.5 获取 Database ID

1. 打开 Database 页面

2. 查看浏览器地址栏的 URL：
   ```
   https://www.notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                         这是 Database ID
   ```

3. 复制这 32 位字符（无破折号），保存到记事本

**示例**：
- URL: `https://www.notion.so/myworkspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=...`
- Database ID: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 1.6 创建测试文章

在 Database 中点击 **"New"** 创建第一篇测试文章：

```
Title: 我的第一篇博客
Slug: my-first-post
Summary: 这是一篇测试文章
Category: 技术
Tags: Next.js
Published: ✅ (勾选)
PublishDate: 今天的日期
```

在文章内容区域输入：

```markdown
# 欢迎来到我的博客

这是我的第一篇文章！

## 功能特性

- Notion 作为 CMS
- Next.js 14 框架
- 暗色模式支持
```

**✅ Notion 准备完成！** 你现在有了：
- Integration Token
- Database ID
- 一篇测试文章

---

## 第二步：部署到 Vercel（5 分钟）

### 2.1 Fork 仓库（如果还没有）

1. 访问项目 GitHub 仓库
2. 点击右上角 **"Fork"** 按钮
3. 等待 Fork 完成

### 2.2 连接 Vercel

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)

2. 点击 **"Add New..."** → **"Project"**

   ![Add New Project](https://assets.vercel.com/image/upload/v1588805858/front/vercel/add-new-project.png)

3. 找到你 Fork 的仓库，点击 **"Import"**

4. 配置项目：

   **Root Directory**:
   ```
   blog-nextjs
   ```
   点击 **"Edit"** 按钮选择 `blog-nextjs` 文件夹

   **Framework Preset**: Next.js（自动检测）

### 2.3 配置环境变量（重要！）

在 **"Environment Variables"** 部分，添加以下变量：

#### 必需的变量（最小配置）

```bash
# Notion 配置
NOTION_TOKEN=secret_你在第一步复制的Token
NOTION_DATABASE_ID=你在第一步复制的DatabaseID

# 网站信息
NEXT_PUBLIC_SITE_URL=https://你的域名.vercel.app
NEXT_PUBLIC_SITE_TITLE=智展AI

# 暂时禁用评论（稍后配置）
NEXT_PUBLIC_GISCUS_REPO=placeholder/placeholder
NEXT_PUBLIC_GISCUS_REPO_ID=placeholder
NEXT_PUBLIC_GISCUS_CATEGORY=General
NEXT_PUBLIC_GISCUS_CATEGORY_ID=placeholder
```

**注意**：
- 将 `NEXT_PUBLIC_SITE_URL` 暂时设为 `https://你的项目名.vercel.app`
- Giscus 变量可以先用占位符，评论功能会被自动禁用

**填写步骤**：
1. 输入变量名（如 `NOTION_TOKEN`）
2. 输入对应的值
3. 点击 **"Add"**
4. 重复以上步骤添加所有变量

### 2.4 部署

1. 点击 **"Deploy"** 按钮

2. 等待构建完成（约 2-5 分钟）

3. 看到 **"Congratulations!"** 页面表示部署成功

4. 点击 **"Visit"** 访问你的网站

   ![Deployment Success](https://assets.vercel.com/image/upload/v1588805858/front/vercel/deployment-success.png)

**✅ 部署完成！** 你的博客现在可以访问了！

---

## 第三步：验证和测试（2 分钟）

### 3.1 访问网站

访问你的 Vercel 域名：`https://你的项目名.vercel.app`

### 3.2 检查清单

- [ ] 首页可以访问
- [ ] 能看到测试文章（"我的第一篇博客"）
- [ ] 点击文章可以查看详情
- [ ] 暗色模式切换正常
- [ ] 移动端显示正常

### 3.3 如果遇到问题

**问题 1：没有看到文章**

解决方法：
1. 检查 Notion 文章的 `Published` 是否勾选
2. 检查 `PublishDate` 不是未来日期
3. 等待 1 小时（ISR 缓存）或重新部署

**问题 2：构建失败**

解决方法：
1. 检查环境变量是否正确
2. 查看 Vercel Deployment Logs
3. 确认 Notion Integration 已连接到 Database

**问题 3：404 错误**

解决方法：
1. 检查 Root Directory 是否选择了 `blog-nextjs`
2. 重新部署

---

## 第四步：配置评论功能（可选，5 分钟）

### 4.1 启用 GitHub Discussions

1. 访问你的 GitHub 仓库

2. 点击 **"Settings"**（设置）

3. 滚动到 **"Features"** 部分

4. 勾选 **"Discussions"**（讨论）

### 4.2 安装 Giscus App

1. 访问 [Giscus App](https://github.com/apps/giscus)

2. 点击 **"Install"**

3. 选择你的仓库或授权所有仓库

### 4.3 配置 Giscus

1. 访问 [Giscus 配置页面](https://giscus.app/zh-CN)

2. 填写配置：

   **语言**: 简体中文

   **仓库**: `你的用户名/你的仓库名`
   - 示例：`username/blog`

   **页面 ↔️ discussion 映射关系**: `pathname`

   **Discussion 分类**: 选择 `General` 或创建新分类

   **特性**:
   - ✅ 启用主评论输入框

   **主题**: `preferred_color_scheme`（跟随系统）

3. 复制生成的配置参数

4. 更新 Vercel 环境变量：

   在 Vercel Dashboard → 你的项目 → Settings → Environment Variables

   更新以下变量：
   ```bash
   NEXT_PUBLIC_GISCUS_REPO=你的用户名/你的仓库名
   NEXT_PUBLIC_GISCUS_REPO_ID=R_你复制的ID
   NEXT_PUBLIC_GISCUS_CATEGORY=General
   NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_你复制的ID
   ```

5. 重新部署：

   Deployments → 最新部署 → 右侧菜单 → Redeploy

**✅ 评论功能配置完成！**

---

## 第五步：配置金融功能（可选，10 分钟）

### 5.1 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/)

2. 点击 **"Start your project"** → 使用 GitHub 登录

3. 点击 **"New project"**

4. 填写信息：
   ```
   Name: blog-market-data
   Database Password: 生成强密码并保存
   Region: Northeast Asia (Tokyo) - 选择最近的区域
   ```

5. 点击 **"Create new project"**（等待 2-3 分钟）

### 5.2 执行数据库脚本

1. 项目创建完成后，点击左侧 **"SQL Editor"**

2. 点击 **"New query"**

3. 打开本地文件 `supabase/schema.sql`，复制全部内容

4. 粘贴到 SQL Editor

5. 点击右下角 **"Run"** 按钮

6. 看到 **"Success. No rows returned"** 表示成功

### 5.3 获取 API Keys

1. 点击左侧 **"Settings"** → **"API"**

2. 找到并复制：

   **Project URL**:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public** (Project API keys):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
   ```

   **service_role** (点击眼睛图标 "Reveal" 显示):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
   ```

   ⚠️ **警告**：`service_role` key 拥有完全权限，务必保密！

### 5.4 更新 Vercel 环境变量

在 Vercel Dashboard 添加：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_public_key
SUPABASE_SERVICE_ROLE_KEY=你的service_role_key

# Cron Job 密钥（生成随机字符串）
CRON_SECRET=任意随机字符串（如：my-secret-key-12345）
```

### 5.5 测试金融功能

1. 重新部署

2. 访问 `/market` 页面

3. 应该能看到加密货币和股票数据

**✅ 金融功能配置完成！**

---

## 第六步：后续优化（可选）

### 6.1 配置自定义域名

1. 购买域名（如 Namecheap、Cloudflare）

2. 在 Vercel: Settings → Domains → 添加域名

3. 按照提示配置 DNS 记录

4. 更新环境变量 `NEXT_PUBLIC_SITE_URL` 为你的域名

### 6.2 提交 Sitemap 到搜索引擎

**Google Search Console**:
1. 访问 [Google Search Console](https://search.google.com/search-console/)
2. 添加网站
3. 验证所有权
4. 提交 Sitemap: `https://你的域名/sitemap.xml`

**Bing Webmaster Tools**:
1. 访问 [Bing Webmaster](https://www.bing.com/webmasters/)
2. 添加网站
3. 提交 Sitemap

### 6.3 启用 Vercel Analytics

1. Vercel Dashboard → 你的项目 → Analytics
2. 点击 **"Enable Analytics"**
3. 无需修改代码，自动生效

---

## 📝 常见问题

### Q1: Notion Database 找不到？

**A**: 确保：
1. Integration 已连接到 Database（Database 页面 → ••• → Connections）
2. Database ID 复制正确（32 位字符，无破折号）

### Q2: 文章不显示？

**A**: 检查：
1. `Published` 复选框已勾选
2. `PublishDate` 不是未来日期
3. 所有必需字段已填写（Title、Slug、Summary、Category、PublishDate）

### Q3: 如何更新网站内容？

**A**:
1. 在 Notion 中编辑文章
2. 等待 1 小时（ISR 自动更新）
3. 或在 Vercel 手动触发重新部署

### Q4: 评论不显示？

**A**: 检查：
1. GitHub Discussions 已启用
2. Giscus App 已安装
3. 环境变量配置正确
4. 已重新部署

### Q5: 金融数据不更新？

**A**: 检查：
1. Supabase 数据库脚本已执行
2. 环境变量配置正确
3. `CRON_SECRET` 已设置
4. 等待 1 小时（Cron Job 每小时运行）

---

## 🎉 恭喜！

你的博客已经成功部署！

### 下一步建议：

1. **创建更多内容**
   - 在 Notion 中撰写文章
   - 添加封面图片
   - 使用标签分类

2. **自定义设计**
   - 修改网站标题和描述
   - 添加 Logo
   - 调整配色方案

3. **优化 SEO**
   - 提交 Sitemap
   - 配置 Google Analytics
   - 添加 Open Graph 图片

4. **分享推广**
   - 社交媒体分享
   - RSS 订阅推广
   - 搜索引擎优化

---

## 📚 相关文档

- **详细部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **项目完整文档**: [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)
- **环境变量模板**: [.env.example](.env.example)

## 💬 需要帮助？

- 查看 [Notion API 文档](https://developers.notion.com/)
- 查看 [Next.js 文档](https://nextjs.org/docs)
- 查看 [Vercel 文档](https://vercel.com/docs)

---

**祝你使用愉快！** 🚀
