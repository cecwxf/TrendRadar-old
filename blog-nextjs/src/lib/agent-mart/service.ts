import { supabaseAdmin } from "@/lib/supabase/client";
import type {
  AgentReputationRecentRecord,
  AgentReputationSummary,
  AgentProfile,
  ApplicationStatus,
  CreateApplicationInput,
  CreateNotificationInput,
  CreateTaskInput,
  DeliveryEvidence,
  GitHubWebhookIssuePayload,
  GitHubWebhookPRPayload,
  MartTask,
  MartTaskStatus,
  MartTaskType,
  MartTaskSource,
  NotificationType,
  MartUser,
  MartUserRole,
  MessageType,
  Notification,
  ReputationScore,
  ReputationScoreBreakdown,
  ReputationTier,
  SendMessageInput,
  SubmitDeliveryInput,
  TaskApplication,
  TaskDelivery,
  TaskMessage,
  TaskVerification,
  TaskQueryFilters,
  UpdateTaskInput,
  VerificationResult,
} from "@/types/agent-mart";

const TABLES = {
  MART_USERS: "mart_users",
  AGENT_PROFILES: "agent_profiles",
  MART_TASKS: "mart_tasks",
  TASK_APPLICATIONS: "task_applications",
  TASK_DELIVERIES: "task_deliveries",
  TASK_VERIFICATIONS: "task_verifications",
  TASK_MESSAGES: "task_messages",
  NOTIFICATIONS: "notifications",
  MART_AUDIT_LOGS: "mart_audit_logs",
} as const;

function getAdminClient() {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not configured");
  }
  return supabaseAdmin;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function mapTask(row: any): MartTask {
  return {
    id: row.id,
    buyer_user_id: row.buyer_user_id,
    title: row.title,
    description: row.description,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    currency: row.currency,
    eta_days: row.eta_days,
    tech_stack: normalizeStringArray(row.tech_stack),
    acceptance_json: row.acceptance_json || null,
    type: row.type || "CODE",
    deadline: row.deadline || null,
    source: row.source || "MANUAL",
    github_repo: row.github_repo || null,
    github_issue_id: row.github_issue_id ?? null,
    github_pr_id: row.github_pr_id ?? null,
    application_count: Number(row.application_count || 0),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapApplication(row: any): TaskApplication {
  return {
    id: row.id,
    task_id: row.task_id,
    agent_user_id: row.agent_user_id,
    bid_amount: Number(row.bid_amount),
    eta_days: Number(row.eta_days),
    plan: row.plan,
    assumptions: row.assumptions,
    confidence: row.confidence !== null ? Number(row.confidence) : null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapDelivery(row: any): TaskDelivery {
  return {
    id: row.id,
    task_id: row.task_id,
    application_id: row.application_id,
    agent_user_id: row.agent_user_id,
    evidence_json: row.evidence_json as DeliveryEvidence,
    created_at: row.created_at,
  };
}

function mapVerification(row: any): TaskVerification {
  return {
    id: row.id,
    task_id: row.task_id,
    delivery_id: row.delivery_id,
    buyer_user_id: row.buyer_user_id,
    result: row.result as VerificationResult,
    comment: row.comment || null,
    reject_reason: row.reject_reason || null,
    change_requests: normalizeStringArray(row.change_requests),
    created_at: row.created_at,
  };
}

function mapAgentProfile(row: any): AgentProfile {
  return {
    user_id: row.user_id,
    headline: row.headline,
    skills: normalizeStringArray(row.skills),
    tools: normalizeStringArray(row.tools),
    bio: row.bio,
    reputation_score: Number(row.reputation_score || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function addAuditLog(params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  const db = getAdminClient();
  await db.from(TABLES.MART_AUDIT_LOGS).insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    meta: params.meta || {},
  });
}

export async function upsertMartUser(input: {
  userId: string;
  role: MartUserRole;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  githubId?: string;
}): Promise<MartUser> {
  const db = getAdminClient();

  // Fetch existing user to merge roles additively
  const { data: existing } = await db
    .from(TABLES.MART_USERS)
    .select("roles")
    .eq("id", input.userId)
    .maybeSingle();

  const existingRoles: MartUserRole[] = Array.isArray(existing?.roles) ? existing.roles : [];
  const mergedRoles = Array.from(new Set([...existingRoles, input.role]));

  const payload: Record<string, unknown> = {
    id: input.userId,
    roles: mergedRoles,
    display_name: input.displayName || null,
  };

  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.githubId !== undefined) payload.github_id = input.githubId || null;

  const { data, error } = await db
    .from(TABLES.MART_USERS)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to upsert mart user");
  }

  await addAuditLog({
    actorUserId: input.userId,
    action: "MART_USER_UPSERT",
    entityType: "mart_user",
    entityId: input.userId,
    meta: { role: input.role, roles: mergedRoles },
  });

  return data as MartUser;
}

export async function getMartUserById(userId: string): Promise<MartUser | null> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.MART_USERS)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MartUser | null) || null;
}

export async function upsertAgentProfile(input: {
  userId: string;
  headline?: string;
  skills?: string[];
  tools?: string[];
  bio?: string;
}): Promise<AgentProfile> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.AGENT_PROFILES)
    .upsert(
      {
        user_id: input.userId,
        headline: input.headline || null,
        skills: input.skills || [],
        tools: input.tools || [],
        bio: input.bio || null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to upsert agent profile");
  }

  await addAuditLog({
    actorUserId: input.userId,
    action: "AGENT_PROFILE_UPSERT",
    entityType: "agent_profile",
    entityId: input.userId,
  });

  return mapAgentProfile(data);
}

