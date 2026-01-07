# 如何获取 Notion Integration Token

## 🎯 快速定位

**Integration Token 在哪里？**

访问这个页面：👉 **[https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)**

---

## 📍 详细步骤

### 如果你已经创建了 Integration

1. **打开页面**：访问 [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)

2. **找到你的 Integration**：
   - 页面会列出你创建的所有 Integration
   - 找到你创建的那个（比如 "BlogCMS"）
   - **点击 Integration 的名称**（不是右侧的菜单）

3. **查看 Token**：
   点击名称后，你会看到一个详情页面，包含：

   ```
   ┌─────────────────────────────────────────────────┐
   │ Capabilities                                    │
   ├─────────────────────────────────────────────────┤
   │ ✓ Read content                                  │
   │ ✓ Update content                                │
   │ ✓ Insert content                                │
   ├─────────────────────────────────────────────────┤
   │ Secrets                                         │
   ├─────────────────────────────────────────────────┤
   │ Internal Integration Token                      │
   │                                                 │
   │ secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx         │  ← 这就是你要的！
   │                                                 │
   │ [Show] [Copy]                                   │  ← 点击这些按钮
   └─────────────────────────────────────────────────┘
   ```

4. **复制 Token**：
   - 点击 **"Show"** 按钮显示完整 Token
   - 或直接点击 **"Copy"** 按钮复制

### 如果你没创建过 Integration

1. **访问创建页面**：[https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)

2. **点击创建按钮**：
   - 找到并点击 **"+ New integration"** 按钮（通常是蓝色的）
   - 如果看不到按钮，可能页面显示为 "No integrations yet"

3. **填写表单**：
   ```
   Name: BlogCMS
   Associated workspace: [选择你的 workspace]
   Type: Internal Integration
   ```

   点击 **"Submit"**

4. **立即复制 Token**：
   创建成功后，页面会**立即显示** Integration Token：
   ```
   Congratulations! Your integration is ready to go.

   Internal Integration Token
   secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   [Show] [Copy]
   ```

   **⚠️ 重要**：立即点击 **"Copy"** 复制这个 Token！

---

## ✅ 验证 Token 格式

正确的 Integration Token **必须**：

- ✅ 以 `secret_` 开头
- ✅ 长度约 50 个字符
- ✅ 格式示例：`secret_Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12Wx34`

**错误的格式**：
- ❌ `ntn_xxxxx` - 这不是 Integration Token
- ❌ `v2_xxxxx` - 这也不是 Integration Token
- ❌ 只有 32 位字符 - 那可能是 Database ID

---

## 🔧 将 Token 添加到 .env.local

找到 Token 后：

1. **打开文件**：`blog-nextjs/.env.local`

2. **找到这一行**：
   ```bash
   NOTION_TOKEN=ntn_b22210465734uukYVnzcxR3tq9500XeuX4y3POCpGnfg4g
   ```

3. **替换为**：
   ```bash
   NOTION_TOKEN=secret_你复制的完整Token
   ```

4. **保存文件**

---

## 🎯 完整示例

假设你复制的 Token 是：`secret_Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12`

你的 `.env.local` 应该是：

```bash
# Notion CMS 配置
NOTION_TOKEN=secret_Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12
NOTION_DATABASE_ID=223084627b2d8003b5bcda6b36eb238a
```

---

## ⚠️ 常见问题

### Q1: 我看不到 Integration Token

**A**: 可能的原因：
1. 你需要**点击 Integration 的名称**进入详情页
2. 或者 Token 被隐藏了，点击 **"Show"** 按钮
3. 如果还是看不到，尝试重新创建一个 Integration

### Q2: 我的 Token 是 ntn_ 开头的

**A**: `ntn_` 不是 Integration Token！

可能的情况：
- 这是其他类型的 Token
- 你复制错了位置

**解决方法**：
1. 重新访问 [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. 点击你的 Integration 名称
3. 找到 **"Internal Integration Token"** 字样
4. 那下面的才是正确的 Token（`secret_` 开头）

### Q3: 我没有 my-integrations 这个页面

**A**: 尝试以下方法：

**方法 1**：从 Notion 设置进入
1. 打开 Notion 应用
2. 点击左下角 **"Settings & members"**
3. 左侧菜单找 **"Connections"** 或 **"Integrations"**
4. 点击 **"Develop or manage integrations"**

**方法 2**：检查权限
- 确认你是 workspace 的 Owner 或 Admin
- 免费个人版 Notion 也支持创建 Integration

**方法 3**：尝试其他链接
- `https://www.notion.so/profile/integrations`
- `https://www.notion.so/{your-workspace-name}/integrations`

---

## 🚀 获取 Token 后的下一步

1. **更新 .env.local 文件**

2. **连接 Integration 到 Database**：
   - 打开你的 Notion Database 页面
   - 点击右上角 **"..."** → **"Connections"**
   - 选择你创建的 Integration
   - 点击 **"Confirm"**

3. **重启开发服务器**：
   ```bash
   npm run dev
   ```

4. **访问网站**：
   打开 `http://localhost:3000`，应该就能看到文章了！

---

## 📸 页面截图参考

**Integration 列表页面**（[https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)）：
```
My integrations

┌──────────────────────────────────────┐
│  BlogCMS                         ... │  ← 点击这里
│  Internal • your-workspace           │
└──────────────────────────────────────┘

+ New integration
```

**Integration 详情页面**（点击名称后）：
```
BlogCMS

Type: Internal Integration
Associated workspace: your-workspace

Capabilities
  ✓ Read content
  ✓ Update content
  ✓ Insert content

Secrets
  Internal Integration Token

  secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ← 这是你要的！

  [Show]  [Copy]  ← 点击这些按钮复制
```

---

**需要更多帮助？**

如果你还是找不到 Token，可以：
1. 截图你看到的页面
2. 告诉我你的 Notion 账号类型（个人免费版/个人付费版/团队版）
3. 告诉我你点击了哪些地方

我会帮你详细排查！
