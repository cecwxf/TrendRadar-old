# 🚀 超快速部署（已有 Notion Workspace）

> 适用于：已经有 Notion 账号和 workspace 的用户

**预计时间**：10 分钟

---

## 步骤 1：创建 Notion Integration（2 分钟）

### 1️⃣ 访问创建页面

**直接点击**：👉 [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)

### 2️⃣ 创建 Integration

页面打开后：

1. **找到并点击按钮**（通常是蓝色的）：
   - 可能显示为："+ New integration"
   - 或："Create new integration"
   - 或页面中间的 "Create" 按钮

2. **填写表单**（只需填这 3 项）：
   ```
   Name: BlogCMS
   Associated workspace: [选择你的workspace]
   Type: Internal
   ```

3. **点击 "Submit"**

### 3️⃣ 复制 Token

提交后会显示：
```
Internal Integration Token
secret_xxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ 立即复制这个 Token**：
- 点击 "Show" 或 "Copy" 按钮
- 粘贴到记事本保存（稍后要用）

✅ **完成！** 现在你有了 Integration Token

---

## 步骤 2：创建 Database（3 分钟）

### 1️⃣ 新建页面

1. 在你的 Notion workspace 中，**任意位置**点击 "+ New page"（新建页面）

2. 给页面命名：**博客文章**

### 2️⃣ 创建 Database

1. 在页面里输入：`/database`

2. 在弹出菜单中选择：**"Database - Full page"**

### 3️⃣ 添加必需的列

默认会有一个 "Name" 列，我们需要改名并添加其他列。

**点击 "Name" 列头** → 选择 "Rename" → 改为：**Title**

然后点击右上角的 **"+ New property"** 或表格最右侧的 **"+"** 添加以下列：

| 点击 "+" 输入名称 | 选择类型 | 是否必需 |
|------------------|---------|---------|
| Slug | Text | ✅ 必需 |
| Summary | Text | ✅ 必需 |
| Category | Select | ✅ 必需 |
| Published | Checkbox | ✅ 必需 |
| PublishDate | Date | ✅ 必需 |
| Tags | Multi-select | 可选 |
| CoverImage | URL | 可选 |

### 4️⃣ 连接 Integration

1. **在 Database 页面**，点击右上角 **"..."**（三个点）

2. 找到并点击 **"Connections"** 或 **"+ Add connections"**

3. 在列表中找到 **"BlogCMS"**（你刚创建的 Integration）

4. 点击选中它

5. 点击 **"Confirm"** 确认

### 5️⃣ 获取 Database ID

1. **看浏览器地址栏的 URL**，格式类似：
   ```
   https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyy...
   ```

2. **复制这 32 位字符**（从 `https://www.notion.so/` 后面到 `?` 之前）
   ```
   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ← 这就是 Database ID
   ```

3. 保存到记事本

### 6️⃣ 创建测试文章

点击 Database 中的 **"New"** 按钮，填写：

```
Title: 测试文章
Slug: test-post
Summary: 这是一篇测试文章
Category: 技术
Published: ✅ (勾选)
PublishDate: 选择今天的日期
```

在下方内容区输入一些文字：
```
# 欢迎

这是我的第一篇文章！
```

✅ **完成！** 现在你有了：
- Integration Token: `secret_xxxxx...`
- Database ID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- 一篇测试文章

---

## 步骤 3：部署到 Vercel（5 分钟）

### 1️⃣ 登录 Vercel

