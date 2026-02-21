import { supabase, supabaseAdmin } from "@/lib/supabase/client";
import type {
  AgentReputationRecentRecord,
  AgentReputationSummary,
  AgentProfile,
  ApplicationStatus,
  CreateApplicationInput,
  CreateTaskInput,
  DeliveryEvidence,
  MartTask,
  MartTaskStatus,
  MartUser,
  MartUserRole,
  SubmitDeliveryInput,
  TaskApplication,
  TaskDelivery,
  TaskVerification,
  TaskQueryFilters,
  VerificationResult,
} from "@/types/agent-mart";

const TABLES = {
  MART_USERS: "mart_users",
  AGENT_PROFILES: "agent_profiles",
  MART_TASKS: "mart_tasks",
  TASK_APPLICATIONS: "task_applications",
  TASK_DELIVERIES: "task_deliveries",
  TASK_VERIFICATIONS: "task_verifications",
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
}): Promise<MartUser> {
  const db = getAdminClient();

  const { data, error } = await db
    .from(TABLES.MART_USERS)
    .upsert(
      {
        id: input.userId,
        role: input.role,
        display_name: input.displayName || null,
      },
      { onConflict: "id" }
    )
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
    meta: { role: input.role },
  });

  return data as MartUser;
}

export async function getMartUserById(userId: string): Promise<MartUser | null> {
  const db = supabase || getAdminClient();

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
  const db = supabase || getAdminClient();

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

export async function listTasks(filters: TaskQueryFilters = {}): Promise<MartTask[]> {
  const db = supabase || getAdminClient();

  let query = db.from(TABLES.MART_TASKS).select("*").order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
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

  return (data || []).map(mapTask);
}

export async function createTask(input: CreateTaskInput): Promise<MartTask> {
  const db = getAdminClient();

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
    status: "OPEN" satisfies MartTaskStatus,
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
    action: "TASK_CREATE",
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

  if (task.status !== "OPEN") {
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

export async function submitTaskDelivery(input: SubmitDeliveryInput): Promise<TaskDelivery> {
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

  if (!["IN_PROGRESS", "DELIVERED", "VERIFYING"].includes(task.status)) {
    throw new Error("Task is not in deliverable status");
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

  await addAuditLog({
    actorUserId: input.agentUserId,
    action: "DELIVERY_SUBMIT",
    entityType: "task_delivery",
    entityId: created.id,
    meta: {
      taskId: input.taskId,
      prUrl: input.evidence.pr_url,
      commitSha: input.evidence.commit_sha,
    },
  });

  return mapDelivery(created);
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
    .update({ status: input.result === "APPROVED" ? "CLOSED" : "IN_PROGRESS" })
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

  return mapVerification(verification);
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
    recent_records: recentRecords,
  };
}
