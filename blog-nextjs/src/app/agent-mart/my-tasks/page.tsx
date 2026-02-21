"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { MartTask, MartUserRole, TaskApplication } from "@/types/agent-mart";

export default function MyTasksPage() {
  const auth = useMartAuth();
  const [tasks, setTasks] = useState<MartTask[]>([]);
  const [applicationsByTask, setApplicationsByTask] = useState<Record<string, TaskApplication[]>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);

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
      const res = await fetch(`/api/agent-mart/tasks/mine`, {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载任务失败");
        setTasks([]);
        return;
      }

      setTasks(json.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (taskId: string) => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }
    if (currentRole !== "buyer") {
      setMessage("请先把角色切换为 buyer");
      return;
    }

    try {
      const res = await fetch(`/api/agent-mart/tasks/${taskId}/applications`, {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载申请失败");
        return;
      }

      setApplicationsByTask((prev) => ({
        ...prev,
        [taskId]: json.data || [],
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const updateApplication = async (applicationId: string, status: "accept" | "reject", taskId: string) => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }
    if (currentRole !== "buyer") {
      setMessage("请先把角色切换为 buyer");
      return;
    }

    setUpdatingAppId(applicationId);
    setMessage(null);

    try {
      const res = await fetch(`/api/agent-mart/applications/${applicationId}/${status}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "操作失败");
        return;
      }

      setMessage(status === "accept" ? "已接受申请" : "已拒绝申请");
      await loadApplications(taskId);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdatingAppId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold">我的任务（Buyer）</h1>
          <p className="text-muted-foreground">查看你发布的任务，并处理 Agent 申请。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel auth={auth} title="Buyer 登录" description="登录后查看任务和处理申请。" />
        <RolePanel
          auth={auth}
          requiredRole="buyer"
          title="Buyer 角色"
          description="查看任务与处理申请需要 buyer 角色。"
          onRoleChange={setCurrentRole}
        />

        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">任务列表</h2>
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
            <p className="text-sm text-muted-foreground">暂无任务</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const applications = applicationsByTask[task.id] || [];

                return (
                  <TaskCard key={task.id} task={task}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => loadApplications(task.id)}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        查看申请 ({applications.length})
                      </button>
                    </div>

                    {applications.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {applications.map((app) => (
                          <div key={app.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium">Agent: {app.agent_user_id}</p>
                              <span className="rounded-full bg-muted px-3 py-1 text-xs">{app.status}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">报价: {app.bid_amount}</p>
                            <p className="text-sm text-muted-foreground">时长: {app.eta_days} 天</p>
                            <p className="text-sm text-muted-foreground">计划: {app.plan}</p>

                            {app.status === "PENDING" || app.status === "SHORTLISTED" ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateApplication(app.id, "accept", task.id)}
                                  disabled={updatingAppId === app.id}
                                  className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-60"
                                >
                                  接受
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateApplication(app.id, "reject", task.id)}
                                  disabled={updatingAppId === app.id}
                                  className="rounded-lg border px-3 py-2 text-xs disabled:opacity-60"
                                >
                                  拒绝
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
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