export async function getAgentProfileByUserId(userId: string): Promise<AgentProfile | null> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.AGENT_PROFILES)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  return mapAgentProfile(data);
}

export async function listTasks(filters: TaskQueryFilters = {}): Promise<(MartTask & { buyer_info?: { display_name: string | null; avatar_url: string | null } })[]> {
  const db = getAdminClient();

  let query = db.from(TABLES.MART_TASKS).select("*").order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.tech) {
    query = query.contains("tech_stack", [filters.tech]);
  }

  if (typeof filters.minBudget === "number") {
    query = query.gte("budget_max", filters.minBudget);
  }

  if (typeof filters.maxBudget === "number") {
    query = query.lte("budget_min", filters.maxBudget);
  }

  if (filters.q) {
    const safeQ = filters.q.replace(/,/g, " ");
    query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
  }

  query = query.limit(filters.limit || 50);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const tasks = (data || []).map(mapTask);

  // Batch-fetch buyer info for all tasks
  const buyerIds = [...new Set(tasks.map((t) => t.buyer_user_id))];
  const buyerMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();

  if (buyerIds.length > 0) {
    const adminDb = getAdminClient();
    const { data: buyers } = await adminDb
      .from(TABLES.MART_USERS)
      .select("id, display_name, avatar_url")
      .in("id", buyerIds);

    for (const b of buyers || []) {
      buyerMap.set(b.id, { display_name: b.display_name, avatar_url: b.avatar_url });
    }
  }

  return tasks.map((t) => ({
    ...t,
    buyer_info: buyerMap.get(t.buyer_user_id) || { display_name: null, avatar_url: null },
  }));
}

export async function createTask(input: CreateTaskInput): Promise<MartTask> {
  const db = getAdminClient();

  const isDraft = input.asDraft === true;

  const payload = {
    buyer_user_id: input.buyerUserId,
    title: input.title,
    description: input.description,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    currency: input.currency || "USD",
    eta_days: input.etaDays ?? null,
    tech_stack: input.techStack || [],
    acceptance_json: input.acceptance
      ? {
          ci_required: input.acceptance.ciRequired ?? false,
          checklist: input.acceptance.checklist || [],
          notes: input.acceptance.notes || "",
        }
      : null,
    type: input.type || "CODE",
    deadline: input.deadline || null,
    source: input.source || "MANUAL",
    github_repo: input.githubRepo || null,
    github_issue_id: input.githubIssueId ?? null,
    status: (isDraft ? "DRAFT" : "OPEN") satisfies MartTaskStatus,
  };

  const { data, error } = await db
    .from(TABLES.MART_TASKS)
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create task");
  }

  await addAuditLog({
    actorUserId: input.buyerUserId,
    action: isDraft ? "TASK_DRAFT" : "TASK_CREATE",
    entityType: "task",
    entityId: data.id,
    meta: {
      title: input.title,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
    },
  });

  return mapTask(data);
}

export async function listBuyerTasks(buyerUserId: string): Promise<MartTask[]> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.MART_TASKS)
    .select("*")
    .eq("buyer_user_id", buyerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapTask);
}

export async function getTaskById(taskId: string): Promise<(MartTask & { buyer_info?: { display_name: string | null; avatar_url: string | null } }) | null> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.MART_TASKS)
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const task = mapTask(data);

  // Fetch buyer info
  const adminDb = getAdminClient();
  const { data: buyer } = await adminDb
    .from(TABLES.MART_USERS)
    .select("display_name, avatar_url")
    .eq("id", task.buyer_user_id)
    .maybeSingle();

  return {
    ...task,
    buyer_info: buyer
      ? { display_name: buyer.display_name, avatar_url: buyer.avatar_url }
      : { display_name: null, avatar_url: null },
  };
}

export async function updateTask(input: UpdateTaskInput): Promise<MartTask> {
  const db = getAdminClient();

  const { data: existing, error: fetchError } = await db
    .from(TABLES.MART_TASKS)
    .select("*")
    .eq("id", input.taskId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Task not found");
  }
  if (existing.buyer_user_id !== input.buyerUserId) {
    throw new Error("Only the task owner can update this task");
  }

  const editable: MartTaskStatus[] = ["DRAFT", "OPEN"];
  if (!editable.includes(existing.status)) {
    throw new Error(`Cannot edit task in status ${existing.status}`);
  }

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.budgetMin !== undefined) updates.budget_min = input.budgetMin;
  if (input.budgetMax !== undefined) updates.budget_max = input.budgetMax;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.etaDays !== undefined) updates.eta_days = input.etaDays;
  if (input.techStack !== undefined) updates.tech_stack = input.techStack;
  if (input.type !== undefined) updates.type = input.type;
  if (input.deadline !== undefined) updates.deadline = input.deadline;
  if (input.githubRepo !== undefined) updates.github_repo = input.githubRepo;
  if (input.acceptance !== undefined) {
    updates.acceptance_json = input.acceptance
      ? {
          ci_required: input.acceptance.ciRequired ?? false,
          checklist: input.acceptance.checklist || [],
          notes: input.acceptance.notes || "",
        }
      : null;
  }

  if (Object.keys(updates).length === 0) {
    return mapTask(existing);
  }

  const { data, error } = await db
    .from(TABLES.MART_TASKS)
    .update(updates)
    .eq("id", input.taskId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update task");
  }

  await addAuditLog({
    actorUserId: input.buyerUserId,
    action: "TASK_UPDATE",
    entityType: "task",
    entityId: input.taskId,
    meta: { updatedFields: Object.keys(updates) },
  });

  return mapTask(data);
}

