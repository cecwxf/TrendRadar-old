"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import { AppStatusBadge, StatusBadge } from "@/components/agent-mart/StatusBadge";
import type { MartTask, TaskApplication, TaskMessage } from "@/types/agent-mart";

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

  /* ── fetch task ── */

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "加载失败");
        return;
      }
      setTask(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ── fetch messages ── */

  const loadMessages = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.accessToken) return;
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/messages?limit=50`, {
        headers: auth.authHeaders,
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessages(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setMsgLoading(false);
    }
  }, [id, auth.isAuthenticated, auth.accessToken, auth.authHeaders]);

  /* ── fetch applications (buyer only) ── */

  const loadApplications = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.accessToken || auth.currentRole !== "buyer") return;
    setAppsLoading(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/applications`, {
        headers: auth.authHeaders,
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setApplications(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setAppsLoading(false);
    }
  }, [id, auth.isAuthenticated, auth.accessToken, auth.currentRole, auth.authHeaders]);

  /* ── accept / reject application ── */

  const handleApplicationAction = async (appId: string, action: "accept" | "reject") => {
    if (!auth.isAuthenticated || !auth.accessToken) return;
    setActioningId(appId);
    setError(null);
    try {
      const res = await fetch(`/api/agent-mart/applications/${appId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || `${action} 失败`);
        return;
      }
      setNotice(action === "accept" ? "已接受申请" : "已拒绝申请");
      loadApplications();
      loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActioningId(null);
    }
  };

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (task) loadMessages();
  }, [task, loadMessages]);

  useEffect(() => {
    if (task) loadApplications();
  }, [task, loadApplications]);

  /* ── submit apply ── */

  const submitApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.isAuthenticated || !auth.accessToken) return;

    setSubmitting(true);
    setError(null);
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
        setError(json.error || "申请失败");
        return;
      }
      setShowApply(false);
      setDraft(defaultDraft);
      setNotice("申请已提交");
      loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── send message ── */

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !auth.isAuthenticated || !auth.accessToken) return;

    setMsgSending(true);
    try {
      const res = await fetch(`/api/agent-mart/tasks/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({ content: msgText.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMsgText("");
        loadMessages();
      }
    } catch {
      // silent
    } finally {
      setMsgSending(false);
    }
  };

  /* ── render ── */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </main>
    );
  }

  if (error && !task) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 space-y-4">
          <p className="text-sm text-red-500">{error}</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回任务广场
          </Link>
        </div>
      </main>
    );
  }

  if (!task) return null;

  const canApply = auth.isAuthenticated && auth.currentRole === "agent" && (task.status === "OPEN" || task.status === "BIDDING");
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
        {/* breadcrumb */}
        <nav className="text-sm text-muted-foreground">
          <Link href="/agent-mart" className="hover:underline">任务广场</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{task.title}</span>
        </nav>

        {/* header */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
            <StatusBadge status={task.status} className="shrink-0" />
          </div>

          {/* meta grid */}
          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><span className="text-muted-foreground">类型:</span> {task.type}</div>
            <div><span className="text-muted-foreground">预算:</span> {formatBudget(task)}</div>
            <div><span className="text-muted-foreground">交期:</span> {task.eta_days ? `${task.eta_days} 天` : "–"}</div>
            <div><span className="text-muted-foreground">来源:</span> {task.source}</div>
            <div><span className="text-muted-foreground">申请数:</span> {task.application_count}</div>
            {task.deadline && (
              <div><span className="text-muted-foreground">截止:</span> {formatDate(task.deadline)}</div>
            )}
            {task.tech_stack.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-muted-foreground">技术栈:</span>{" "}
                {task.tech_stack.map((t) => (
                  <span key={t} className="mr-1.5 inline-block rounded bg-muted px-2 py-0.5 text-xs">{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            发布于 {formatDate(task.created_at)} · 更新于 {formatDate(task.updated_at)}
          </div>
        </section>

        {/* description */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">任务描述</h2>
          <div className="prose prose-sm max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
          </div>
        </section>

        {/* acceptance criteria */}
        {task.acceptance_json && (
          <section className="rounded-xl border bg-card p-5 space-y-2">
            <h2 className="text-lg font-semibold">验收标准</h2>
            {task.acceptance_json.ci_required && (
              <p className="text-sm">CI 必须通过</p>
            )}
            {task.acceptance_json.checklist && task.acceptance_json.checklist.length > 0 && (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {task.acceptance_json.checklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {task.acceptance_json.notes && (
              <p className="text-sm text-muted-foreground">{task.acceptance_json.notes}</p>
            )}
          </section>
        )}

        {/* github info */}
        {task.github_repo && (
          <section className="rounded-xl border bg-card p-5 space-y-1 text-sm">
            <h2 className="text-lg font-semibold">GitHub</h2>
            <p>仓库: {task.github_repo}</p>
            {task.github_issue_id && <p>Issue: #{task.github_issue_id}</p>}
            {task.github_pr_id && <p>PR: #{task.github_pr_id}</p>}
          </section>
        )}

        {/* applications list (buyer only) */}
        {auth.currentRole === "buyer" && task.buyer_user_id === auth.userId && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">竞标列表 ({applications.length})</h2>
            {appsLoading ? (
              <p className="text-sm text-muted-foreground">加载中…</p>
            ) : applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无竞标</p>
            ) : (
              <div className="divide-y">
                {applications.map((app) => (
                  <div key={app.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Agent: {app.agent_user_id.slice(0, 8)}…</span>
                      <AppStatusBadge status={app.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <span>报价: ${app.bid_amount}</span>
                      <span>工期: {app.eta_days}天</span>
                      {app.confidence != null && <span>信心: {app.confidence}%</span>}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{app.plan}</div>
                    {app.assumptions && (
                      <p className="text-xs text-muted-foreground">假设: {app.assumptions}</p>
                    )}
                    {app.status === "PENDING" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={actioningId === app.id}
                          onClick={() => handleApplicationAction(app.id, "accept")}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actioningId === app.id ? "处理中…" : "接受"}
                        </button>
                        <button
                          disabled={actioningId === app.id}
                          onClick={() => handleApplicationAction(app.id, "reject")}
                          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {actioningId === app.id ? "处理中…" : "拒绝"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* notices */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}

        {/* apply section */}
        {canApply && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            {!showApply ? (
              <button
                onClick={() => setShowApply(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                申请此任务
              </button>
            ) : (
              <>
                <h2 className="text-lg font-semibold">提交申请</h2>
                <form className="grid gap-3" onSubmit={submitApply}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">报价</span>
                      <input type="number" min="0" value={draft.bidAmount} onChange={(e) => setDraft({ ...draft, bidAmount: e.target.value })} className={inputCls} required />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">交付时长（天）</span>
                      <input type="number" min="1" value={draft.etaDays} onChange={(e) => setDraft({ ...draft, etaDays: e.target.value })} className={inputCls} required />
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">执行计划</span>
                    <textarea value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} rows={4} className={inputCls} required />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">假设（可选）</span>
                      <input value={draft.assumptions} onChange={(e) => setDraft({ ...draft, assumptions: e.target.value })} className={inputCls} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">信心值 0-1（可选）</span>
                      <input type="number" min="0" max="1" step="0.01" value={draft.confidence} onChange={(e) => setDraft({ ...draft, confidence: e.target.value })} className={inputCls} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                      {submitting ? "提交中..." : "提交申请"}
                    </button>
                    <button type="button" onClick={() => setShowApply(false)} className="rounded-lg border px-4 py-2 text-sm">
                      取消
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        )}

        {/* messages */}
        {auth.isAuthenticated && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">消息</h2>

            {msgLoading && <p className="text-sm text-muted-foreground">加载消息...</p>}

            {!msgLoading && messages.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无消息</p>
            )}

            {messages.length > 0 && (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className={`rounded-lg p-3 text-sm ${msg.type === "SYSTEM" || msg.type === "STATUS_CHANGE" ? "bg-muted/50 text-muted-foreground italic" : "bg-muted"}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-xs">{msg.sender_id.slice(0, 8)}...</span>
                      <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
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
