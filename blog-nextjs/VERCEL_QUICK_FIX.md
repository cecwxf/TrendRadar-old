# Vercel 404 错误快速修复

## 第一步：检查环境变量（最常见原因）

1. 打开 Vercel Dashboard：https://vercel.com/dashboard
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 确认已添加以下变量：

   ```
   NOTION_TOKEN = ntn_你的Token
   NOTION_DATABASE_ID = 你的DatabaseID
   ```

5. **如果刚添加环境变量，必须重新部署：**
   - 进入 **Deployments** 页面
   - 点击最新部署 → 右上角 **...** → **Redeploy**
   - 等待构建完成（约 1-2 分钟）

## 第二步：测试 Notion 连接

部署完成后，访问：

```
https://你的域名.vercel.app/api/test-notion
```

**可能的结果：**

### ✅ 成功响应示例
```json
{
  "success": true,
  "message": "Notion API 连接成功！",
  "data": {
    "postsCount": 1,
    "posts": [...]
  }
}
```
→ Notion 配置正确，博客应该可以正常访问了

### ❌ 错误响应示例
```json
{
  "success": false,
  "error": "NOTION_TOKEN 未配置"
}
```
→ 环境变量未设置或未生效，重新检查第一步

```json
{
  "success": false,
  "error": "Could not find database with ID"
}
```
→ Database ID 错误，或 Integration 未连接到 Database

## 第三步：查看构建日志

1. 在 Vercel Dashboard 中打开你的项目
2. 进入 **Deployments**
3. 点击最新的部署
4. 查看 **Build Logs**，搜索关键词：
   - `成功获取` - 看到这个说明构建时成功获取了文章
   - `generateStaticParams 失败` - 说明构建时无法访问 Notion
   - `Error fetching posts` - Notion API 调用失败

## 常见问题

### Q: 环境变量已添加，为什么还是 404？

**A:** 环境变量添加后不会立即生效，必须 **重新部署**。

步骤：Deployments → 点击最新部署 → ... → Redeploy

---

### Q: 显示 "NOTION_TOKEN 未配置"

**A:** 检查：
1. 环境变量名称是否正确（不是 `NOTION_API_KEY`，是 `NOTION_TOKEN`）
2. Token 是否完整复制（以 `ntn_` 开头）
3. 是否重新部署

---

### Q: 显示 "Could not find database"

**A:** 需要在 Notion 中连接 Integration：
1. 打开你的 Notion Database
2. 点击右上角 **···**
3. 选择 **Connections**
4. 选择你的 Integration
5. 返回 Vercel 重新部署

---

### Q: API 测试成功，但首页还是 404

**A:** 检查 Notion 中是否有文章的 `Published` 复选框被勾选。

没有已发布文章时，访问首页会显示空状态而不是 404。如果仍然是 404，清除浏览器缓存重试。

---

## 最快解决方法（5 分钟）

```bash
# 1. 确认本地可以正常运行
npm run build
npm run start
# 访问 http://localhost:3000 确认无误

# 2. 提交代码（如果有改动）
git add .
git commit -m "Fix Vercel deployment"
git push

# 3. Vercel 会自动部署

# 4. 部署完成后测试
curl https://你的域名.vercel.app/api/test-notion
```

看到 `"success": true` 就说明配置正确！

---

## 需要帮助？

如果以上步骤都无法解决，请提供：
1. Vercel 构建日志截图
2. `/api/test-notion` 的响应内容
3. Notion Database 截图（隐藏敏感信息）