export async function publishDraftTask(taskId: string, buyerUserId: string): Promise<MartTask> {
  const db = getAdminClient();

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.buyer_user_id !== buyerUserId) {
    throw new Error("Access denied");
  }

  if (task.status !== "DRAFT") {
    throw new Error("Only draft tasks can be published");
  }

  const { data: updated, error: updateError } = await db
    .from(TABLES.MART_TASKS)
    .update({ status: "OPEN" })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to publish task");
  }

  await addAuditLog({
    actorUserId: buyerUserId,
    action: "TASK_PUBLISH",
    entityType: "task",
    entityId: taskId,
  });

  return mapTask(updated);
}

export async function createApplication(input: CreateApplicationInput): Promise<TaskApplication> {
  const db = getAdminClient();

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("id, status")
    .eq("id", input.taskId)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.status !== "OPEN" && task.status !== "BIDDING") {
    throw new Error("Task is not open for applications");
  }

  const { data, error } = await db
    .from(TABLES.TASK_APPLICATIONS)
    .insert({
      task_id: input.taskId,
      agent_user_id: input.agentUserId,
      bid_amount: input.bidAmount,
      eta_days: input.etaDays,
      plan: input.plan,
      assumptions: input.assumptions || null,
      confidence: input.confidence ?? null,
      status: "PENDING" satisfies ApplicationStatus,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("You have already applied to this task");
    }
    throw new Error(error?.message || "Failed to create application");
  }

  // Auto-transition OPEN → BIDDING on first application
  if (task.status === "OPEN") {
    await db
      .from(TABLES.MART_TASKS)
      .update({ status: "BIDDING" satisfies MartTaskStatus })
      .eq("id", input.taskId);

    await emitStatusChange({
      taskId: input.taskId,
      actorId: input.agentUserId,
      message: "First application received — task is now in BIDDING.",
      notifyUserId: undefined,
      notificationType: undefined,
    });
  }

  // Notify buyer about new application
  const { data: taskFull } = await db
    .from(TABLES.MART_TASKS)
    .select("buyer_user_id")
    .eq("id", input.taskId)
    .maybeSingle();

  if (taskFull?.buyer_user_id) {
    await emitStatusChange({
      taskId: input.taskId,
      actorId: input.agentUserId,
      message: "New application submitted.",
      notifyUserId: taskFull.buyer_user_id,
      notificationType: "TASK_APPLICATION",
      notificationTitle: "New application received",
      notificationBody: "An agent has applied to your task.",
      meta: { application_id: data.id },
    });
  }

  await addAuditLog({
    actorUserId: input.agentUserId,
    action: "APPLICATION_CREATE",
    entityType: "task_application",
    entityId: data.id,
    meta: { taskId: input.taskId, bidAmount: input.bidAmount },
  });

  return mapApplication(data);
}

export async function listMyApplications(agentUserId: string): Promise<
  Array<{
    application: TaskApplication;
    task: MartTask | null;
  }>
> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.TASK_APPLICATIONS)
    .select("*, mart_tasks(*)")
    .eq("agent_user_id", agentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    application: mapApplication(row),
    task: row.mart_tasks ? mapTask(row.mart_tasks) : null,
  }));
}

export async function listTaskApplicationsForBuyer(
  taskId: string,
  buyerUserId: string
): Promise<TaskApplication[]> {
  const db = getAdminClient();

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("id, buyer_user_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task || task.buyer_user_id !== buyerUserId) {
    throw new Error("Task not found or access denied");
  }

  const { data, error } = await db
    .from(TABLES.TASK_APPLICATIONS)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapApplication);
}

export async function updateApplicationStatusByBuyer(input: {
  applicationId: string;
  buyerUserId: string;
  status: "ACCEPTED" | "REJECTED";
}): Promise<TaskApplication> {
  const db = getAdminClient();

  const { data: app, error: appError } = await db
    .from(TABLES.TASK_APPLICATIONS)
    .select("*")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (appError) {
    throw new Error(appError.message);
  }

  if (!app) {
    throw new Error("Application not found");
  }

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("id, buyer_user_id")
    .eq("id", app.task_id)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task || task.buyer_user_id !== input.buyerUserId) {
    throw new Error("Task not found or access denied");
  }

  const { data: updated, error: updateError } = await db
    .from(TABLES.TASK_APPLICATIONS)
    .update({ status: input.status })
    .eq("id", input.applicationId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to update application status");
  }

  if (input.status === "ACCEPTED") {
    await db.from(TABLES.MART_TASKS).update({ status: "IN_PROGRESS" }).eq("id", app.task_id);

    await db
      .from(TABLES.TASK_APPLICATIONS)
      .update({ status: "REJECTED" })
      .eq("task_id", app.task_id)
      .neq("id", input.applicationId)
      .in("status", ["PENDING", "SHORTLISTED"]);

    await emitStatusChange({
      taskId: app.task_id,
      actorId: input.buyerUserId,
      message: "Application accepted — task is now IN_PROGRESS.",
      notifyUserId: app.agent_user_id,
      notificationType: "APPLICATION_ACCEPTED",
      notificationTitle: "Your application was accepted",
      notificationBody: "Your application has been accepted. The task is now in progress.",
      meta: { application_id: input.applicationId },
    });
  } else if (input.status === "REJECTED") {
    await emitStatusChange({
      taskId: app.task_id,
      actorId: input.buyerUserId,
      message: "Application rejected.",
      notifyUserId: app.agent_user_id,
      notificationType: "APPLICATION_REJECTED",
      notificationTitle: "Your application was rejected",
      notificationBody: "Your application has been rejected by the task owner.",
      meta: { application_id: input.applicationId },
    });
  }

  await addAuditLog({
    actorUserId: input.buyerUserId,
    action: input.status === "ACCEPTED" ? "APPLICATION_ACCEPT" : "APPLICATION_REJECT",
    entityType: "task_application",
    entityId: input.applicationId,
    meta: { taskId: app.task_id },
  });

  return mapApplication(updated);
}

