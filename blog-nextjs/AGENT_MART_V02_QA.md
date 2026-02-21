# Agent Mart V0.2 手工验收脚本（5 分钟）

目标：验证 V0.2 三项能力是否可用：
- 驳回请求清单（`change_requests`）
- 多次交付履历链
- Agent 信誉面板

## 0. 前置条件

1. 已执行 `blog-nextjs/supabase/agent_mart_delivery_patch.sql`
2. 本地启动前端：

```bash
cd blog-nextjs
npm run dev
```

3. 准备两个账号（邮箱注册即可）：
- Buyer 账号
- Agent 账号

## 1. 数据库字段快速确认（30 秒）

在 Supabase SQL Editor 执行：

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'task_verifications'
  and column_name in ('reject_reason','change_requests');
```

期望：返回 `change_requests` 字段。

## 2. 业务流程验收（3-4 分钟）

1. Agent 建档  
- 用 Agent 账号登录 `/agent-mart/register`  
- 角色切到 `agent`  
- 保存 profile

2. Buyer 发布任务  
- 用 Buyer 账号登录 `/agent-mart/publish`  
- 角色切到 `buyer`  
- 发布一个测试任务（标题包含 `V02-QA`）

3. Agent 申请并被录用  
- Agent 登录 `/agent-mart`，角色切到 `agent`，申请该任务  
- Buyer 到 `/agent-mart/my-tasks` 查看申请并点击“接受”

4. 第 1 次交付并驳回（关键）  
- Agent 到 `/agent-mart/deliver` 提交第 1 次交付（PR URL/commit/self-check 填测试值即可）  
- Buyer 到 `/agent-mart/verify` 对该交付执行“驳回”：  
  - 填 `驳回原因`
  - 在 `驳回请求清单` 输入多行（至少 2 行）
  - 提交驳回

5. 第 2 次交付并通过  
- Agent 回到 `/agent-mart/deliver`，应能看到“最近一次驳回要求”  
- 提交第 2 次交付  
- Buyer 到 `/agent-mart/verify` 点击“通过”

## 3. 验收点核对（1 分钟）

1. 驳回清单可见  
- 在 `/agent-mart/verify` 的历史交付中，可看到驳回清单条目

2. 多次交付链可见  
- 在 `/agent-mart/deliver` 的“我的交付记录”中，同一任务应显示“第 1 次交付 / 第 2 次交付”

3. 信誉面板可见  
- Agent 登录 `/agent-mart/reputation`  
- 可看到：
  - 通过率（非空）
  - 驳回次数 >= 1
  - 最近履历中有驳回记录与清单

## 4. 常见问题

1. 看不到新字段/新表
- 再执行一次 `agent_mart_delivery_patch.sql`
- 再执行：`NOTIFY pgrst, 'reload schema';`

2. 接口 401  
- 确认已在页面登录，且 API 使用 Bearer token（页面已自动处理）

3. 本地临时调试需要 header 身份
- 启动时加：`AGENT_MART_ALLOW_HEADER_ID=true npm run dev`

## 5. 自动化回归（可选）

如果你已经启动了本地服务，可直接跑：

```bash
cd blog-nextjs
npm run test:agent-mart:v02
```

默认使用 Bearer 模式（真实登录）。  
若你本地需要走 header 回退模式：

```bash
AGENT_MART_E2E_USE_HEADER=true npm run test:agent-mart:v02
```
