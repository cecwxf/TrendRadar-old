# Supabase 配置指南

本指南帮助你配置 Supabase，启用加密货币和股票数据功能。

---

## 第一步：创建 Supabase 项目

1. 访问 https://supabase.com/
2. 点击 **Start your project**（如果已登录，点击 **New project**）
3. 填写项目信息：
   - **Organization**: 选择或创建一个组织
   - **Project name**: `trendradar-blog`（或你喜欢的名字）
   - **Database Password**: 设置一个强密码（**保存好，后面会用到**）
   - **Region**: 选择 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**（离中国较近）
4. 点击 **Create new project**
5. 等待约 2-3 分钟，项目创建完成

---

## 第二步：创建数据库表

1. 在 Supabase Dashboard 左侧菜单中，点击 **SQL Editor**
2. 点击 **New query**
3. 打开项目中的 `supabase/schema.sql` 文件，复制全部内容
4. 粘贴到 SQL Editor 中
5. 点击右下角的 **Run** 按钮执行
6. 看到成功提示后，点击左侧的 **Table Editor** 验证

你应该看到以下 4 个表：
- ✅ `crypto_data` - 加密货币数据
- ✅ `stock_data` - 股票数据
- ✅ `price_history` - 价格历史
- ✅ `view_stats` - 文章浏览统计

---

## 第三步：获取 API Keys

1. 在 Supabase Dashboard 左侧菜单中，点击 **Settings** → **API**
2. 找到以下信息（点击右侧眼睛图标显示完整内容）：

   ```
   Project URL: https://xxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. 复制这 3 个值（**不要关闭页面，下一步要用**）

---

## 第四步：配置本地环境变量

打开项目中的 `.env.local` 文件，添加或更新以下配置：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（anon public）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（service_role）
```

**重要提示：**
- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 以 `NEXT_PUBLIC_` 开头，会暴露到浏览器
- `SUPABASE_SERVICE_ROLE_KEY` **不能**以 `NEXT_PUBLIC_` 开头，只能在服务端使用
- `service_role` key 拥有数据库完全权限，**绝对不能**泄露到客户端！

---

## 第五步：测试 Supabase 连接

### 5.1 重启开发服务器

```bash
# 按 Ctrl+C 停止当前服务器
# 然后重新启动
npm run dev
```

### 5.2 测试连接

访问：http://localhost:3000/api/test-supabase

**期望结果：**
```json
{
  "success": true,
  "message": "Supabase 连接成功！",
  "tables": {
    "crypto_data": 0,
    "stock_data": 0,
    "price_history": 0,
    "view_stats": 0
  }
}
```

如果看到 `"success": true`，说明配置成功！

---

## 第六步：启用数据采集

现在数据库已准备好，但是还没有数据。我们需要创建一个 API 端点来定期获取加密货币和股票数据。

### 6.1 创建数据更新 API

这个 API 已经存在于：`src/app/api/update-market-data/route.ts`

手动触发更新：

```bash
curl http://localhost:3000/api/update-market-data
```

你应该看到：
```json
{
  "success": true,
  "message": "市场数据更新成功",
  "data": {
    "crypto": [...],
    "stocks": [...]
  }
}
```

### 6.2 刷新首页查看数据

访问 http://localhost:3000/，你应该能看到页面顶部出现了 **金融横幅**，显示实时的加密货币和股票价格！

---

## 第七步：配置 Vercel 环境变量

为了让 Vercel 部署也能使用 Supabase，需要在 Vercel 中配置相同的环境变量：

1. 打开 Vercel Dashboard: https://vercel.com/dashboard
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下 3 个变量：

   ```
   NEXT_PUBLIC_SUPABASE_URL = https://你的项目ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. 点击 **Save**
6. 重新部署：**Deployments** → 最新部署 → **...** → **Redeploy**

---

## 第八步：设置自动更新（可选）

为了让市场数据自动更新，可以使用 Vercel Cron Jobs：

### 8.1 创建 Cron 配置文件

创建 `vercel.json`（如果还不存在）：

```json
{
  "crons": [
    {
      "path": "/api/update-market-data",
      "schedule": "0 * * * *"
    }
  ]
}
```

这会每小时自动调用更新 API。

### 8.2 部署到 Vercel

```bash
git add vercel.json
git commit -m "Add Vercel cron job for market data updates"
git push
```

Vercel 会自动部署并启用定时任务。

---

## 常见问题

### Q: 看到 "Supabase not configured" 警告

**A:** 检查 `.env.local` 文件中的环境变量是否正确配置，并重启开发服务器。

---

### Q: 首页没有显示金融横幅

**A:**
1. 检查 `/api/test-supabase` 是否返回成功
2. 手动调用 `/api/update-market-data` 插入数据
3. 检查浏览器控制台是否有错误
4. 确认 `MarketBanner` 组件没有被隐藏

---

### Q: 403 Forbidden 错误

**A:**
- 检查 RLS 策略是否正确配置
- 确认 `service_role` key 已配置（写入需要 service_role key）
- 查看 Supabase Dashboard → Authentication → Policies

---

### Q: 数据显示但不更新

**A:**
1. 检查 ISR 配置 (`revalidate = 3600`)
2. 手动调用 `/api/update-market-data` 测试
3. 查看 Supabase Dashboard → Table Editor 确认数据已更新

---

## 下一步

✅ Supabase 配置完成！

现在你可以：
- 在首页顶部看到实时的加密货币和股票价格
- 查看价格趋势图表
- 跟踪文章浏览统计

如果需要自定义显示的币种或股票，修改 `src/app/api/update-market-data/route.ts` 中的配置。
