# 博客 - Next.js 14 + Notion CMS + Supabase

个人博客，基于 Next.js 14 App Router，使用 Notion 作为 CMS，Supabase 作为数据库。

## 🚀 快速开始

**选择适合你的部署指南**：

### 🎯 已有 Notion Workspace？（推荐）
👉 **[超快速部署指南](QUICKSTART_EXISTING_WORKSPACE.md)** - 只需 10 分钟！

适合已经在使用 Notion 的用户，直接用现有 workspace 部署。

### 📖 完整新手指南
👉 **[详细快速开始指南](QUICKSTART.md)** - 15-20 分钟

包含详细的步骤说明和截图，适合完全新手。

### 📚 高级配置
👉 **[完整部署文档](DEPLOYMENT.md)**

包含所有配置选项、高级功能和问题排查。

---

## 技术栈

- **前端**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **CMS**: Notion API
- **数据库**: Supabase PostgreSQL
- **搜索**: Algolia / Supabase Full-Text Search
- **评论**: Giscus (GitHub Discussions)
- **部署**: Vercel
- **图表**: ECharts (金融数据可视化)
- **字体**: LXGW WenKai (中文), Inter (英文)

## 功能特性

- ✅ 博客文章列表和详情（ISR）
- ✅ Notion CMS 内容管理
- ✅ 全站搜索
- ✅ 评论系统
- ✅ 阅读统计
- ✅ RSS 订阅
- ✅ 暗色模式
- ✅ 响应式设计
- ✅ 金融市场数据展示（BTC/ETH 横幅 + 完整仪表盘）

## 开发指南

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入你的配置：

```bash
cp .env.example .env.local
```

### 3. 下载字体

下载 [LXGW WenKai](https://github.com/lxgw/LxgwWenKai/releases) 字体文件，放到 `public/fonts/LXGWWenKai-Regular.ttf`

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
blog-nextjs/
├── src/
│   ├── app/              # Next.js App Router 页面
│   ├── components/       # React 组件
│   ├── lib/              # 工具函数
│   ├── types/            # TypeScript 类型
│   └── styles/           # 样式文件
├── public/               # 静态资源
└── supabase/             # Supabase 数据库迁移
```

## 部署

### Vercel (推荐)

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 部署

### 其他平台

参考 Next.js 官方文档：https://nextjs.org/docs/deployment

## License

MIT
