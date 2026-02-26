export type MartUserRole = "buyer" | "agent";

export type MessageType = "TEXT" | "CODE" | "SYSTEM" | "STATUS_CHANGE";

export type NotificationType =
  | "TASK_APPLICATION"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "DELIVERY_SUBMITTED"
  | "DELIVERY_RESUBMITTED"
  | "DELIVERY_APPROVED"
  | "DELIVERY_REJECTED"
  | "TASK_CANCELLED"
  | "NEW_MESSAGE";

export type MartTaskStatus =
  | "DRAFT"
  | "OPEN"
  | "BIDDING"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "VERIFYING"
  | "REVISING"
  | "CLOSED"
  | "CANCELLED"
  | "NO_OFFER"
  | "DISPUTED";

export type MartTaskType =
  | "CODE"
  | "TEST"
  | "DOC"
  | "DATA"
  | "DESIGN"
  | "OTHER";

export type MartTaskSource = "MANUAL" | "GITHUB" | "API";

export type ApplicationStatus =
  | "PENDING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type VerificationResult = "APPROVED" | "REJECTED";

export interface MartUser {
  id: string;
  roles: MartUserRole[];
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  github_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface AgentProfile {
  user_id: string;
  headline: string | null;
  skills: string[];
  tools: string[];
  bio: string | null;
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

export interface MartTask {
  id: string;
  buyer_user_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  eta_days: number | null;
  tech_stack: string[];
  acceptance_json: {
    ci_required?: boolean;
    checklist?: string[];
    notes?: string;
  } | null;
  type: MartTaskType;
  deadline: string | null;
  source: MartTaskSource;
  github_repo: string | null;
  github_issue_id: number | null;
  github_pr_id: number | null;
  application_count: number;
  status: MartTaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskApplication {
  id: string;
  task_id: string;
  agent_user_id: string;
  bid_amount: number;
  eta_days: number;
  plan: string;
  assumptions: string | null;
  confidence: number | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface DeliveryEvidence {
  pr_url: string;
  repo_full_name: string;
  pr_number: number;
  commit_sha: string;
  self_check: string;
  ci_evidence?: {
    ci_url?: string;
  };
  logs?: {
    log_url?: string;
  };
  artifacts?: Array<{
    name?: string;
    hash?: string;
    url?: string;
  }>;
}

export interface TaskDelivery {
  id: string;
  task_id: string;
  application_id: string | null;
  agent_user_id: string;
  evidence_json: DeliveryEvidence;
  created_at: string;
}

export interface TaskVerification {
  id: string;
  task_id: string;
  delivery_id: string;
  buyer_user_id: string;
  result: VerificationResult;
  comment: string | null;
  reject_reason: string | null;
  change_requests: string[];
  created_at: string;
}

export interface AgentReputationRecentRecord {
  delivery_id: string;
  task_id: string;
  task_title: string | null;
  pr_url: string | null;
  submitted_at: string;
  verification_result: VerificationResult | null;
  reject_reason: string | null;
  change_requests: string[];
}

export type ReputationTier = "ROOKIE" | "SKILLED" | "EXPERT" | "ELITE";

export interface ReputationScoreBreakdown {
  completion: number;   // 0~100, weight 35%
  quality: number;      // 0~100, weight 30%
  speed: number;        // 0~100, weight 20%
  consistency: number;  // 0~100, weight 15%
}

export interface ReputationScore {
  total: number;        // 0~100 weighted score
  tier: ReputationTier;
  breakdown: ReputationScoreBreakdown;
}

export interface AgentReputationSummary {
  agent_user_id: string;
  total_deliveries: number;
  verified_deliveries: number;
  approved_deliveries: number;
  rejected_deliveries: number;
  pass_rate: number;
  avg_rework_count: number;
  avg_delivery_hours: number | null;
  closed_tasks: number;
  score: ReputationScore;
  recent_records: AgentReputationRecentRecord[];
}

export interface CreateTaskInput {
  buyerUserId: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  etaDays?: number;
  techStack?: string[];
  acceptance?: {
    ciRequired?: boolean;
    checklist?: string[];
    notes?: string;
  };
  type?: MartTaskType;
  deadline?: string;
  source?: MartTaskSource;
  githubRepo?: string;
  githubIssueId?: number;
  asDraft?: boolean;
}

export interface CreateApplicationInput {
  taskId: string;
  agentUserId: string;
  bidAmount: number;
  etaDays: number;
  plan: string;
  assumptions?: string;
  confidence?: number;
}

export interface SubmitDeliveryInput {
  taskId: string;
  agentUserId: string;
  evidence: DeliveryEvidence;
}

export interface TaskQueryFilters {
  status?: MartTaskStatus;
  type?: MartTaskType;
  tech?: string;
  minBudget?: number;
  maxBudget?: number;
  q?: string;
  limit?: number;
}

export interface UpdateTaskInput {
  taskId: string;
  buyerUserId: string;
  title?: string;
  description?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  etaDays?: number | null;
  techStack?: string[];
  acceptance?: {
    ciRequired?: boolean;
    checklist?: string[];
    notes?: string;
  } | null;
  type?: MartTaskType;
  deadline?: string | null;
  githubRepo?: string | null;
}

/* ── P2P Message Types ── */

export type P2PConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface P2PChatMessage {
  t: "msg";
  topic: string;
  data: string;
  id: string;
  ts: number;
  sender: string;
}

export interface SendMessageInput {
  taskId: string;
  senderId: string;
  type?: MessageType;
  content: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

/* ── GitHub Webhook Payloads ── */

export interface GitHubWebhookIssuePayload {
  action: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    labels: Array<{ name: string }>;
    user: { login: string };
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

export interface GitHubWebhookPRPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    merged: boolean;
    merge_commit_sha: string | null;
    html_url: string;
    head: { ref: string };
    user: { login: string };
  };
  repository: {
    full_name: string;
  };
}
