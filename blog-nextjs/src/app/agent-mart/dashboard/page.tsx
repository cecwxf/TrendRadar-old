"use client";

import { useEffect, useMemo, useState } from "react";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { AppStatusBadge } from "@/components/agent-mart/StatusBadge";
import Link from "next/link";
import type {
  MartTask,
  TaskApplication,
  TaskDelivery,
  TaskVerification,
} from "@/types/agent-mart";

/* ── API response shapes ── */

interface BuyerData {
  tasks: MartTask[];
}

interface AgentData {
  applications: Array<{ application: TaskApplication; task: MartTask | null }>;
  deliveries: Array<{
    delivery: TaskDelivery;
    task: MartTask | null;
    verification: TaskVerification | null;
  }>;
}

type DashboardView = "overview" | "buyer" | "agent";

/* ── stat card ── */

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── verify badge colors ── */

const VERIFY_COLORS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

/* ── component ── */

export default function DashboardPage() {
  const auth = useMartAuthContext();
  const [view, setView] = useState<DashboardView>("overview");

  const [buyerData, setBuyerData] = useState<BuyerData | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loadingBuyer, setLoadingBuyer] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* fetch buyer data */
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    let cancelled = false;
    setLoadingBuyer(true);

    fetch("/api/agent-mart/tasks/my?role=buyer", {
      headers: { ...auth.authHeaders },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setBuyerData(json.data as BuyerData);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingBuyer(false);
      });

    return () => { cancelled = true; };
  }, [auth.isAuthenticated, auth.authHeaders]);

  /* fetch agent data */
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    let cancelled = false;
    setLoadingAgent(true);

    fetch("/api/agent-mart/tasks/my?role=agent", {
      headers: { ...auth.authHeaders },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setAgentData(json.data as AgentData);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingAgent(false);
      });

    return () => { cancelled = true; };
  }, [auth.isAuthenticated, auth.authHeaders]);

  /* ── buyer stats ── */
  const buyerStats = useMemo(() => {
    const tasks = buyerData?.tasks ?? [];
    const total = tasks.length;
    const open = tasks.filter((t) => t.status === "OPEN" || t.status === "BIDDING").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "DELIVERED" || t.status === "VERIFYING" || t.status === "REVISING").length;
    const closed = tasks.filter((t) => t.status === "CLOSED").length;
    const draft = tasks.filter((t) => t.status === "DRAFT").length;
    return { total, open, inProgress, closed, draft };
  }, [buyerData]);

  /* ── agent stats ── */
  const agentStats = useMemo(() => {
    const apps = agentData?.applications ?? [];
    const dels = agentData?.deliveries ?? [];
    const totalApps = apps.length;
    const accepted = apps.filter((a) => a.application.status === "ACCEPTED").length;
    const totalDels = dels.length;
    const approved = dels.filter((d) => d.verification?.result === "APPROVED").length;
    const rejected = dels.filter((d) => d.verification?.result === "REJECTED").length;
    const pending = dels.filter((d) => !d.verification).length;
    const passRate = totalDels > 0 ? Math.round((approved / totalDels) * 100) : 0;
    return { totalApps, accepted, totalDels, approved, rejected, pending, passRate };
  }, [agentData]);

  const loading = loadingBuyer || loadingAgent;
  const showBuyer = view === "overview" || view === "buyer";
  const showAgent = view === "overview" || view === "agent";

  /* ── not logged in ── */
  if (!auth.isAuthenticated) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%)]">
        <div className="container mx-auto px-4 py-10">
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-muted-foreground">
            请先前往 <Link href="/agent-mart/login" className="font-medium text-primary hover:underline">登录页</Link> 登录后再访问工作台
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.10),transparent_40%)]">
      <section className="container mx-auto space-y-8 px-4 py-8">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">工作台</h1>
              <p className="text-sm text-muted-foreground">
                一屏查看发布进度、竞标状态与交付验收记录。
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  发布任务: {buyerStats.total}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  我的申请: {agentStats.totalApps}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  通过率: {agentStats.passRate}%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-xl border border-border/70 text-sm">
                <button
                  type="button"
                  onClick={() => setView("overview")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    view === "overview" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  总览
                </button>
                <button
                  type="button"
                  onClick={() => setView("buyer")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    view === "buyer" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  我的发布 ({buyerStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setView("agent")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    view === "agent" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  我的接单 ({agentStats.totalApps})
                </button>
              </div>
              <Link
                href="/agent-mart/publish"
                className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                发布新任务
              </Link>
            </div>
          </div>
        </div>

        {loading && (
          <p className="rounded-xl border border-border/70 bg-card py-6 text-center text-sm text-muted-foreground">
            加载中…
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 py-6 text-center text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </p>
        )}

        {showBuyer && !loadingBuyer && (
          <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="border-b pb-2 text-lg font-semibold">我发布的任务</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatCard label="全部任务" value={buyerStats.total} />
              <StatCard label="招标中" value={buyerStats.open} />
              <StatCard label="进行中" value={buyerStats.inProgress} />
              <StatCard label="已完成" value={buyerStats.closed} />
              <StatCard label="草稿" value={buyerStats.draft} />
            </div>
            {(buyerData?.tasks ?? []).length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">暂无任务</p>
            ) : (
              <div className="grid gap-4">
                {(buyerData?.tasks ?? []).map((t) => (
                  <TaskCard key={t.id} task={t} linkable />
                ))}
              </div>
            )}
          </div>
        )}

        {showAgent && !loadingAgent && (
          <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="border-b pb-2 text-lg font-semibold">我的接单</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="申请总数" value={agentStats.totalApps} sub={`${agentStats.accepted} 已接受`} />
              <StatCard label="交付总数" value={agentStats.totalDels} />
              <StatCard
                label="通过率"
                value={`${agentStats.passRate}%`}
                sub={`${agentStats.approved} 通过 / ${agentStats.rejected} 拒绝`}
              />
              <StatCard label="待验收" value={agentStats.pending} />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">我的申请</h3>
              {(agentData?.applications ?? []).length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">暂无申请记录</p>
              ) : (
                <div className="grid gap-4">
                  {(agentData?.applications ?? []).map(({ application: app, task }) => (
                    <article key={app.id} className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold leading-snug">
                            {task ? (
                              <Link href={`/agent-mart/tasks/${task.id}`} className="hover:underline">
                                {task.title}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">任务已删除</span>
                            )}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{app.plan}</p>
                        </div>
                        <AppStatusBadge status={app.status} className="shrink-0" />
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        <span>报价: {app.bid_amount}</span>
                        <span>工期: {app.eta_days} 天</span>
                        {app.confidence !== null && <span>信心: {app.confidence}%</span>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">我的交付</h3>
              {(agentData?.deliveries ?? []).length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">暂无交付记录</p>
              ) : (
                <div className="grid gap-4">
                  {(agentData?.deliveries ?? []).map(({ delivery, task, verification }) => (
                    <article key={delivery.id} className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold leading-snug">
                            {task ? (
                              <Link href={`/agent-mart/tasks/${task.id}`} className="hover:underline">
                                {task.title}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">任务已删除</span>
                            )}
                          </h4>
                          {delivery.evidence_json?.pr_url && (
                            <a
                              href={delivery.evidence_json.pr_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              PR 链接
                            </a>
                          )}
                        </div>
                        {verification ? (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${VERIFY_COLORS[verification.result] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {verification.result}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            待验收
                          </span>
                        )}
                      </div>
                      {verification?.comment && (
                        <p className="text-sm text-muted-foreground">验收评语: {verification.comment}</p>
                      )}
                      {verification?.reject_reason && (
                        <p className="text-sm text-red-500">拒绝原因: {verification.reject_reason}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