function validateDeliveryEvidence(evidence: DeliveryEvidence, taskId: string): string[] {
  const warnings: string[] = [];

  if (!evidence.pr_url) {
    warnings.push("pr_url is required");
  }
  if (!evidence.repo_full_name) {
    warnings.push("repo_full_name is required");
  }
  if (!evidence.pr_number) {
    warnings.push("pr_number is required");
  }
  if (!evidence.commit_sha) {
    warnings.push("commit_sha is required");
  }
  if (!evidence.self_check) {
    warnings.push("self_check is required");
  }

  // V0.2: PR branch naming convention check (agent/<task_id>)
  if (evidence.pr_url && !evidence.pr_url.includes(`agent/${taskId}`)) {
    warnings.push(`PR branch should follow naming convention: agent/${taskId}`);
  }

  return warnings;
}

export async function submitTaskDelivery(input: SubmitDeliveryInput): Promise<TaskDelivery> {
  const db = getAdminClient();

  // V0.2: Validate delivery evidence format
  const validationErrors = validateDeliveryEvidence(input.evidence, input.taskId);
  const hardErrors = validationErrors.filter(
    (msg) => !msg.startsWith("PR branch should")
  );
  if (hardErrors.length > 0) {
    throw new Error(`Invalid delivery evidence: ${hardErrors.join("; ")}`);
  }

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("id, status, buyer_user_id")
    .eq("id", input.taskId)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task) {
    throw new Error("Task not found");
  }

  if (!["IN_PROGRESS", "DELIVERED", "VERIFYING", "REVISING"].includes(task.status)) {
    throw new Error("Task is not in deliverable status");
  }

  // V0.2: For REVISING tasks, fetch the latest rejection's change_requests
  let previousChangeRequests: string[] = [];
  let isResubmission = false;
  if (task.status === "REVISING") {
    isResubmission = true;
    const { data: lastRejection } = await db
      .from(TABLES.TASK_VERIFICATIONS)
      .select("change_requests")
      .eq("task_id", input.taskId)
      .eq("result", "REJECTED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRejection) {
      previousChangeRequests = normalizeStringArray(lastRejection.change_requests);
    }
  }

  const { data: acceptedApp, error: appError } = await db
    .from(TABLES.TASK_APPLICATIONS)
    .select("id, status")
    .eq("task_id", input.taskId)
    .eq("agent_user_id", input.agentUserId)
    .eq("status", "ACCEPTED")
    .maybeSingle();

  if (appError) {
    throw new Error(appError.message);
  }

  if (!acceptedApp) {
    throw new Error("No accepted application found for this task");
  }

  const { data: created, error: createError } = await db
    .from(TABLES.TASK_DELIVERIES)
    .insert({
      task_id: input.taskId,
      application_id: acceptedApp.id,
      agent_user_id: input.agentUserId,
      evidence_json: input.evidence,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to submit delivery");
  }

  await db.from(TABLES.MART_TASKS).update({ status: "DELIVERED" }).eq("id", input.taskId);

  // V0.2: Soft warnings (e.g. branch naming) included in audit
  const softWarnings = validationErrors.filter((msg) =>
    msg.startsWith("PR branch should")
  );

  await addAuditLog({
    actorUserId: input.agentUserId,
    action: isResubmission ? "DELIVERY_RESUBMIT" : "DELIVERY_SUBMIT",
    entityType: "task_delivery",
    entityId: created.id,
    meta: {
      taskId: input.taskId,
      prUrl: input.evidence.pr_url,
      commitSha: input.evidence.commit_sha,
      ...(isResubmission ? { previousChangeRequests } : {}),
      ...(softWarnings.length > 0 ? { warnings: softWarnings } : {}),
    },
  });

  await emitStatusChange({
    taskId: input.taskId,
    actorId: input.agentUserId,
    message: isResubmission
      ? "Delivery resubmitted after revision."
      : "Delivery submitted — awaiting buyer verification.",
    notifyUserId: task.buyer_user_id,
    notificationType: isResubmission ? "DELIVERY_RESUBMITTED" : "DELIVERY_SUBMITTED",
    notificationTitle: isResubmission ? "Delivery resubmitted" : "New delivery submitted",
    notificationBody: isResubmission
      ? "The agent has resubmitted a revised delivery for your task."
      : "The agent has submitted a delivery for your task. Please review it.",
    meta: { delivery_id: created.id, pr_url: input.evidence.pr_url },
  });

  return {
    ...mapDelivery(created),
    ...(softWarnings.length > 0 ? { warnings: softWarnings } : {}),
  } as TaskDelivery;
}

async function listVerificationsByDeliveryIds(deliveryIds: string[]): Promise<TaskVerification[]> {
  if (deliveryIds.length === 0) return [];

  const db = getAdminClient();
  const { data, error } = await db
    .from(TABLES.TASK_VERIFICATIONS)
    .select("*")
    .in("delivery_id", deliveryIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapVerification);
}

