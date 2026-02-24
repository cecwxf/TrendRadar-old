"use client";

import { useEffect, useMemo, useState } from "react";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { AppStatusBadge, StatusBadge } from "@/components/agent-mart/StatusBadge";
import Link from "next/link";
import type {
  MartTask,
  MartUserRole,
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

/* ── stat card ── */

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ── verify badge colors ── */

const VERIFY_COLORS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

/* ── tab button ── */

const tabCls = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted"
  }`;

/* ── component ── */

export default function DashboardPage() {
  const auth = useMartAuthContext();
  const defaultTab = auth.currentRole ?? "buyer";

  const [tab, setTab] = useState<MartUserRole>(defaultTab);
  const [buyerData, setBuyerData] = useState<BuyerData | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* sync tab when role changes externally */
  useEffect(() => {
    if (auth.currentRole) setTab(auth.currentRole);
  }, [auth.currentRole]);

  /* fetch data for active tab */
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/agent-mart/tasks/my?role=${tab}`, {
      headers: { ...auth.authHeaders },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) {
          setError(json.error || "加载失败");
          return;
        }
        if (tab === "agent") {
          setAgentData(json.data as AgentData);
        } else {
          setBuyerData(json.data as BuyerData);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [auth.isAuthenticated, auth.authHeaders, tab]);

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

  /* ── not logged in ── */
  if (!auth.isAuthenticated) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        请先登录后再访问工作台
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* ── tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button type="button" className={tabCls(tab === "buyer")} onClick={() => setTab("buyer")}>
            Buyer 工作台
          </button>
          <button type="button" className={tabCls(tab === "agent")} onClick={() => setTab("agent")}>
            Agent 工作台
          </button>
        </div>
        {tab === "buyer" && (
          <Link
            href="/agent-mart/publish"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            发布新任务
          </Link>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground py-10 text-center">加载中…</p>}
      {error && <p className="text-sm text-red-500 py-10 text-center">{error}</p>}

      {/* ══════════ Buyer Tab ══════════ */}
      {!loading && !error && tab === "buyer" && (
        <>
          {/* stat cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <StatCard label="全部任务" value={buyerStats.total} />
            <StatCard label="招标中" value={buyerStats.open} />
            <StatCard label="进行中" value={buyerStats.inProgress} />
            <StatCard label="已完成" value={buyerStats.closed} />
            <StatCard label="草稿" value={buyerStats.draft} />
          </div>

          {/* task list */}
          {(buyerData?.tasks ?? []).length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">暂无任务</p>
          ) : (
            <div className="grid gap-4">
              {(buyerData?.tasks ?? []).map((t) => (
                <TaskCard key={t.id} task={t} linkable />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════ Agent Tab ══════════ */}
      {!loading && !error && tab === "agent" && (
        <>
          {/* stat cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard label="申请总数" value={agentStats.totalApps} sub={`${agentStats.accepted} 已接受`} />
            <StatCard label="交付总数" value={agentStats.totalDels} />
            <StatCard label="通过率" value={`${agentStats.passRate}%`} sub={`${agentStats.approved} 通过 / ${agentStats.rejected} 拒绝`} />
            <StatCard label="待验收" value={agentStats.pending} />
          </div>

          {/* applications */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">我的申请</h3>
            {(agentData?.applications ?? []).length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">暂无申请记录</p>
            ) : (
              <div className="grid gap-4">
                {(agentData?.applications ?? []).map(({ application: app, task }) => (
                  <article key={app.id} className="rounded-xl border bg-card p-4 space-y-2">
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
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{app.plan}</p>
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

          {/* deliveries */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">我的交付</h3>
            {(agentData?.deliveries ?? []).length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">暂无交付记录</p>
            ) : (
              <div className="grid gap-4">
                {(agentData?.deliveries ?? []).map(({ delivery, task, verification }) => (
                  <article key={delivery.id} className="rounded-xl border bg-card p-4 space-y-2">
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
                        <span className="shrink-0 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium">
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
        </>
      )}
    </section>
  );
}
