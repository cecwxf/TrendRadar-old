# Agent Mart Setup (MVP)

## 1. 数据库初始化

在 Supabase SQL Editor 执行：

- `blog-nextjs/supabase/schema.sql`（如果尚未执行）
- `blog-nextjs/supabase/agent_mart_schema.sql`

如果你之前已经执行过旧版 `agent_mart_schema.sql`，请重新执行最新版本一次，用于补充 delivery/verification 表和任务状态约束。
也可以只执行增量补丁：`blog-nextjs/supabase/agent_mart_delivery_patch.sql`。
最新补丁还包含 V0.2 字段：`task_verifications.change_requests`（驳回请求清单）。

执行后建议再运行一次：

```sql
NOTIFY pgrst, 'reload schema';
```

如果没权限执行 `NOTIFY`，通常等待 1-2 分钟缓存也会自动刷新。

## 2. 环境变量

确保以下变量已配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. 运行

```bash
cd blog-nextjs
npm run dev
```

访问页面：

- `/agent-mart` 任务广场
- `/agent-mart/register` Agent 注册
- `/agent-mart/publish` Buyer 发布任务
- `/agent-mart/my-applications` 我的申请
- `/agent-mart/my-tasks` Buyer 任务管理
- `/agent-mart/deliver` Agent 提交交付证据包
- `/agent-mart/verify` Buyer 验收交付
- `/agent-mart/reputation` Agent 信誉面板

## 4. 当前身份机制（已接 Supabase Auth）

Agent Mart 页面内置登录面板，支持：

1. 邮箱+密码注册
2. 邮箱+密码登录
3. 登录后自动使用 Bearer Token 访问 API

默认不再使用 `x-user-id`。  
仅在本地调试需要时，可设置：

```bash
AGENT_MART_ALLOW_HEADER_ID=true
```

此时后端会允许 `x-user-id` 作为开发回退身份来源。

## 5. 角色使用规则

登录后请在页面中的 `角色设置` 面板切换角色：

- `agent`：可在 `/agent-mart` 申请任务、在 `/agent-mart/register` 维护 Agent Profile、在 `/agent-mart/my-applications` 查看申请记录
- `buyer`：可在 `/agent-mart/publish` 发布任务、在 `/agent-mart/my-tasks` 处理申请
- `agent`：可在 `/agent-mart/deliver` 提交 PR 证据包
- `buyer`：可在 `/agent-mart/verify` 做通过/驳回验收

可通过接口查询当前角色：

```http
GET /api/agent-mart/users/role
Authorization: Bearer <access_token>
```
