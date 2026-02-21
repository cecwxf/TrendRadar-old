-- Agent Mart delivery/verification patch
-- 用于已部署旧版 agent_mart_schema.sql 的数据库

-- 1) 扩展任务状态
alter table if exists mart_tasks drop constraint if exists mart_tasks_status_check;
alter table if exists mart_tasks
  add constraint mart_tasks_status_check
  check (status in ('OPEN', 'IN_PROGRESS', 'DELIVERED', 'VERIFYING', 'CLOSED', 'CANCELLED'));

-- 2) 交付表
create table if not exists task_deliveries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references mart_tasks(id) on delete cascade,
  application_id uuid references task_applications(id) on delete set null,
  agent_user_id uuid not null references mart_users(id) on delete cascade,
  evidence_json jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_task_deliveries_task_created on task_deliveries(task_id, created_at desc);
create index if not exists idx_task_deliveries_agent_created on task_deliveries(agent_user_id, created_at desc);

-- 3) 验收表
create table if not exists task_verifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references mart_tasks(id) on delete cascade,
  delivery_id uuid not null references task_deliveries(id) on delete cascade,
  buyer_user_id uuid not null references mart_users(id) on delete cascade,
  result text not null check (result in ('APPROVED', 'REJECTED')),
  comment text,
  reject_reason text,
  change_requests jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table if exists task_verifications
  add column if not exists change_requests jsonb not null default '[]'::jsonb;

update task_verifications
set change_requests = '[]'::jsonb
where change_requests is null;

create index if not exists idx_task_verifications_delivery_created on task_verifications(delivery_id, created_at desc);
create index if not exists idx_task_verifications_task_created on task_verifications(task_id, created_at desc);

-- 4) RLS
alter table task_deliveries enable row level security;
alter table task_verifications enable row level security;

drop policy if exists "task_deliveries_select_agent_or_owner" on task_deliveries;
create policy "task_deliveries_select_agent_or_owner" on task_deliveries
for select using (
  auth.uid() = agent_user_id
  or exists (
    select 1 from mart_tasks t
    where t.id = task_id and t.buyer_user_id = auth.uid()
  )
);

drop policy if exists "task_deliveries_insert_agent" on task_deliveries;
create policy "task_deliveries_insert_agent" on task_deliveries
for insert with check (auth.uid() = agent_user_id);

drop policy if exists "task_verifications_select_related_users" on task_verifications;
create policy "task_verifications_select_related_users" on task_verifications
for select using (
  auth.uid() = buyer_user_id
  or exists (
    select 1 from task_deliveries d
    where d.id = delivery_id and d.agent_user_id = auth.uid()
  )
);

drop policy if exists "task_verifications_insert_buyer" on task_verifications;
create policy "task_verifications_insert_buyer" on task_verifications
for insert with check (
  auth.uid() = buyer_user_id
  and exists (
    select 1 from mart_tasks t
    where t.id = task_id and t.buyer_user_id = auth.uid()
  )
);

-- 5) 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';
