# Supabase 快速开始（5分钟）

按照以下步骤快速启用加密货币和股票数据功能。

---

## 步骤 1：创建 Supabase 项目（2分钟）

1. 访问 https://supabase.com/ 并登录
2. 点击 **New project**
3. 填写：
   - **Name**: `trendradar-blog`
   - **Database Password**: 设置密码（保存好）
   - **Region**: **Southeast Asia (Singapore)** 或 **Northeast Asia (Tokyo)**
4. 点击 **Create new project**，等待 2 分钟

---

## 步骤 2：创建数据库表（1分钟）

1. 左侧菜单点击 **SQL Editor**
2. 点击 **New query**
3. 复制粘贴 `supabase/schema.sql` 的全部内容
4. 点击 **Run** 执行
5. 看到成功提示即可

---

## 步骤 3：获取 API Keys（30秒）

1. 左侧菜单点击 **Settings** → **API**
2. 复制以下 3 个值：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJhbG...`（点击眼睛图标显示）
   - **service_role**: `eyJhbG...`（点击眼睛图标显示）

---

## 步骤 4：配置环境变量（30秒）

编辑 `.env.local` 文件，添加：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=你的Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_public
SUPABASE_SERVICE_ROLE_KEY=你的service_role
```

**保存文件！**

---

## 步骤 5：重启服务并测试（1分钟）

### 5.1 重启开发服务器

```bash
# Ctrl+C 停止，然后重启
npm run dev
```

### 5.2 测试连接

访问：http://localhost:3000/api/test-supabase

看到 `"success": true` 就成功了！

### 5.3 获取市场数据

访问：http://localhost:3000/api/cron/market

这会从 CoinGecko 获取最新的加密货币和股票数据。

### 5.4 查看效果

刷新首页：http://localhost:3000/

你应该能在页面顶部看到 **金融市场横幅**，显示实时的 BTC、ETH 等价格！

---

## 步骤 6：部署到 Vercel（可选）

如果已经部署到 Vercel，需要添加环境变量：

1. Vercel Dashboard → 你的项目 → **Settings** → **Environment Variables**
2. 添加上面 3 个变量
3. **Deployments** → 最新部署 → **...** → **Redeploy**

完成！

---

## 故障排查

### ❌ 提示 "NEXT_PUBLIC_SUPABASE_URL 未配置"

→ 检查 `.env.local` 文件，确保变量名正确（不要有拼写错误）
→ 重启开发服务器（Ctrl+C 然后 `npm run dev`）

### ❌ 提示 "写入权限测试失败"

→ 这是正常的，只要 `"read": true` 就可以使用
→ 如果需要写入，确保已执行 `schema.sql` 创建了 RLS 策略

### ❌ 首页没有显示金融横幅

→ 先访问 `/api/cron/market` 获取数据
→ 刷新首页
→ 检查浏览器控制台是否有错误

### ❌ Vercel 部署后没有数据

→ 确认 Vercel 环境变量已配置
→ 重新部署
→ 手动访问 `https://你的域名/api/cron/market` 触发数据更新

---

## 自定义配置

### 修改显示的加密货币

编辑 `src/app/api/cron/market/route.ts`：

```typescript
const cryptoFetcher = createCryptoFetcher({
  symbols: ["BTC", "ETH", "BNB", "SOL", "DOGE"], // 添加你想要的币种
});
```

### 设置自动更新

创建 `vercel.json`：

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

这会每小时自动更新一次数据。

---

完成！现在你的博客已经支持实时金融数据了 🎉