export async function listTaskDeliveriesForBuyer(
  taskId: string,
  buyerUserId: string
): Promise<Array<{ delivery: TaskDelivery; verification: TaskVerification | null }>> {
  const db = getAdminClient();

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("id, buyer_user_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task || task.buyer_user_id !== buyerUserId) {
    throw new Error("Task not found or access denied");
  }

  const { data, error } = await db
    .from(TABLES.TASK_DELIVERIES)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const deliveries = (data || []).map(mapDelivery);
  const verifications = await listVerificationsByDeliveryIds(deliveries.map((item) => item.id));

  const latestVerificationByDeliveryId = new Map<string, TaskVerification>();
  for (const verification of verifications) {
    if (!latestVerificationByDeliveryId.has(verification.delivery_id)) {
      latestVerificationByDeliveryId.set(verification.delivery_id, verification);
    }
  }

  return deliveries.map((delivery) => ({
    delivery,
    verification: latestVerificationByDeliveryId.get(delivery.id) || null,
  }));
}

export async function listMyDeliveries(agentUserId: string): Promise<
  Array<{
    delivery: TaskDelivery;
    task: MartTask | null;
    verification: TaskVerification | null;
  }>
> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.TASK_DELIVERIES)
    .select("*, mart_tasks(*)")
    .eq("agent_user_id", agentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const deliveries = (data || []).map((row: any) => ({
    delivery: mapDelivery(row),
    task: row.mart_tasks ? mapTask(row.mart_tasks) : null,
  }));

  const verifications = await listVerificationsByDeliveryIds(
    deliveries.map((item) => item.delivery.id)
  );
  const latestVerificationByDeliveryId = new Map<string, TaskVerification>();
  for (const verification of verifications) {
    if (!latestVerificationByDeliveryId.has(verification.delivery_id)) {
      latestVerificationByDeliveryId.set(verification.delivery_id, verification);
    }
  }

  return deliveries.map((item) => ({
    ...item,
    verification: latestVerificationByDeliveryId.get(item.delivery.id) || null,
  }));
}

export async function verifyTaskDeliveryByBuyer(input: {
  deliveryId: string;
  buyerUserId: string;
  result: VerificationResult;
  comment?: string;
  rejectReason?: string;
  changeRequests?: string[];
}): Promise<TaskVerification> {
  const db = getAdminClient();

  const { data: delivery, error: deliveryError } = await db
    .from(TABLES.TASK_DELIVERIES)
    .select("*")
    .eq("id", input.deliveryId)
    .maybeSingle();

  if (deliveryError) {
    throw new Error(deliveryError.message);
  }

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  const { data: task, error: taskError } = await db
    .from(TABLES.MART_TASKS)
    .select("id, buyer_user_id")
    .eq("id", delivery.task_id)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task || task.buyer_user_id !== input.buyerUserId) {
    throw new Error("Task not found or access denied");
  }

  const { data: existedVerification, error: existedError } = await db
    .from(TABLES.TASK_VERIFICATIONS)
    .select("id")
    .eq("delivery_id", input.deliveryId)
    .maybeSingle();

  if (existedError) {
    throw new Error(existedError.message);
  }

  if (existedVerification) {
    throw new Error("Delivery already verified");
  }

  const { data: verification, error: verifyError } = await db
    .from(TABLES.TASK_VERIFICATIONS)
    .insert({
      task_id: delivery.task_id,
      delivery_id: input.deliveryId,
      buyer_user_id: input.buyerUserId,
      result: input.result,
      comment: input.comment || null,
      reject_reason: input.result === "REJECTED" ? input.rejectReason || "Rejected by buyer" : null,
      change_requests: input.result === "REJECTED" ? input.changeRequests || [] : [],
    })
    .select("*")
    .single();

  if (verifyError || !verification) {
    throw new Error(verifyError?.message || "Failed to verify delivery");
  }

  await db
    .from(TABLES.MART_TASKS)
    .update({ status: input.result === "APPROVED" ? "CLOSED" : "REVISING" })
    .eq("id", delivery.task_id);

  await addAuditLog({
    actorUserId: input.buyerUserId,
    action: input.result === "APPROVED" ? "DELIVERY_APPROVE" : "DELIVERY_REJECT",
    entityType: "task_delivery",
    entityId: input.deliveryId,
    meta: {
      taskId: delivery.task_id,
      result: input.result,
      rejectReason: input.rejectReason || null,
    },
  });

  const isApproved = input.result === "APPROVED";
  await emitStatusChange({
    taskId: delivery.task_id,
    actorId: input.buyerUserId,
    message: isApproved
      ? "Delivery approved — task closed."
      : "Delivery rejected — revision requested.",
    notifyUserId: delivery.agent_user_id,
    notificationType: isApproved ? "DELIVERY_APPROVED" : "DELIVERY_REJECTED",
    notificationTitle: isApproved ? "Delivery approved" : "Delivery rejected",
    notificationBody: isApproved
      ? "Your delivery has been approved and the task is now closed."
      : `Your delivery was rejected. ${input.rejectReason || "Please revise and resubmit."}`,
    meta: { delivery_id: input.deliveryId },
  });

  return mapVerification(verification);
}

// ─── Reputation Score Computation ────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function getTier(score: number): ReputationTier {
  if (score >= 90) return "ELITE";
  if (score >= 70) return "EXPERT";
  if (score >= 40) return "SKILLED";
  return "ROOKIE";
}

/**
 * Compute a 0~100 reputation score from raw metrics.
 *
 * Weights:
 *   completion  35% — approved / total deliveries (rewards volume + success)
 *   quality     30% — pass rate among verified deliveries
 *   speed       20% — delivery speed (benchmarked against 48h target)
 *   consistency 15% — low rework count (0 rework = 100, ≥3 avg = 0)
 */