访问：[https://vercel.com/login](https://vercel.com/login)

用 **GitHub 账号登录**（如果没有 GitHub 账号，需要先注册一个）

### 2️⃣ 导入项目

1. 点击 **"Add New..."** → **"Project"**

2. 如果这是你第一次：
   - 点击 **"Import Git Repository"**
   - 授权 Vercel 访问你的 GitHub

3. 找到博客项目的仓库，点击 **"Import"**

### 3️⃣ 配置项目

**Root Directory**:
- 点击 "Edit" 按钮
- 选择 `blog-nextjs` 文件夹
- 点击 "Continue"

**Framework Preset**:
- 自动检测为 Next.js（无需修改）

### 4️⃣ 配置环境变量

在 **"Environment Variables"** 部分，逐个添加：

**点击输入框**，输入变量名和值：

```bash
# 变量名 1
NOTION_TOKEN
# 值 1 (粘贴你之前复制的 Token)
secret_你复制的Integration_Token

# 变量名 2
NOTION_DATABASE_ID
# 值 2 (粘贴你之前复制的 Database ID)
你复制的32位Database_ID

# 变量名 3
NEXT_PUBLIC_SITE_URL
# 值 3 (先用临时的，部署后会得到实际域名)
https://my-blog.vercel.app

# 变量名 4
NEXT_PUBLIC_SITE_TITLE
# 值 4
我的博客

# 以下是评论功能的占位符（暂时先这样填，评论功能会被禁用）
# 变量名 5-8
NEXT_PUBLIC_GISCUS_REPO
# 值 5
placeholder/placeholder

NEXT_PUBLIC_GISCUS_REPO_ID
# 值 6
placeholder

NEXT_PUBLIC_GISCUS_CATEGORY
# 值 7
General

NEXT_PUBLIC_GISCUS_CATEGORY_ID
# 值 8
placeholder
```

每输入一个，点击 **"Add"** 按钮。

### 5️⃣ 部署

1. **点击 "Deploy"** 按钮

2. **等待 2-5 分钟**（喝杯咖啡 ☕）

3. 看到 **"Congratulations!"** 表示成功

4. **点击截图或 "Visit"** 按钮访问你的博客

### 6️⃣ 更新 Site URL（重要）

部署成功后：

1. 复制 Vercel 给你的域名，格式类似：
   ```
   https://blog-nextjs-xxxx.vercel.app
   ```

2. 在 Vercel Dashboard 中：
   - 点击 **"Settings"** → **"Environment Variables"**
   - 找到 `NEXT_PUBLIC_SITE_URL`
   - 点击右侧的 **"..."** → **"Edit"**
   - 粘贴你的实际域名
   - 点击 **"Save"**

3. 返回 **"Deployments"** → 点击最新的部署 → 点击右侧菜单 **"..."** → 选择 **"Redeploy"**

✅ **完成！** 你的博客已经上线了！

---

## 步骤 4：验证（1 分钟）

访问你的博客地址，检查：

- [ ] 首页可以访问
- [ ] 能看到 "测试文章"
- [ ] 点击文章可以查看内容
- [ ] 右上角主题切换按钮正常工作

**如果看不到文章**：
1. 确认 Notion 中 `Published` 已勾选
2. 确认 `PublishDate` 不是未来日期
3. 等待 1 小时（缓存更新）或在 Vercel 重新部署

---

## 🎉 恭喜！你的博客已经上线！

### 下一步可以做什么：

1. **在 Notion 中写文章**
   - 在你的 Database 中点击 "New"
   - 填写文章内容
   - 勾选 "Published"
   - 1 小时后会自动出现在博客上（或重新部署立即生效）

2. **自定义博客**
   - 修改网站标题和描述
   - 添加封面图片
   - 创建不同的分类

3. **配置可选功能**（稍后）
   - 评论系统（Giscus）
   - 金融市场数据（Supabase）
   - 自定义域名

---

## ❓ 遇到问题？

### 问题 1：看不到文章

**原因**：Notion Database 配置问题

**解决**：
1. 检查 Integration 是否已连接到 Database（Database 页面 → "..." → Connections → 确认 "BlogCMS" 已选中）
2. 检查文章的 `Published` 是否勾选
3. 检查所有必需字段都已填写

### 问题 2：Vercel 构建失败

**原因**：环境变量配置错误

**解决**：
1. 检查 `NOTION_TOKEN` 是否以 `secret_` 开头
2. 检查 `NOTION_DATABASE_ID` 是 32 位字符（无破折号）
3. 查看 Vercel Deployment Logs 找到具体错误

### 问题 3：创建 Integration 时找不到按钮

**原因**：可能没有 workspace 管理员权限

**解决**：
1. 确认你是 workspace 的 Owner 或 Admin
2. 尝试从 Notion 设置进入：Settings & members → Connections → Develop or manage integrations

---

## 📚 需要更详细的说明？

- 完整部署文档：[DEPLOYMENT.md](DEPLOYMENT.md)
- 项目详细介绍：[PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)
- 环境变量说明：[.env.example](.env.example)

---

**祝你使用愉快！** 🎉
