"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import { AppStatusBadge, StatusBadge } from "@/components/agent-mart/StatusBadge";
import type { MartTask, TaskApplication, TaskDelivery, TaskMessage, TaskVerification } from "@/types/agent-mart";

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
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);

  // applications (buyer only)
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

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

  /* ── fetch messages ── */

  const loadMessages = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/messages`, {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setMessages(json.data || []);
    } catch { /* ignore */ }
    finally { setMsgLoading(false); }
  }, [id, auth.isAuthenticated, auth.authHeaders]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

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

  /* ── send message ── */

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || msgSending || !auth.isAuthenticated) return;
    setMsgSending(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({ content: msgText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setMsgText("");
        loadMessages();
      } else {
        setNotice(json.error || "发送失败");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setMsgSending(false);
    }
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

  const canApply = auth.isAuthenticated && auth.hasRole("agent") && !isBuyer
    && ["OPEN", "BIDDING"].includes(task.status);
  const canCancel = isBuyer && ["DRAFT", "OPEN"].includes(task.status);
  const canPublish = isBuyer && task.status === "DRAFT";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* ── breadcrumb ── */}
        <Link href="/agent-mart" className="text-sm text-primary hover:underline">← 返回任务广场</Link>

        {/* ── task header ── */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{task.type}</span>
            {task.deadline && (
              <span className="text-xs text-muted-foreground">截止 {formatDate(task.deadline)}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>预算: {formatBudget(task)}</span>
            {task.eta_days && <span>预计 {task.eta_days} 天</span>}
            <span>申请数: {task.application_count}</span>
            <span>发布于 {formatDate(task.created_at)}</span>
          </div>
          {task.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tech_stack.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{t}</span>
              ))}
            </div>
          )}
        </header>

        {/* ── notice ── */}
        {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

        {/* ── buyer action bar ── */}
        {isBuyer && (
          <div className="flex flex-wrap gap-2">
            {canPublish && (
              <button
                type="button"
                onClick={() => buyerAction("publish")}
                disabled={buyerActioning}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
              >
                {buyerActioning ? "处理中..." : "发布草稿"}
              </button>
            )}
            <Link
              href={`/agent-mart/publish?edit=${task.id}`}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
            >
              编辑任务
            </Link>
            {canCancel && (
              <button
                type="button"
                onClick={() => buyerAction("cancel")}
                disabled={buyerActioning}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-60"
              >
                {buyerActioning ? "处理中..." : "取消任务"}
              </button>
            )}
          </div>
        )}

        {/* ── description (markdown) ── */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold mb-3">任务描述</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
          </div>
          {task.acceptance_json && (
            <div className="mt-4 border-t pt-4 space-y-2">
              <h3 className="text-sm font-semibold">验收标准</h3>
              {task.acceptance_json.ci_required && (
                <p className="text-xs text-muted-foreground">✓ 需要 CI 通过</p>
              )}
              {Array.isArray(task.acceptance_json.checklist) && task.acceptance_json.checklist.length > 0 && (
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
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

        {/* ── agent apply section ── */}
        {canApply && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            {!showApply ? (
              <button
                type="button"
                onClick={() => setShowApply(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                申请此任务
              </button>
            ) : (
              <>
                <h2 className="text-lg font-semibold">提交申请</h2>
                <form className="grid gap-3" onSubmit={submitApply}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm space-y-1">
                      <span className="text-muted-foreground">报价 *</span>
                      <input
                        type="number" min="0" required
                        value={draft.bidAmount}
                        onChange={(e) => setDraft({ ...draft, bidAmount: e.target.value })}
                        className="w-full rounded-lg border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="text-sm space-y-1">
                      <span className="text-muted-foreground">交付天数 *</span>
                      <input
                        type="number" min="1" required
                        value={draft.etaDays}
                        onChange={(e) => setDraft({ ...draft, etaDays: e.target.value })}
                        className="w-full rounded-lg border bg-background px-3 py-2"
                      />
                    </label>
                  </div>
                  <label className="text-sm space-y-1">
                    <span className="text-muted-foreground">实施方案 *</span>
                    <textarea
                      rows={4} required
                      value={draft.plan}
                      onChange={(e) => setDraft({ ...draft, plan: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-muted-foreground">假设与前提（可选）</span>
                    <textarea
                      rows={2}
                      value={draft.assumptions}
                      onChange={(e) => setDraft({ ...draft, assumptions: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2"
                    />
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-muted-foreground">信心值 0-1（可选）</span>
                    <input
                      type="number" min="0" max="1" step="0.01"
                      value={draft.confidence}
                      onChange={(e) => setDraft({ ...draft, confidence: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit" disabled={submitting}
                      className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                    >
                      {submitting ? "提交中..." : "提交申请"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApply(false)}
                      className="rounded-lg border px-4 py-2 text-sm"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        )}

        {/* ── applications list (buyer only) ── */}
        {isBuyer && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">申请列表 ({applications.length})</h2>
            {appsLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
            {!appsLoading && applications.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无申请</p>
            )}
            <div className="space-y-3">
              {applications.map((app) => (
                <article key={app.id} className="rounded-lg border p-4 space-y-2">
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
                  <p className="text-sm whitespace-pre-wrap">{app.plan}</p>
                  {app.assumptions && (
                    <p className="text-xs text-muted-foreground">假设: {app.assumptions}</p>
                  )}
                  {app.status === "PENDING" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAppAction(app.id, "accept")}
                        disabled={actioningId === app.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white disabled:opacity-60"
                      >
                        {actioningId === app.id ? "处理中..." : "接受"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAppAction(app.id, "reject")}
                        disabled={actioningId === app.id}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:text-red-400 disabled:opacity-60"
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

        {/* ── messages ── */}
        {auth.isAuthenticated && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">消息</h2>
            {msgLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
            {!msgLoading && messages.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无消息</p>
            )}

            {messages.length > 0 && (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === auth.userId;
                  const isSystem = msg.type === "SYSTEM" || msg.type === "STATUS_CHANGE";
                  const isCode = msg.type === "CODE";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="inline-block rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground italic">
                          {msg.content}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(msg.created_at)}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg p-3 text-sm ${isMe ? "bg-primary/10" : "bg-muted"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-xs">{isMe ? "我" : `${msg.sender_id.slice(0, 8)}...`}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(msg.created_at)}</span>
                        </div>
                        {isCode ? (
                          <pre className="overflow-x-auto rounded bg-muted p-2 text-xs"><code>{msg.content}</code></pre>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form className="flex gap-2" onSubmit={sendMessage}>
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="输入消息..."
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={msgSending || !msgText.trim()}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
              >
                {msgSending ? "发送中..." : "发送"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