export function computeReputationScore(raw: {
  totalDeliveries: number;
  approvedDeliveries: number;
  verifiedDeliveries: number;
  passRate: number;
  avgReworkCount: number;
  avgDeliveryHours: number | null;
  closedTasks: number;
}): ReputationScore {
  // --- completion (35%) ---
  // Scale: 0 deliveries = 0, 10+ approved = 100
  const completionRaw = raw.totalDeliveries === 0
    ? 0
    : (raw.approvedDeliveries / Math.max(raw.totalDeliveries, 1)) * 100;
  // Bonus for volume: having ≥5 closed tasks gives full marks on volume factor
  const volumeFactor = clamp((raw.closedTasks / 5) * 100);
  const completion = clamp(completionRaw * 0.6 + volumeFactor * 0.4);

  // --- quality (30%) ---
  // Directly from pass rate, but only meaningful with ≥1 verified delivery
  const quality = raw.verifiedDeliveries === 0 ? 50 : clamp(raw.passRate * 100);

  // --- speed (20%) ---
  // Benchmark: ≤12h = 100, 48h = 50, ≥96h = 0 (linear interpolation)
  let speed = 50; // default when no data
  if (raw.avgDeliveryHours !== null) {
    if (raw.avgDeliveryHours <= 12) {
      speed = 100;
    } else if (raw.avgDeliveryHours >= 96) {
      speed = 0;
    } else {
      speed = clamp(100 - ((raw.avgDeliveryHours - 12) / (96 - 12)) * 100);
    }
  }

  // --- consistency (15%) ---
  // 0 rework = 100, 1 = 67, 2 = 33, ≥3 = 0
  const consistency = clamp(100 - (raw.avgReworkCount / 3) * 100);

  const breakdown: ReputationScoreBreakdown = {
    completion: Math.round(completion),
    quality: Math.round(quality),
    speed: Math.round(speed),
    consistency: Math.round(consistency),
  };

  const total = Math.round(
    completion * 0.35 + quality * 0.30 + speed * 0.20 + consistency * 0.15
  );

  return {
    total: clamp(total),
    tier: getTier(clamp(total)),
    breakdown,
  };
}

export async function getAgentReputationSummary(
  agentUserId: string
): Promise<AgentReputationSummary> {
  const db = getAdminClient();

  const { data: deliveryRows, error: deliveryError } = await db
    .from(TABLES.TASK_DELIVERIES)
    .select("id, task_id, application_id, created_at, evidence_json, mart_tasks(title)")
    .eq("agent_user_id", agentUserId)
    .order("created_at", { ascending: false });

  if (deliveryError) {
    throw new Error(deliveryError.message);
  }

  const deliveries = deliveryRows || [];
  const deliveryIds = deliveries.map((row: any) => row.id);
  const applicationIds = deliveries
    .map((row: any) => row.application_id as string | null)
    .filter((id: string | null): id is string => Boolean(id));

  let verifications: TaskVerification[] = [];
  if (deliveryIds.length > 0) {
    verifications = await listVerificationsByDeliveryIds(deliveryIds);
  }

  const latestVerificationByDeliveryId = new Map<string, TaskVerification>();
  for (const verification of verifications) {
    if (!latestVerificationByDeliveryId.has(verification.delivery_id)) {
      latestVerificationByDeliveryId.set(verification.delivery_id, verification);
    }
  }

  const verifiedDeliveries = latestVerificationByDeliveryId.size;
  const approvedDeliveries = Array.from(latestVerificationByDeliveryId.values()).filter(
    (item) => item.result === "APPROVED"
  ).length;
  const rejectedDeliveries = Array.from(latestVerificationByDeliveryId.values()).filter(
    (item) => item.result === "REJECTED"
  ).length;

  const passRate = verifiedDeliveries > 0 ? approvedDeliveries / verifiedDeliveries : 0;

  const rejectedCountByTask = new Map<string, number>();
  const taskIdsWithVerification = new Set<string>();

  for (const row of deliveries) {
    const verification = latestVerificationByDeliveryId.get(row.id);
    if (!verification) continue;

    taskIdsWithVerification.add(row.task_id);
    if (verification.result === "REJECTED") {
      rejectedCountByTask.set(row.task_id, (rejectedCountByTask.get(row.task_id) || 0) + 1);
    }
  }

  const avgReworkCount =
    taskIdsWithVerification.size > 0
      ? Array.from(rejectedCountByTask.values()).reduce((sum, value) => sum + value, 0) /
        taskIdsWithVerification.size
      : 0;

  let avgDeliveryHours: number | null = null;
  if (applicationIds.length > 0) {
    const { data: appRows, error: appError } = await db
      .from(TABLES.TASK_APPLICATIONS)
      .select("id, updated_at, status")
      .in("id", applicationIds);

    if (appError) {
      throw new Error(appError.message);
    }

    const appById = new Map<string, { updated_at: string; status: string }>();
    for (const row of appRows || []) {
      appById.set(row.id, { updated_at: row.updated_at, status: row.status });
    }

    const durations: number[] = [];
    for (const delivery of deliveries) {
      if (!delivery.application_id) continue;
      const app = appById.get(delivery.application_id);
      if (!app || app.status !== "ACCEPTED") continue;

      const acceptedAt = new Date(app.updated_at).getTime();
      const deliveredAt = new Date(delivery.created_at).getTime();
      if (Number.isNaN(acceptedAt) || Number.isNaN(deliveredAt) || deliveredAt <= acceptedAt) {
        continue;
      }

      durations.push((deliveredAt - acceptedAt) / (1000 * 60 * 60));
    }

    if (durations.length > 0) {
      avgDeliveryHours = durations.reduce((sum, value) => sum + value, 0) / durations.length;
    }
  }

  const closedTaskIds = new Set<string>();
  for (const delivery of deliveries) {
    const verification = latestVerificationByDeliveryId.get(delivery.id);
    if (verification?.result === "APPROVED") {
      closedTaskIds.add(delivery.task_id);
    }
  }

  const recentRecords: AgentReputationRecentRecord[] = deliveries.slice(0, 20).map((row: any) => {
    const verification = latestVerificationByDeliveryId.get(row.id);
    const evidence = (row.evidence_json || {}) as DeliveryEvidence;

    return {
      delivery_id: row.id,
      task_id: row.task_id,
      task_title: row.mart_tasks?.title || null,
      pr_url: evidence.pr_url || null,
      submitted_at: row.created_at,
      verification_result: verification?.result || null,
      reject_reason: verification?.reject_reason || null,
      change_requests: verification?.change_requests || [],
    };
  });

  const score = computeReputationScore({
    totalDeliveries: deliveries.length,
    approvedDeliveries: approvedDeliveries,
    verifiedDeliveries: verifiedDeliveries,
    passRate: passRate,
    avgReworkCount: avgReworkCount,
    avgDeliveryHours: avgDeliveryHours,
    closedTasks: closedTaskIds.size,
  });

  return {
    agent_user_id: agentUserId,
    total_deliveries: deliveries.length,
    verified_deliveries: verifiedDeliveries,
    approved_deliveries: approvedDeliveries,
    rejected_deliveries: rejectedDeliveries,
    pass_rate: passRate,
    avg_rework_count: avgReworkCount,
    avg_delivery_hours: avgDeliveryHours,
    closed_tasks: closedTaskIds.size,
    score,
    recent_records: recentRecords,
  };
}

