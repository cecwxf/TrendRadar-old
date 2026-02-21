# 🚀 HuggingFace 数据源快速开始

## 5 分钟快速上手

### 1. 启动服务（默认配置）

```bash
cd blog-nextjs
npm run dev
```

访问: http://localhost:3000/llm

**就这么简单！** 默认配置已经启用 HuggingFace 数据源。

### 2. 验证数据来源

打开浏览器控制台，查看日志：

```
✅ 成功获取 HuggingFace 数据
```

或者访问 API：
```
http://localhost:3000/api/llm/leaderboard
```

查看返回的模型 ID，格式为 `author/model-name`（如 `meta-llama/Llama-3.3-70B-Instruct`）。

## 可选配置

### 提高速率限制（推荐）

1. 访问 https://huggingface.co/settings/tokens
2. 创建新的 Access Token
3. 创建 `.env.local` 文件：

```bash
HF_API_TOKEN=hf_xxxxxxxxxxxxx
```

4. 重启服务器

### 切换到模拟数据

如果需要使用模拟数据：

```bash
# .env.local
LLM_DATA_SOURCE=mock
```

### 调整模型数量

```bash
# .env.local
HF_MODEL_LIMIT=100  # 获取 100 个模型
```

## 常见问题

### Q: 看到 "HuggingFace 数据获取失败" 怎么办？

A: 这是正常的回退机制，系统会自动使用模拟数据。可能原因：
- 网络问题
- HuggingFace API 暂时不可用
- 速率限制

解决方案：配置 API Token 或等待一段时间后重试。

### Q: 如何确认使用的是真实数据？

A: 查看模型名称，真实数据格式为 `author/model-name`，模拟数据格式为简单名称（如 "Claude Opus 4.6"）。

### Q: 数据多久更新一次？

A: 默认每小时更新一次。可通过 `LLM_CACHE_TTL` 环境变量调整。

## 完整文档

- [HuggingFace 集成指南](./HUGGINGFACE_INTEGRATION.md)
- [LLM 排行榜文档](./LLM_RANKINGS_README.md)
- [环境变量示例](./.env.llm.example)

---

**提示**: 默认配置已经很好用了，无需额外配置即可开始使用！
