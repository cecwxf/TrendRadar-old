-- ============================================
-- Agent Mart Schema (MVP)
-- ============================================
-- 在 Supabase SQL Editor 中执行。
-- 依赖：auth.users（Supabase Auth）

create extension if not exists pgcrypto;

-- ============================================
-- 1) Marketplace users
-- ============================================
create table if not exists mart_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('buyer', 'agent')),
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_mart_users_role on mart_users(role);

-- ============================================
-- 2) Agent profiles
-- ============================================
create table if not exists agent_profiles (
  user_id uuid primary key references mart_users(id) on delete cascade,
  headline text,
  skills jsonb not null default '[]'::jsonb,
  tools jsonb not null default '[]'::jsonb,
  bio text,
  reputation_score numeric(5,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_agent_profiles_reputation on agent_profiles(reputation_score desc);

-- ============================================
-- 3) Tasks
-- ============================================
create table if not exists mart_tasks (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references mart_users(id) on delete cascade,
  title text not null,
  description text not null,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  currency text not null default 'USD',
  eta_days int,
  tech_stack jsonb not null default '[]'::jsonb,
  acceptance_json jsonb,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'DELIVERED', 'VERIFYING', 'CLOSED', 'CANCELLED')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (budget_min is null or budget_min >= 0),
  check (budget_max is null or budget_max >= 0),
  check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

-- 兼容已存在表：重建状态约束
alter table mart_tasks drop constraint if exists mart_tasks_status_check;
alter table mart_tasks
  add constraint mart_tasks_status_check
  check (status in ('OPEN', 'IN_PROGRESS', 'DELIVERED', 'VERIFYING', 'CLOSED', 'CANCELLED'));

create index if not exists idx_mart_tasks_status_created on mart_tasks(status, created_at desc);
create index if not exists idx_mart_tasks_buyer_status on mart_tasks(buyer_user_id, status);
create index if not exists idx_mart_tasks_tech_stack on mart_tasks using gin (tech_stack);

-- ============================================
-- 4) Task applications
-- ============================================
create table if not exists task_applications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references mart_tasks(id) on delete cascade,
  agent_user_id uuid not null references mart_users(id) on delete cascade,
  bid_amount numeric(12,2) not null,
  eta_days int not null,
  plan text not null,
  assumptions text,
  confidence numeric(4,2),
  status text not null default 'PENDING' check (status in ('PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(task_id, agent_user_id),
  check (bid_amount >= 0),
  check (eta_days > 0),
  check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index if not exists idx_task_app_task_status on task_applications(task_id, status);
create index if not exists idx_task_app_agent_created on task_applications(agent_user_id, created_at desc);

-- ============================================
-- 5) Task deliveries
-- ============================================
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

-- ============================================
-- 6) Task verifications
-- ============================================
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

create index if not exists idx_task_verifications_delivery_created on task_verifications(delivery_id, created_at desc);
create index if not exists idx_task_verifications_task_created on task_verifications(task_id, created_at desc);

-- ============================================
-- 7) Audit logs
-- ============================================
create table if not exists mart_audit_logs (
  id bigserial primary key,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_mart_audit_entity on mart_audit_logs(entity_type, entity_id, created_at desc);

-- ============================================
-- 8) updated_at trigger
-- ============================================
create or replace function mart_update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_mart_users_updated_at on mart_users;
create trigger update_mart_users_updated_at
  before update on mart_users
  for each row execute function mart_update_updated_at_column();

drop trigger if exists update_agent_profiles_updated_at on agent_profiles;
create trigger update_agent_profiles_updated_at
  before update on agent_profiles
  for each row execute function mart_update_updated_at_column();

drop trigger if exists update_mart_tasks_updated_at on mart_tasks;
create trigger update_mart_tasks_updated_at
  before update on mart_tasks
  for each row execute function mart_update_updated_at_column();

drop trigger if exists update_task_applications_updated_at on task_applications;
create trigger update_task_applications_updated_at
  before update on task_applications
  for each row execute function mart_update_updated_at_column();

-- ============================================
-- 9) RLS
-- ============================================
alter table mart_users enable row level security;
alter table agent_profiles enable row level security;
alter table mart_tasks enable row level security;
alter table task_applications enable row level security;
alter table task_deliveries enable row level security;
alter table task_verifications enable row level security;
alter table mart_audit_logs enable row level security;

-- mart_users
drop policy if exists "mart_users_select_public" on mart_users;
create policy "mart_users_select_public" on mart_users
for select using (true);

drop policy if exists "mart_users_insert_self" on mart_users;
create policy "mart_users_insert_self" on mart_users
for insert with check (auth.uid() = id);

drop policy if exists "mart_users_update_self" on mart_users;
create policy "mart_users_update_self" on mart_users
for update using (auth.uid() = id);

-- agent_profiles
drop policy if exists "agent_profiles_select_public" on agent_profiles;
create policy "agent_profiles_select_public" on agent_profiles
for select using (true);

drop policy if exists "agent_profiles_insert_self" on agent_profiles;
create policy "agent_profiles_insert_self" on agent_profiles
for insert with check (auth.uid() = user_id);

drop policy if exists "agent_profiles_update_self" on agent_profiles;
create policy "agent_profiles_update_self" on agent_profiles
for update using (auth.uid() = user_id);

-- mart_tasks
drop policy if exists "mart_tasks_select_public" on mart_tasks;
create policy "mart_tasks_select_public" on mart_tasks
for select using (true);

drop policy if exists "mart_tasks_insert_buyer" on mart_tasks;
create policy "mart_tasks_insert_buyer" on mart_tasks
for insert with check (auth.uid() = buyer_user_id);

drop policy if exists "mart_tasks_update_owner" on mart_tasks;
create policy "mart_tasks_update_owner" on mart_tasks
for update using (auth.uid() = buyer_user_id);

-- task_applications
drop policy if exists "task_applications_select_agent_or_owner" on task_applications;
create policy "task_applications_select_agent_or_owner" on task_applications
for select using (
  auth.uid() = agent_user_id
  or exists (
    select 1 from mart_tasks t
    where t.id = task_id and t.buyer_user_id = auth.uid()
  )
);

drop policy if exists "task_applications_insert_agent" on task_applications;
create policy "task_applications_insert_agent" on task_applications
for insert with check (auth.uid() = agent_user_id);

drop policy if exists "task_applications_update_agent_or_owner" on task_applications;
create policy "task_applications_update_agent_or_owner" on task_applications
for update using (
  auth.uid() = agent_user_id
  or exists (
    select 1 from mart_tasks t
    where t.id = task_id and t.buyer_user_id = auth.uid()
  )
);

-- task_deliveries
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

-- task_verifications
drop policy if exists "task_verifications_select_related_users" on task_verifications;
create policy "task_verifications_select_related_users" on task_verifications
for select using (
  auth.uid() = buyer_user_id
  or exists (
    select 1
    from task_deliveries d
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

-- audit logs 仅 service_role 可写，默认不开放给 anon
drop policy if exists "mart_audit_logs_select_service" on mart_audit_logs;
create policy "mart_audit_logs_select_service" on mart_audit_logs
for select using (auth.role() = 'service_role');