// ─── Auto System Message + Notification Helper ──────────────────

async function emitStatusChange(params: {
  taskId: string;
  actorId: string;
  message: string;
  notifyUserId?: string;
  notificationType?: NotificationType;
  notificationTitle?: string;
  notificationBody?: string;
  meta?: Record<string, unknown>;
}) {
  const db = getAdminClient();

  // Insert SYSTEM message into task_messages
  await db.from(TABLES.TASK_MESSAGES).insert({
    task_id: params.taskId,
    sender_id: params.actorId,
    type: "STATUS_CHANGE" satisfies MessageType,
    content: params.message,
  });

  // Create notification for the other party
  if (params.notifyUserId && params.notificationType) {
    await db.from(TABLES.NOTIFICATIONS).insert({
      user_id: params.notifyUserId,
      type: params.notificationType,
      title: params.notificationTitle || params.message,
      body: params.notificationBody || params.message,
      meta: { task_id: params.taskId, ...params.meta },
    });
  }
}

// ─── Cancel Task ─────────────────────────────────────────────────

export async function cancelTask(taskId: string, buyerUserId: string): Promise<MartTask> {
  const db = getAdminClient();

  const { data: task, error: fetchError } = await db
    .from(TABLES.MART_TASKS)
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!task) throw new Error("Task not found");
  if (task.buyer_user_id !== buyerUserId) throw new Error("Only the task owner can cancel");

  const cancellable: MartTaskStatus[] = ["DRAFT", "OPEN"];
  if (!cancellable.includes(task.status)) {
    throw new Error(`Cannot cancel task in status ${task.status}`);
  }

  const { data: updated, error: updateError } = await db
    .from(TABLES.MART_TASKS)
    .update({ status: "CANCELLED" satisfies MartTaskStatus })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to cancel task");
  }

  await addAuditLog({
    actorUserId: buyerUserId,
    action: "TASK_CANCEL",
    entityType: "task",
    entityId: taskId,
    meta: { previousStatus: task.status },
  });

  return mapTask(updated);
}

// ─── Task Messages ───────────────────────────────────────────────

export async function sendTaskMessage(input: SendMessageInput): Promise<TaskMessage> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.TASK_MESSAGES)
    .insert({
      task_id: input.taskId,
      sender_id: input.senderId,
      type: input.type || "TEXT",
      content: input.content,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to send message");
  }

  return data as TaskMessage;
}

export async function getTaskMessages(
  taskId: string,
  opts?: { limit?: number; before?: string }
): Promise<TaskMessage[]> {
  const db = getAdminClient();
  const limit = opts?.limit || 50;

  let query = db
    .from(TABLES.TASK_MESSAGES)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.before) {
    query = query.lt("created_at", opts.before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as TaskMessage[]) || [];
}

// ─── Notifications ───────────────────────────────────────────────

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.NOTIFICATIONS)
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      meta: input.meta || {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create notification");
  }

  return data as Notification;
}

export async function getNotifications(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  const db = getAdminClient();
  const limit = opts?.limit || 30;

  let query = db
    .from(TABLES.NOTIFICATIONS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as Notification[]) || [];
}

export async function markNotificationsRead(
  userId: string,
  notificationIds: string[]
): Promise<void> {
  const db = getAdminClient();

  const { error } = await db
    .from(TABLES.NOTIFICATIONS)
    .update({ read: true })
    .eq("user_id", userId)
    .in("id", notificationIds);

  if (error) {
    throw new Error(error.message);
  }
}

// ─── GitHub Webhook Handlers ─────────────────────────────────────

/** Map GitHub issue labels to MartTaskType */
function labelToTaskType(labels: Array<{ name: string }>): MartTaskType {
  const names = labels.map((l) => l.name.toLowerCase());
  if (names.some((n) => n.includes("test"))) return "TEST";
  if (names.some((n) => n.includes("doc"))) return "DOC";
  if (names.some((n) => n.includes("data"))) return "DATA";
  if (names.some((n) => n.includes("design"))) return "DESIGN";
  return "CODE";
}

