"use client";

import { useEffect, useState } from "react";
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

/* ── types for API response ── */

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

/* ── helpers ── */

const VERIFY_COLORS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-600",
};

export default function DashboardPage() {
  const auth = useMartAuthContext();
  const role = auth.currentRole;

  const [buyerData, setBuyerData] = useState<BuyerData | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !role) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/agent-mart/tasks/my?role=${role}`, {
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
        if (role === "agent") {
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
  }, [auth.isAuthenticated, auth.authHeaders, role]);

  /* ── not logged in ── */
  if (!auth.isAuthenticated) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        请先登录后再访问工作台
      </div>
    );
  }

  /* ── no role selected ── */
  if (!role) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        请先在导航栏选择角色（Buyer / Agent）
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">加载中…</div>;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>;
  }

  /* ── Buyer dashboard ── */
  if (role === "buyer") {
    const tasks = buyerData?.tasks ?? [];
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">我发布的任务</h2>
          <Link
            href="/agent-mart/publish"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            发布新任务
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center">暂无任务</p>
        ) : (
          <div className="grid gap-4">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} linkable />
            ))}
          </div>
        )}
      </section>
    );
  }

  /* ── Agent dashboard ── */
  const applications = agentData?.applications ?? [];
  const deliveries = agentData?.deliveries ?? [];

  return (
    <section className="space-y-8">
      {/* Applications */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">我的申请</h2>
        {applications.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center">暂无申请记录</p>
        ) : (
          <div className="grid gap-4">
            {applications.map(({ application: app, task }) => (
              <article
                key={app.id}
                className="rounded-xl border bg-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug">
                      {task ? (
                        <Link
                          href={`/agent-mart/tasks/${task.id}`}
                          className="hover:underline"
                        >
                          {task.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">任务已删除</span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {app.plan}
                    </p>
                  </div>
                  <AppStatusBadge status={app.status} className="shrink-0" />
                </div>
                <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                  <span>报价: {app.bid_amount}</span>
                  <span>工期: {app.eta_days} 天</span>
                  {app.confidence !== null && (
                    <span>信心: {app.confidence}%</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Deliveries */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">我的交付</h2>
        {deliveries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center">暂无交付记录</p>
        ) : (
          <div className="grid gap-4">
            {deliveries.map(({ delivery, task, verification }) => (
              <article
                key={delivery.id}
                className="rounded-xl border bg-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug">
                      {task ? (
                        <Link
                          href={`/agent-mart/tasks/${task.id}`}
                          className="hover:underline"
                        >
                          {task.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">任务已删除</span>
                      )}
                    </h3>
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
                    <span className="shrink-0 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">
                      待验收
                    </span>
                  )}
                </div>
                {verification?.comment && (
                  <p className="text-sm text-muted-foreground">
                    验收评语: {verification.comment}
                  </p>
                )}
                {verification?.reject_reason && (
                  <p className="text-sm text-red-500">
                    拒绝原因: {verification.reject_reason}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
