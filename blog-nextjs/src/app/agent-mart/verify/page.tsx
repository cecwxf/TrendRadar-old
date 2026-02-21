"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { MartTask, MartUserRole } from "@/types/agent-mart";

interface DeliveryWithVerification {
  delivery: {
    id: string;
    task_id: string;
    agent_user_id: string;
    evidence_json: {
      pr_url?: string;
      repo_full_name?: string;
      pr_number?: number;
      commit_sha?: string;
      self_check?: string;
      ci_evidence?: { ci_url?: string };
      logs?: { log_url?: string };
    };
    created_at: string;
  };
  verification: {
    id: string;
    result: "APPROVED" | "REJECTED";
    reject_reason: string | null;
    comment: string | null;
    change_requests: string[];
    created_at: string;
  } | null;
}

export default function VerifyPage() {
  const auth = useMartAuth();
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);
  const [tasks, setTasks] = useState<MartTask[]>([]);
  const [deliveriesByTask, setDeliveriesByTask] = useState<Record<string, DeliveryWithVerification[]>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [rejectChecklists, setRejectChecklists] = useState<Record<string, string>>({});
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verifyingDeliveryId, setVerifyingDeliveryId] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }
    if (currentRole !== "buyer") {
      setMessage("请先把角色切换为 buyer");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/tasks/mine", {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载任务失败");
        setTasks([]);
        return;
      }

      setTasks((json.data || []).filter((task: MartTask) => ["IN_PROGRESS", "DELIVERED", "VERIFYING"].includes(task.status)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (taskId: string) => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }
    if (currentRole !== "buyer") {
      setMessage("请先把角色切换为 buyer");
      return;
    }

    try {
      const res = await fetch(`/api/agent-mart/tasks/${taskId}/deliveries`, {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载交付失败");
        return;
      }

      setDeliveriesByTask((prev) => ({
        ...prev,
        [taskId]: json.data || [],
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const approve = async (deliveryId: string, taskId: string) => {
    if (!auth.isAuthenticated || !auth.accessToken || currentRole !== "buyer") {
      setMessage("请先登录并切换 buyer 角色");
      return;
    }

    setVerifyingDeliveryId(deliveryId);
    setMessage(null);

    try {
      const res = await fetch(`/api/agent-mart/deliveries/${deliveryId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({ comment: "Approved" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "验收失败");
        return;
      }

      setMessage("已通过验收");
      await loadDeliveries(taskId);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setVerifyingDeliveryId(null);
    }
  };

  const reject = async (deliveryId: string, taskId: string) => {
    if (!auth.isAuthenticated || !auth.accessToken || currentRole !== "buyer") {
      setMessage("请先登录并切换 buyer 角色");
      return;
    }

    const reason = (rejectReasons[deliveryId] || "").trim();
    if (!reason) {
      setMessage("驳回时必须填写 reject reason");
      return;
    }
    const changeRequests = (rejectChecklists[deliveryId] || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const comment = (rejectComments[deliveryId] || "").trim();

    setVerifyingDeliveryId(deliveryId);
    setMessage(null);

    try {
      const res = await fetch(`/api/agent-mart/deliveries/${deliveryId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({
          rejectReason: reason,
          changeRequests,
          comment: comment || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "驳回失败");
        return;
      }

      setMessage("已驳回交付，任务回到 IN_PROGRESS");
      setRejectChecklists((prev) => ({ ...prev, [deliveryId]: "" }));
      setRejectComments((prev) => ({ ...prev, [deliveryId]: "" }));
      await loadDeliveries(taskId);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setVerifyingDeliveryId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold">验收交付</h1>
          <p className="text-muted-foreground">Buyer 审核 Agent 提交的证据包并给出通过/驳回。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel auth={auth} title="Buyer 登录" description="登录后审核交付。" />
        <RolePanel
          auth={auth}
          requiredRole="buyer"
          title="Buyer 角色"
          description="验收流程需要 buyer 角色。"
          onRoleChange={setCurrentRole}
        />

        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">待验收任务</h2>
            <button
              type="button"
              onClick={loadTasks}
              disabled={loading || !auth.isAuthenticated || currentRole !== "buyer"}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          {tasks.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">暂无待验收任务</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const deliveries = [...(deliveriesByTask[task.id] || [])].sort(
                  (a, b) =>
                    new Date(a.delivery.created_at).getTime() - new Date(b.delivery.created_at).getTime()
                );

                return (
                  <TaskCard key={task.id} task={task}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => loadDeliveries(task.id)}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        查看交付 ({deliveries.length})
                      </button>
                    </div>

                    {deliveries.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {deliveries.map((item, idx) => {
                          const evidence = item.delivery.evidence_json || {};

                          return (
                            <article key={item.delivery.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                              <p className="text-sm font-medium">第 {idx + 1} 次交付</p>
                              <p className="text-xs text-muted-foreground">Delivery ID: {item.delivery.id}</p>
                              <p className="text-xs text-muted-foreground">PR: {evidence.pr_url || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">Repo: {evidence.repo_full_name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">PR Number: {String(evidence.pr_number || "N/A")}</p>
                              <p className="text-xs text-muted-foreground">Commit: {evidence.commit_sha || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">
                                提交时间: {new Date(item.delivery.created_at).toLocaleString("zh-CN")}
                              </p>
                              <pre className="whitespace-pre-wrap text-xs rounded bg-background p-2 border">
                                {evidence.self_check || "(no self-check)"}
                              </pre>
                              {evidence.ci_evidence?.ci_url && (
                                <p className="text-xs text-muted-foreground">CI: {evidence.ci_evidence.ci_url}</p>
                              )}
                              {evidence.logs?.log_url && (
                                <p className="text-xs text-muted-foreground">Logs: {evidence.logs.log_url}</p>
                              )}

                              {item.verification ? (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    已验收: {item.verification.result}
                                    {item.verification.reject_reason ? ` (${item.verification.reject_reason})` : ""}
                                  </p>
                                  {item.verification.comment ? (
                                    <p className="text-xs text-muted-foreground">
                                      验收备注: {item.verification.comment}
                                    </p>
                                  ) : null}
                                  {item.verification.change_requests?.length ? (
                                    <div className="rounded border bg-background p-2">
                                      <p className="text-xs font-medium">驳回请求清单</p>
                                      <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground space-y-1">
                                        {item.verification.change_requests.map((request, idx) => (
                                          <li key={`${item.verification?.id || item.delivery.id}-req-${idx}`}>
                                            {request}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <>
                                  <label className="block space-y-1 text-xs">
                                    <span className="text-muted-foreground">驳回原因（Reject 时必填）</span>
                                    <input
                                      value={rejectReasons[item.delivery.id] || ""}
                                      onChange={(e) =>
                                        setRejectReasons((prev) => ({
                                          ...prev,
                                          [item.delivery.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border bg-background px-2 py-1"
                                    />
                                  </label>

                                  <label className="block space-y-1 text-xs">
                                    <span className="text-muted-foreground">
                                      驳回请求清单（每行一条，可为空）
                                    </span>
                                    <textarea
                                      rows={3}
                                      value={rejectChecklists[item.delivery.id] || ""}
                                      onChange={(e) =>
                                        setRejectChecklists((prev) => ({
                                          ...prev,
                                          [item.delivery.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border bg-background px-2 py-1"
                                      placeholder={"补充单元测试\n处理空输入边界\n补充变更说明"}
                                    />
                                  </label>

                                  <label className="block space-y-1 text-xs">
                                    <span className="text-muted-foreground">验收备注（可选）</span>
                                    <input
                                      value={rejectComments[item.delivery.id] || ""}
                                      onChange={(e) =>
                                        setRejectComments((prev) => ({
                                          ...prev,
                                          [item.delivery.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border bg-background px-2 py-1"
                                    />
                                  </label>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => approve(item.delivery.id, task.id)}
                                      disabled={verifyingDeliveryId === item.delivery.id}
                                      className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-60"
                                    >
                                      通过
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => reject(item.delivery.id, task.id)}
                                      disabled={verifyingDeliveryId === item.delivery.id}
                                      className="rounded border px-3 py-1 text-xs disabled:opacity-60"
                                    >
                                      驳回
                                    </button>
                                  </div>
                                </>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </TaskCard>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