/** Extract tech stack hints from issue labels (skip non-tech labels) */
function labelsToTechStack(labels: Array<{ name: string }>): string[] {
  const skip = new Set(["bug", "enhancement", "feature", "help wanted", "good first issue", "test", "doc", "data", "design"]);
  return labels
    .map((l) => l.name)
    .filter((n) => !skip.has(n.toLowerCase()));
}

/**
 * Create a DRAFT task from a GitHub issue webhook event.
 * The task is linked to the repo and issue via github_repo / github_issue_id.
 * A "system" buyer_user_id is used since the webhook has no logged-in user.
 */
export async function createTaskFromGitHubIssue(
  payload: GitHubWebhookIssuePayload
): Promise<MartTask> {
  const { issue, repository } = payload;

  const task = await createTask({
    buyerUserId: "github-webhook",
    title: issue.title,
    description: issue.body || `GitHub Issue #${issue.number} from ${repository.full_name}`,
    type: labelToTaskType(issue.labels),
    techStack: labelsToTechStack(issue.labels),
    source: "GITHUB",
    githubRepo: repository.full_name,
    githubIssueId: issue.number,
    asDraft: true,
  });

  return task;
}

/**
 * Handle a merged PR event: find the linked task by github_repo + github_pr_id,
 * insert a system message, and notify the buyer.
 */
export async function handlePRMerge(
  payload: GitHubWebhookPRPayload
): Promise<void> {
  const db = getAdminClient();
  const { pull_request: pr, repository } = payload;

  // Try to find a task linked to this PR
  const { data: task } = await db
    .from(TABLES.MART_TASKS)
    .select("id, buyer_user_id, status")
    .eq("github_repo", repository.full_name)
    .eq("github_pr_id", pr.number)
    .maybeSingle();

  if (!task) {
    // Also try matching by branch naming convention: agent/<task_id>
    const branchMatch = pr.head.ref.match(/^agent\/(.+)$/);
    if (!branchMatch) return;

    const { data: taskByBranch } = await db
      .from(TABLES.MART_TASKS)
      .select("id, buyer_user_id, status")
      .eq("id", branchMatch[1])
      .maybeSingle();

    if (!taskByBranch) return;

    await emitStatusChange({
      taskId: taskByBranch.id,
      actorId: "github-webhook",
      message: `PR #${pr.number} merged in ${repository.full_name} (${pr.merge_commit_sha?.slice(0, 7) || "N/A"})`,
      notifyUserId: taskByBranch.buyer_user_id,
      notificationType: "DELIVERY_SUBMITTED",
      notificationTitle: "PR merged",
      notificationBody: `PR #${pr.number} has been merged in ${repository.full_name}. Please review the delivery.`,
      meta: { pr_url: pr.html_url, pr_number: pr.number },
    });
    return;
  }

  await emitStatusChange({
    taskId: task.id,
    actorId: "github-webhook",
    message: `PR #${pr.number} merged in ${repository.full_name} (${pr.merge_commit_sha?.slice(0, 7) || "N/A"})`,
    notifyUserId: task.buyer_user_id,
    notificationType: "DELIVERY_SUBMITTED",
    notificationTitle: "PR merged",
    notificationBody: `PR #${pr.number} has been merged in ${repository.full_name}. Please review the delivery.`,
    meta: { pr_url: pr.html_url, pr_number: pr.number },
  });
}

// ─── Cron: Expire NO_OFFER Tasks ─────────────────────────────────

/**
 * Find OPEN tasks past their deadline with zero applications and mark them NO_OFFER.
 * Returns the number of tasks expired.
 */
export async function expireNoOfferTasks(): Promise<number> {
  const db = getAdminClient();

  const { data: tasks, error } = await db
    .from(TABLES.MART_TASKS)
    .select("id, buyer_user_id, deadline")
    .eq("status", "OPEN")
    .eq("application_count", 0)
    .not("deadline", "is", null)
    .lt("deadline", new Date().toISOString());

  if (error) {
    throw new Error(error.message);
  }

  if (!tasks || tasks.length === 0) return 0;

  for (const task of tasks) {
    await db
      .from(TABLES.MART_TASKS)
      .update({ status: "NO_OFFER" satisfies MartTaskStatus })
      .eq("id", task.id);

    await emitStatusChange({
      taskId: task.id,
      actorId: "system",
      message: "Task expired with no applications — marked as NO_OFFER.",
      notifyUserId: task.buyer_user_id,
      notificationType: "TASK_CANCELLED",
      notificationTitle: "任务已流标",
      notificationBody: "你的任务已过截止日期且无人申请，已自动标记为流标。",
    });

    await addAuditLog({
      actorUserId: "system",
      action: "TASK_EXPIRE_NO_OFFER",
      entityType: "task",
      entityId: task.id,
    });
  }

  return tasks.length;
}

/* ─── Buyer Stats ─── */

export interface BuyerStats {
  published_tasks: number;
  closed_tasks: number;
}

export async function getBuyerStats(userId: string): Promise<BuyerStats> {
  const db = getAdminClient();

  const { count: published, error: e1 } = await db
    .from(TABLES.MART_TASKS)
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", userId);

  if (e1) throw new Error(e1.message);

  const { count: closed, error: e2 } = await db
    .from(TABLES.MART_TASKS)
    .select("id", { count: "exact", head: true })
    .eq("buyer_user_id", userId)
    .eq("status", "CLOSED");

  if (e2) throw new Error(e2.message);

  return {
    published_tasks: published ?? 0,
    closed_tasks: closed ?? 0,
  };
}
