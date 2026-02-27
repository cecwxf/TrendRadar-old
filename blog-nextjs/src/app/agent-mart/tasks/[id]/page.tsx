"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import { AppStatusBadge, StatusBadge } from "@/components/agent-mart/StatusBadge";
import { useTaskChat } from "@/hooks/agent-mart/useTaskChat";
import type {
  MartTask,
  MartTaskType,
  TaskApplication,
  TaskDelivery,
  TaskVerification,
} from "@/types/agent-mart";

/* ── helpers ── */

function formatBudget(task: MartTask): string {
  if (task.budget_min === null && task.budget_max === null) return "未设置";
  if (task.budget_min !== null && task.budget_max !== null)
    return `${task.currency} ${task.budget_min} – ${task.budget_max}`;
  if (task.budget_min !== null) return `≥ ${task.currency} ${task.budget_min}`;
  return `≤ ${task.currency} ${task.budget_max}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── apply draft ── */

interface ApplyDraft {
  bidAmount: string;
  etaDays: string;
  plan: string;
  assumptions: string;
  confidence: string;
}

const defaultDraft: ApplyDraft = {
  bidAmount: "",
  etaDays: "",
  plan: "",
  assumptions: "",
  confidence: "",
};

const TASK_TYPE_LABELS: Record<MartTaskType, string> = {
  CODE: "开发",
  TEST: "测试",
  DOC: "文档",
  DATA: "数据",
  DESIGN: "设计",
  OTHER: "其他",
};

/* ── component ── */

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const auth = useMartAuthContext();

  const [task, setTask] = useState<MartTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // apply form
  const [showApply, setShowApply] = useState(false);
  const [draft, setDraft] = useState<ApplyDraft>(defaultDraft);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // messages
  const [msgText, setMsgText] = useState("");

  // applications (buyer only)
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // deliveries (buyer review + agent submit)
  const [deliveries, setDeliveries] = useState<Array<{ delivery: TaskDelivery; verification: TaskVerification | null }>>([]);
  const [delsLoading, setDelsLoading] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryDraft, setDeliveryDraft] = useState({
    pr_url: "", repo_full_name: "", pr_number: "", commit_sha: "", self_check: "", ci_url: "",
  });
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectForm, setRejectForm] = useState<{ id: string; reason: string; changes: string; comment: string } | null>(null);
  const [approveComment, setApproveComment] = useState("");

  // buyer action loading
  const [buyerActioning, setBuyerActioning] = useState(false);

  const isBuyer = task && auth.userId === task.buyer_user_id;

  /* ── fetch task ── */

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "加载任务失败");
        return;
      }
      setTask(json.data as MartTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTask(); }, [loadTask]);

  /* ── task chat ── */

  const chat = useTaskChat({
    taskId: id,
    userId: auth.userId || "",
    authHeaders: auth.authHeaders,
    enabled: auth.isAuthenticated,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  /* ── fetch applications (buyer) ── */

  const loadApplications = useCallback(async () => {
    if (!auth.isAuthenticated || !isBuyer) return;
    setAppsLoading(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/applications`, {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setApplications(json.data || []);
    } catch { /* ignore */ }
    finally { setAppsLoading(false); }
  }, [id, auth.isAuthenticated, auth.authHeaders, isBuyer]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  /* ── fetch deliveries ── */

  const loadDeliveries = useCallback(async () => {
    if (!auth.isAuthenticated || !task) return;
    const canSee = isBuyer || ["IN_PROGRESS", "DELIVERED", "VERIFYING", "REVISING", "CLOSED"].includes(task.status);
    if (!canSee) return;
    setDelsLoading(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/deliveries`, {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setDeliveries(json.data || []);
    } catch { /* ignore */ }
    finally { setDelsLoading(false); }
  }, [id, auth.isAuthenticated, auth.authHeaders, isBuyer, task]);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  /* ── submit delivery (agent) ── */

  const submitDelivery = async (e: FormEvent) => {
    e.preventDefault();
    if (deliverySubmitting || !auth.isAuthenticated) return;
    setDeliverySubmitting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/agent-mart/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({
          taskId: id,
          evidence: {
            pr_url: deliveryDraft.pr_url,
            repo_full_name: deliveryDraft.repo_full_name,
            pr_number: Number(deliveryDraft.pr_number),
            commit_sha: deliveryDraft.commit_sha,
            self_check: deliveryDraft.self_check,
            ...(deliveryDraft.ci_url ? { ci_evidence: { ci_url: deliveryDraft.ci_url } } : {}),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || "提交交付失败");
      } else {
        setNotice("交付已提交，等待买家验收");
        setShowDeliveryForm(false);
        setDeliveryDraft({ pr_url: "", repo_full_name: "", pr_number: "", commit_sha: "", self_check: "", ci_url: "" });
        loadTask();
        loadDeliveries();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setDeliverySubmitting(false);
    }
  };

  /* ── approve delivery (buyer) ── */

  const approveDelivery = async (deliveryId: string) => {
    if (reviewingId) return;
    setReviewingId(deliveryId);
    setNotice(null);
    try {
      const res = await fetch(`/api/agent-mart/deliveries/${deliveryId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({ comment: approveComment || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || "审批失败");
      } else {
        setNotice("交付已通过");
        setApproveComment("");
        loadTask();
        loadDeliveries();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setReviewingId(null);
    }
  };

  /* ── reject delivery (buyer) ── */

  const rejectDelivery = async () => {
    if (!rejectForm || reviewingId) return;
    setReviewingId(rejectForm.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/agent-mart/deliveries/${rejectForm.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({
          rejectReason: rejectForm.reason,
          changeRequests: rejectForm.changes || undefined,
          comment: rejectForm.comment || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || "驳回失败");
      } else {
        setNotice("交付已驳回，等待 Agent 修改后重新提交");
        setRejectForm(null);
        loadTask();
        loadDeliveries();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setReviewingId(null);
    }
  };

  /* ── send message ── */

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !auth.isAuthenticated) return;
    chat.sendMessage(msgText.trim());
    setMsgText("");
  };

  /* ── submit application (agent) ── */

  const submitApply = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !auth.isAuthenticated) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({
          bidAmount: Number(draft.bidAmount),
          etaDays: Number(draft.etaDays),
          plan: draft.plan,
          assumptions: draft.assumptions || undefined,
          confidence: draft.confidence ? Number(draft.confidence) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || "申请失败");
      } else {
        setNotice("申请已提交");
        setShowApply(false);
        setDraft(defaultDraft);
        loadTask();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── accept / reject application (buyer) ── */

  const handleAppAction = async (appId: string, action: "accept" | "reject") => {
    if (actioningId) return;
    setActioningId(appId);
    setNotice(null);
    try {
      const res = await fetch(`/api/agent-mart/applications/${appId}/${action}`, {
        method: "POST",
        headers: { ...auth.authHeaders },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || `${action} 失败`);
      } else {
        setNotice(action === "accept" ? "已接受申请" : "已拒绝申请");
        loadApplications();
        loadTask();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setActioningId(null);
    }
  };

  /* ── buyer actions: publish draft / cancel task ── */

  const buyerAction = async (action: "publish" | "cancel") => {
    if (buyerActioning || !auth.isAuthenticated) return;
    if (action === "cancel" && !confirm("确定要取消此任务吗？")) return;
    setBuyerActioning(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/${action}`, {
        method: "POST",
        headers: { ...auth.authHeaders },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || `${action} 失败`);
      } else {
        setNotice(action === "publish" ? "任务已发布" : "任务已取消");
        loadTask();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBuyerActioning(false);
    }
  };

  /* ── render: loading / error ── */

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (error || !task) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "任务不存在"}</p>
        <Link href="/agent-mart" className="text-sm text-primary hover:underline">← 返回任务广场</Link>
      </main>
    );
  }

  const canApply = auth.isAuthenticated && !isBuyer
    && ["OPEN", "BIDDING"].includes(task.status);
  const canCancel = isBuyer && ["DRAFT", "OPEN"].includes(task.status);
  const canPublish = isBuyer && task.status === "DRAFT";
  const deadlineCountdown = (() => {
    if (!task.deadline) return "未设置截止时间";
    const diff = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86_400_000);
    if (diff < 0) return "已截止";
    if (diff === 0) return "今天截止";
    return `${diff} 天后截止`;
  })();
  const inputCls =
    "w-full rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.10),transparent_35%)]">
      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Link href="/agent-mart" className="inline-flex rounded-lg px-1 text-sm font-medium text-primary hover:underline">
          ← 返回任务广场
        </Link>

        <header className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {TASK_TYPE_LABELS[task.type] || task.type}
            </span>
            {task.deadline && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                截止 {formatDate(task.deadline)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{task.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">预算: {formatBudget(task)}</span>
            {task.eta_days && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">预计 {task.eta_days} 天</span>
            )}
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              申请数: {task.application_count}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              发布于 {formatDate(task.created_at)}
            </span>
          </div>
          {task.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tech_stack.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary/80"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        {notice && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            {notice}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="order-2 space-y-6 lg:order-1">
            <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">任务描述</h2>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
              </div>
              {task.acceptance_json && (
                <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
                  <h3 className="text-sm font-semibold">验收标准</h3>
                  {task.acceptance_json.ci_required && (
                    <p className="text-xs text-muted-foreground">✓ 需要 CI 通过</p>
                  )}
                  {Array.isArray(task.acceptance_json.checklist) && task.acceptance_json.checklist.length > 0 && (
                    <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                      {task.acceptance_json.checklist.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {task.acceptance_json.notes && (
                    <p className="text-sm text-muted-foreground">{task.acceptance_json.notes}</p>
                  )}
                </div>
              )}
            </section>

            {canApply && (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                {!showApply ? (
                  <button
                    type="button"
                    onClick={() => setShowApply(true)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    填写竞标申请
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">提交申请</h2>
                    <form className="grid gap-3" onSubmit={submitApply}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">报价 *</span>
                          <input
                            type="number" min="0" required
                            value={draft.bidAmount}
                            onChange={(e) => setDraft({ ...draft, bidAmount: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">交付天数 *</span>
                          <input
                            type="number" min="1" required
                            value={draft.etaDays}
                            onChange={(e) => setDraft({ ...draft, etaDays: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                      </div>
                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">实施方案 *</span>
                        <textarea
                          rows={4} required
                          value={draft.plan}
                          onChange={(e) => setDraft({ ...draft, plan: e.target.value })}
                          className={inputCls}
                        />
                      </label>
                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">假设与前提（可选）</span>
                        <textarea
                          rows={2}
                          value={draft.assumptions}
                          onChange={(e) => setDraft({ ...draft, assumptions: e.target.value })}
                          className={inputCls}
                        />
                      </label>
                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">信心值 0-1（可选）</span>
                        <input
                          type="number" min="0" max="1" step="0.01"
                          value={draft.confidence}
                          onChange={(e) => setDraft({ ...draft, confidence: e.target.value })}
                          className={inputCls}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="submit" disabled={submitting}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {submitting ? "提交中..." : "提交申请"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowApply(false)}
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </section>
            )}

            {isBuyer && (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-3">
                <h2 className="text-lg font-semibold">申请列表 ({applications.length})</h2>
                {appsLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
                {!appsLoading && applications.length === 0 && (
                  <p className="text-sm text-muted-foreground">暂无申请</p>
                )}
                <div className="space-y-3">
                  {applications.map((app) => (
                    <article key={app.id} className="space-y-2 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{app.agent_user_id.slice(0, 8)}...</span>
                          <AppStatusBadge status={app.status} />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>报价: {app.bid_amount}</span>
                        <span>交付: {app.eta_days} 天</span>
                        {app.confidence !== null && <span>信心: {app.confidence}</span>}
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{app.plan}</p>
                      {app.assumptions && (
                        <p className="text-xs text-muted-foreground">假设: {app.assumptions}</p>
                      )}
                      {app.status === "PENDING" && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAppAction(app.id, "accept")}
                            disabled={actioningId === app.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {actioningId === app.id ? "处理中..." : "接受"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAppAction(app.id, "reject")}
                            disabled={actioningId === app.id}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-800 dark:text-red-400 disabled:opacity-60"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── Agent: submit delivery ── */}
            {auth.isAuthenticated && !isBuyer && ["IN_PROGRESS", "REVISING"].includes(task.status) && (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-3">
                {!showDeliveryForm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeliveryForm(true)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {task.status === "REVISING" ? "重新提交交付" : "提交交付"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">提交交付</h2>
                    <form className="grid gap-3" onSubmit={submitDelivery}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">PR 链接 *</span>
                          <input
                            type="url" required placeholder="https://github.com/..."
                            value={deliveryDraft.pr_url}
                            onChange={(e) => setDeliveryDraft({ ...deliveryDraft, pr_url: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">仓库全名 *</span>
                          <input
                            required placeholder="owner/repo"
                            value={deliveryDraft.repo_full_name}
                            onChange={(e) => setDeliveryDraft({ ...deliveryDraft, repo_full_name: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">PR 编号 *</span>
                          <input
                            type="number" min="1" required
                            value={deliveryDraft.pr_number}
                            onChange={(e) => setDeliveryDraft({ ...deliveryDraft, pr_number: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">Commit SHA *</span>
                          <input
                            required placeholder="abc1234..."
                            value={deliveryDraft.commit_sha}
                            onChange={(e) => setDeliveryDraft({ ...deliveryDraft, commit_sha: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                      </div>
                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">自检说明 *</span>
                        <textarea
                          rows={3} required placeholder="描述你完成了哪些验收标准..."
                          value={deliveryDraft.self_check}
                          onChange={(e) => setDeliveryDraft({ ...deliveryDraft, self_check: e.target.value })}
                          className={inputCls}
                        />
                      </label>
                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">CI 链接（可选）</span>
                        <input
                          type="url" placeholder="https://github.com/.../actions/runs/..."
                          value={deliveryDraft.ci_url}
                          onChange={(e) => setDeliveryDraft({ ...deliveryDraft, ci_url: e.target.value })}
                          className={inputCls}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="submit" disabled={deliverySubmitting}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {deliverySubmitting ? "提交中..." : "提交交付"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeliveryForm(false)}
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </section>
            )}

            {/* ── Delivery list & buyer review ── */}
            {auth.isAuthenticated && deliveries.length > 0 && (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-3">
                <h2 className="text-lg font-semibold">交付记录 ({deliveries.length})</h2>
                {delsLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
                <div className="space-y-3">
                  {deliveries.map(({ delivery, verification }) => (
                    <article key={delivery.id} className="space-y-2 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">交付 #{delivery.id.slice(0, 8)}</span>
                        {verification ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            verification.result === "APPROVED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                          }`}>
                            {verification.result === "APPROVED" ? "已通过" : "已驳回"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            待验收
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">PR: </span>
                          <a href={delivery.evidence_json.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {delivery.evidence_json.repo_full_name}#{delivery.evidence_json.pr_number}
                          </a>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Commit: <code className="rounded bg-muted px-1 py-0.5">{delivery.evidence_json.commit_sha.slice(0, 10)}</code>
                        </p>
                        <p className="text-xs"><span className="text-muted-foreground">自检: </span>{delivery.evidence_json.self_check}</p>
                        {delivery.evidence_json.ci_evidence?.ci_url && (
                          <p className="text-xs">
                            <span className="text-muted-foreground">CI: </span>
                            <a href={delivery.evidence_json.ci_evidence.ci_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              查看 CI
                            </a>
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatDate(delivery.created_at)}</p>

                      {/* verification details */}
                      {verification?.comment && (
                        <p className="text-sm text-muted-foreground">评语: {verification.comment}</p>
                      )}
                      {verification?.reject_reason && (
                        <p className="text-sm text-red-500">驳回原因: {verification.reject_reason}</p>
                      )}
                      {verification?.change_requests && verification.change_requests.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">修改要求:</span>
                          <ul className="list-inside list-disc text-xs text-muted-foreground">
                            {verification.change_requests.map((cr, i) => <li key={i}>{cr}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* buyer actions: approve / reject (only for unverified deliveries) */}
                      {isBuyer && !verification && (
                        <div className="space-y-2 border-t border-border/70 pt-2">
                          {rejectForm?.id === delivery.id ? (
                            <div className="space-y-2">
                              <label className="text-sm space-y-1">
                                <span className="text-muted-foreground">驳回原因 *</span>
                                <textarea
                                  rows={2} required
                                  value={rejectForm.reason}
                                  onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                                  className={inputCls}
                                />
                              </label>
                              <label className="text-sm space-y-1">
                                <span className="text-muted-foreground">修改要求（每行一条，可选）</span>
                                <textarea
                                  rows={2}
                                  value={rejectForm.changes}
                                  onChange={(e) => setRejectForm({ ...rejectForm, changes: e.target.value })}
                                  className={inputCls}
                                />
                              </label>
                              <label className="text-sm space-y-1">
                                <span className="text-muted-foreground">评语（可选）</span>
                                <input
                                  value={rejectForm.comment}
                                  onChange={(e) => setRejectForm({ ...rejectForm, comment: e.target.value })}
                                  className={inputCls}
                                />
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={rejectDelivery}
                                  disabled={reviewingId === delivery.id || !rejectForm.reason.trim()}
                                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-800 dark:text-red-400 disabled:opacity-60"
                                >
                                  {reviewingId === delivery.id ? "处理中..." : "确认驳回"}
                                </button>
                                <button type="button" onClick={() => setRejectForm(null)} className="rounded-lg border px-3 py-1.5 text-xs">
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-end gap-2">
                              <label className="flex-1 text-sm space-y-1">
                                <span className="text-muted-foreground">评语（可选）</span>
                                <input
                                  value={approveComment}
                                  onChange={(e) => setApproveComment(e.target.value)}
                                  placeholder="写一句评语..."
                                  className={inputCls}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => approveDelivery(delivery.id)}
                                disabled={reviewingId === delivery.id}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {reviewingId === delivery.id ? "处理中..." : "通过"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectForm({ id: delivery.id, reason: "", changes: "", comment: "" })}
                                disabled={!!reviewingId}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-800 dark:text-red-400 disabled:opacity-60"
                              >
                                驳回
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {auth.isAuthenticated && (
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">消息</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {chat.loading ? "加载中..." : `${chat.messages.length} 条`}
                  </span>
                </div>
                {chat.error && <p className="text-xs text-red-500">{chat.error}</p>}

                {chat.messages.length === 0 && !chat.loading && (
                  <p className="text-sm text-muted-foreground">暂无消息</p>
                )}

                {chat.messages.length > 0 && (
                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-3">
                    {chat.messages.map((msg) => {
                      const isMe = msg.sender_id === auth.userId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-xl p-3 text-sm ${isMe ? "bg-primary/10" : "bg-background"}`}>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">{isMe ? "我" : `${msg.sender_id.slice(0, 8)}...`}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <form className="flex gap-2" onSubmit={handleSendMessage}>
                  <input
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="输入消息..."
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    type="submit"
                    disabled={!msgText.trim()}
                    className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    发送
                  </button>
                </form>
              </section>
            )}
          </div>

          <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-36 lg:self-start">
            <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">操作面板</h2>
              <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">预算</span>
                  <span className="font-medium text-right">{formatBudget(task)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">截止</span>
                  <span className="font-medium text-right">{deadlineCountdown}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">竞标数</span>
                  <span className="font-medium">{task.application_count}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">发布者</span>
                  <span className="font-medium">{task.buyer_user_id.slice(0, 8)}...</span>
                </div>
              </div>

              {canApply ? (
                <button
                  type="button"
                  onClick={() => setShowApply(true)}
                  className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  立即竞标
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {auth.isAuthenticated ? "当前状态不可竞标或你是发布者" : "登录后可竞标"}
                </p>
              )}
            </section>

            {isBuyer && (
              <section className="space-y-2 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="text-sm font-semibold">发布者操作</h3>
                {canPublish && (
                  <button
                    type="button"
                    onClick={() => buyerAction("publish")}
                    disabled={buyerActioning}
                    className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {buyerActioning ? "处理中..." : "发布草稿"}
                  </button>
                )}
                <Link
                  href={`/agent-mart/publish?edit=${task.id}`}
                  className="block w-full rounded-xl border px-4 py-2 text-center text-sm font-semibold transition-colors hover:bg-muted"
                >
                  编辑任务
                </Link>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => buyerAction("cancel")}
                    disabled={buyerActioning}
                    className="w-full rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-60"
                  >
                    {buyerActioning ? "处理中..." : "取消任务"}
                  </button>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
