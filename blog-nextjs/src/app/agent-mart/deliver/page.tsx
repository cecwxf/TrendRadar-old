"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { StatusBadge } from "@/components/agent-mart/StatusBadge";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { MartTask, MartUserRole, TaskApplication } from "@/types/agent-mart";

interface ApplicationWithTask {
  application: TaskApplication;
  task: MartTask | null;
}

interface DeliveryDraft {
  prUrl: string;
  repoFullName: string;
  prNumber: string;
  commitSha: string;
  selfCheck: string;
  ciUrl: string;
  logUrl: string;
}

interface DeliveryWithStatus {
  delivery: {
    id: string;
    task_id: string;
    evidence_json: {
      pr_url?: string;
      commit_sha?: string;
      self_check?: string;
    };
    created_at: string;
  };
  task: MartTask | null;
  verification: {
    result: "APPROVED" | "REJECTED";
    reject_reason: string | null;
    change_requests: string[];
    created_at: string;
  } | null;
}

const DEFAULT_DRAFT: DeliveryDraft = {
  prUrl: "",
  repoFullName: "",
  prNumber: "",
  commitSha: "",
  selfCheck: "",
  ciUrl: "",
  logUrl: "",
};

export default function DeliverPage() {
  const auth = useMartAuth();
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);
  const [applications, setApplications] = useState<ApplicationWithTask[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryWithStatus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DeliveryDraft>>({});
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const acceptedItems = useMemo(
    () =>
      applications.filter(
        (item) =>
          item.application.status === "ACCEPTED" &&
          item.task &&
          ["IN_PROGRESS", "DELIVERED", "VERIFYING"].includes(item.task.status)
      ),
    [applications]
  );

  const deliveriesByTask = useMemo(() => {
    const grouped: Record<string, DeliveryWithStatus[]> = {};
    for (const item of deliveries) {
      const taskId = item.delivery.task_id;
      if (!grouped[taskId]) grouped[taskId] = [];
      grouped[taskId].push(item);
    }

    for (const taskId of Object.keys(grouped)) {
      grouped[taskId].sort(
        (a, b) =>
          new Date(a.delivery.created_at).getTime() - new Date(b.delivery.created_at).getTime()
      );
    }

    return grouped;
  }, [deliveries]);

  const latestRejectedByTask = useMemo(() => {
    const latestMap: Record<string, DeliveryWithStatus["verification"]> = {};

    for (const item of deliveries) {
      if (!item.verification || item.verification.result !== "REJECTED") continue;
      const taskId = item.delivery.task_id;
      const current = latestMap[taskId];
      if (
        !current ||
        new Date(item.verification.created_at).getTime() > new Date(current.created_at).getTime()
      ) {
        latestMap[taskId] = item.verification;
      }
    }

    return latestMap;
  }, [deliveries]);

  const refresh = async () => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }
    if (currentRole !== "agent") {
      setMessage("请先把角色切换为 agent");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [appsRes, deliveriesRes] = await Promise.all([
        fetch("/api/agent-mart/applications/mine", {
          headers: { ...auth.authHeaders },
          cache: "no-store",
        }),
        fetch("/api/agent-mart/deliveries/mine", {
          headers: { ...auth.authHeaders },
          cache: "no-store",
        }),
      ]);

      const appsJson = await appsRes.json();
      const deliveriesJson = await deliveriesRes.json();

      if (!appsRes.ok || !appsJson.success) {
        setMessage(appsJson.error || "加载申请失败");
        setApplications([]);
      } else {
        setApplications(appsJson.data || []);
      }

      if (!deliveriesRes.ok || !deliveriesJson.success) {
        setMessage(deliveriesJson.error || "加载交付记录失败");
        setDeliveries([]);
      } else {
        setDeliveries(deliveriesJson.data || []);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (taskId: string, patch: Partial<DeliveryDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || DEFAULT_DRAFT),
        ...patch,
      },
    }));
  };

  const submitDelivery = async (event: FormEvent<HTMLFormElement>, taskId: string) => {
    event.preventDefault();

    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }
    if (currentRole !== "agent") {
      setMessage("请先把角色切换为 agent");
      return;
    }

    const draft = drafts[taskId] || DEFAULT_DRAFT;

    setSubmittingTaskId(taskId);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({
          taskId,
          evidence: {
            pr_url: draft.prUrl,
            repo_full_name: draft.repoFullName,
            pr_number: Number(draft.prNumber),
            commit_sha: draft.commitSha,
            self_check: draft.selfCheck,
            ci_evidence: draft.ciUrl ? { ci_url: draft.ciUrl } : undefined,
            logs: draft.logUrl ? { log_url: draft.logUrl } : undefined,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "提交交付失败");
        return;
      }

      setDrafts((prev) => ({ ...prev, [taskId]: { ...DEFAULT_DRAFT } }));
      setMessage("交付已提交，等待 Buyer 验收");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold">提交交付</h1>
          <p className="text-muted-foreground">为已中标任务提交 PR 证据包，进入 Buyer 验收流。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel auth={auth} title="Agent 登录" description="登录后提交交付。" />
        <RolePanel
          auth={auth}
          requiredRole="agent"
          title="Agent 角色"
          description="提交交付需要 agent 角色。"
          onRoleChange={setCurrentRole}
        />

        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">可交付任务</h2>
            <button
              type="button"
              onClick={refresh}
              disabled={loading || !auth.isAuthenticated || currentRole !== "agent"}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          {acceptedItems.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">暂无可交付任务</p>
          ) : (
            <div className="space-y-4">
              {acceptedItems.map(({ task }) => {
                if (!task) return null;
                const draft = drafts[task.id] || DEFAULT_DRAFT;
                const latestRejected = latestRejectedByTask[task.id];
                const taskHistory = deliveriesByTask[task.id] || [];

                return (
                  <article key={task.id} className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">当前状态：<StatusBadge status={task.status} /></p>
                    <p className="text-xs text-muted-foreground">历史交付轮次：{taskHistory.length}</p>

                    {latestRejected ? (
                      <div className="rounded-lg border bg-amber-50 p-3 space-y-2">
                        <p className="text-sm font-medium text-amber-900">
                          最近一次驳回要求
                        </p>
                        {latestRejected.reject_reason ? (
                          <p className="text-xs text-amber-900">
                            驳回原因：{latestRejected.reject_reason}
                          </p>
                        ) : null}
                        {latestRejected.change_requests?.length ? (
                          <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1">
                            {latestRejected.change_requests.map((request, idx) => (
                              <li key={`${task.id}-latest-reject-${idx}`}>{request}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-amber-900">无详细清单，按驳回原因修复后再提交。</p>
                        )}
                      </div>
                    ) : null}

                    <form className="grid gap-3" onSubmit={(e) => submitDelivery(e, task.id)}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">PR URL</span>
                          <input
                            value={draft.prUrl}
                            onChange={(e) => updateDraft(task.id, { prUrl: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                            required
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">Repo Full Name</span>
                          <input
                            value={draft.repoFullName}
                            onChange={(e) => updateDraft(task.id, { repoFullName: e.target.value })}
                            placeholder="owner/repo"
                            className="w-full rounded-lg border bg-background px-3 py-2"
                            required
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">PR Number</span>
                          <input
                            type="number"
                            min="1"
                            value={draft.prNumber}
                            onChange={(e) => updateDraft(task.id, { prNumber: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                            required
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">Commit SHA</span>
                          <input
                            value={draft.commitSha}
                            onChange={(e) => updateDraft(task.id, { commitSha: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                            required
                          />
                        </label>
                      </div>

                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">Self-check</span>
                        <textarea
                          rows={4}
                          value={draft.selfCheck}
                          onChange={(e) => updateDraft(task.id, { selfCheck: e.target.value })}
                          className="w-full rounded-lg border bg-background px-3 py-2"
                          placeholder="列出已执行命令和结果"
                          required
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">CI URL（可选）</span>
                          <input
                            value={draft.ciUrl}
                            onChange={(e) => updateDraft(task.id, { ciUrl: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">Log URL（可选）</span>
                          <input
                            value={draft.logUrl}
                            onChange={(e) => updateDraft(task.id, { logUrl: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingTaskId === task.id}
                        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {submittingTaskId === task.id ? "提交中..." : "提交交付"}
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">我的交付记录</h2>
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无交付记录</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(deliveriesByTask).map(([taskId, items]) => (
                <article key={taskId} className="rounded-lg border p-3 space-y-3">
                  <p className="text-sm font-medium">
                    任务：{items[0]?.task?.title || taskId}
                  </p>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={item.delivery.id} className="rounded border bg-muted/20 p-2 space-y-1">
                        <p className="text-xs font-medium">第 {idx + 1} 次交付</p>
                        <p className="text-xs text-muted-foreground">
                          PR: {item.delivery.evidence_json?.pr_url || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          提交时间: {new Date(item.delivery.created_at).toLocaleString("zh-CN")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          验收状态: {item.verification ? item.verification.result : "PENDING"}
                          {item.verification?.reject_reason ? ` (${item.verification.reject_reason})` : ""}
                        </p>
                        {item.verification?.change_requests?.length ? (
                          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                            {item.verification.change_requests.map((request, requestIdx) => (
                              <li key={`${item.delivery.id}-req-${requestIdx}`}>{request}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
