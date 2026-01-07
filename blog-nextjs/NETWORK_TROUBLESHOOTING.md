# 网络问题排查指南

## 🔍 问题症状

```
Error [FetchError]: request to https://api.notion.com/v1/databases/xxx/query failed
errno: 'ETIMEDOUT'
code: 'ETIMEDOUT'
```

这表示**无法连接到 Notion API**。

---

## 🌍 常见原因

### 如果你在中国大陆

Notion API (`api.notion.com`) 可能被防火墙阻止，需要使用代理访问。

### 其他地区

- 网络连接问题
- 防火墙设置
- VPN 干扰

---

## 🔧 解决方案

### 方案 1：配置代理（推荐 - 本地开发）

#### 步骤 1: 确认你有可用的代理

确认你的代理软件正在运行（如 Clash、V2Ray、Shadowsocks 等）

常见代理端口：
- Clash: `http://127.0.0.1:7890`
- V2Ray: `http://127.0.0.1:10809`
- Shadowsocks: `http://127.0.0.1:1080`

#### 步骤 2: 配置环境变量

编辑 `.env.local` 文件，取消注释并修改代理地址：

```bash
# 代理配置（如果需要）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

**重要**：将 `7890` 改为你实际的代理端口！

#### 步骤 3: 重启开发服务器

```bash
# 按 Ctrl+C 停止
# 然后重新启动
npm run dev
```

#### 步骤 4: 测试连接

```bash
node test-direct.js
```

如果成功，应该显示：
```
✅ 查询成功！
结果数量: 1
```

---

### 方案 2：部署到 Vercel（推荐 - 生产环境）

**好消息**：部署到 Vercel 后**不需要代理**！

Vercel 服务器在国外，可以直接访问 Notion API。

#### 快速部署：

1. 按照 [QUICKSTART_EXISTING_WORKSPACE.md](QUICKSTART_EXISTING_WORKSPACE.md) 部署到 Vercel

2. 在 Vercel 配置环境变量：
   ```bash
   NOTION_TOKEN=ntn_你的token
   NOTION_DATABASE_ID=你的database_id
   # 其他必需的环境变量...
   ```

3. 部署完成后，网站就能正常访问 Notion API 了！

**优势**：
- ✅ 无需配置代理
- ✅ 访问速度快
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速

---

### 方案 3：使用系统代理（临时）

如果不想修改 `.env.local`，可以临时设置系统代理：

**Linux/Mac**:
```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
npm run dev
```

**Windows PowerShell**:
```powershell
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"
npm run dev
```

**Windows CMD**:
```cmd
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
npm run dev
```

---

## 🧪 测试代理是否生效

### 方法 1: 使用 curl

```bash
# 测试直接连接（可能失败）
curl -I https://api.notion.com

# 测试通过代理连接（应该成功）
curl -I https://api.notion.com -x http://127.0.0.1:7890
```

### 方法 2: 使用测试脚本

```bash
node test-direct.js
```

成功输出：
```
✅ 查询成功！
结果数量: X
```

---

## ⚙️ 常见代理端口

| 软件 | 默认端口 | 代理地址 |
|------|---------|---------|
| Clash | 7890 | http://127.0.0.1:7890 |
| Clash for Windows | 7890 | http://127.0.0.1:7890 |
| V2Ray | 10809 | http://127.0.0.1:10809 |
| V2RayN | 10809 | http://127.0.0.1:10809 |
| Shadowsocks | 1080 | http://127.0.0.1:1080 |
| ShadowsocksR | 1080 | http://127.0.0.1:1080 |

**如何查看你的代理端口**：

1. 打开你的代理软件
2. 找到 **"设置"** 或 **"Preferences"**
3. 查看 **"端口"** 或 **"Port"** 设置
4. 记下 **"HTTP 端口"** 或 **"Local Port"**

---

## 🔍 进阶排查

### 检查代理是否运行

```bash
# 测试代理端口是否开放
curl http://127.0.0.1:7890

# 或使用 telnet
telnet 127.0.0.1 7890
```

如果连接失败，说明：
- ❌ 代理软件未运行
- ❌ 端口号不正确
- ❌ 代理软件配置错误

### 查看 Node.js 是否使用了代理

```bash
node -e "console.log('HTTP_PROXY:', process.env.HTTP_PROXY)"
node -e "console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY)"
```

应该输出你配置的代理地址。

---

## 📝 最佳实践

### 本地开发

1. **使用代理**（如果在中国大陆）
   - 配置 `.env.local` 的代理设置
   - 确保代理软件始终运行

2. **不使用代理**（如果在国外）
   - 注释掉 `.env.local` 中的代理配置

### 生产部署

- **推荐**：部署到 Vercel
- **无需代理**：Vercel 服务器可直接访问 Notion API
- **环境变量**：在 Vercel Dashboard 配置，不要包含代理设置

---

## ❓ 常见问题

### Q1: 代理配置后还是超时

**A**: 检查：
1. 代理端口是否正确
2. 代理软件是否正在运行
3. 代理是否允许访问 api.notion.com
4. 尝试重启代理软件和开发服务器

### Q2: 不想使用代理怎么办

**A**: 直接部署到 Vercel：
- Vercel 服务器在国外，无需代理
- 按照 [QUICKSTART_EXISTING_WORKSPACE.md](QUICKSTART_EXISTING_WORKSPACE.md) 部署
- 10 分钟搞定

### Q3: 代理设置会影响生产环境吗

**A**: 不会！
- `.env.local` 文件**不会**被提交到 Git
- Vercel 使用你在 Dashboard 配置的环境变量
- 生产环境**不需要**配置代理

### Q4: WSL2 如何使用 Windows 的代理

**A**: WSL2 需要特殊配置：

1. 获取 Windows 主机 IP：
   ```bash
   cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
   ```

2. 使用这个 IP 作为代理地址：
   ```bash
   # 假设 Windows IP 是 172.18.144.1
   HTTP_PROXY=http://172.18.144.1:7890
   HTTPS_PROXY=http://172.18.144.1:7890
   ```

3. 确保 Windows 防火墙允许 WSL2 访问代理端口

---

## 🚀 推荐方案

**最简单的方案**：

1. **本地测试**：配置代理（5 分钟）
   - 修改 `.env.local` 添加代理
   - 重启开发服务器

2. **生产部署**：部署到 Vercel（10 分钟）
   - 无需代理
   - 全球访问快速
   - 自动 HTTPS

---

**还有问题？**

如果以上方法都不行：
1. 检查代理软件日志
2. 尝试不同的代理端口
3. 联系你的代理服务提供商
4. 或者直接部署到 Vercel 跳过本地开发的网络问题

---

**提示**：开发完成后记得部署到 Vercel，那样就完全不用担心网络问题了！
