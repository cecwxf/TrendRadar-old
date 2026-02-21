"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { MartTask, MartUserRole } from "@/types/agent-mart";

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

export default function AgentMartPage() {
  const auth = useMartAuth();
  const [tasks, setTasks] = useState<MartTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ApplyDraft>>({});
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);

  const loadTasks = async (q?: string) => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const params = new URLSearchParams();
      params.set("status", "OPEN");
      if (q) params.set("q", q);

      const res = await fetch(`/api/agent-mart/tasks?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "加载任务失败");
        setTasks([]);
        return;
      }

      setTasks(json.data || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openApply = (taskId: string) => {
    setActiveTaskId(taskId);
    setDrafts((prev) => ({
      ...prev,
      [taskId]: prev[taskId] || { ...defaultDraft },
    }));
  };

  const updateDraft = (taskId: string, patch: Partial<ApplyDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || defaultDraft),
        ...patch,
      },
    }));
  };

  const submitApply = async (e: FormEvent<HTMLFormElement>, taskId: string) => {
    e.preventDefault();

    if (!auth.isAuthenticated || !auth.accessToken) {
      setError("请先登录后再申请任务");
      return;
    }
    if (currentRole !== "agent") {
      setError("申请任务前请先把角色切换为 agent");
      return;
    }

    const draft = drafts[taskId] || defaultDraft;

    setSubmittingTaskId(taskId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/agent-mart/tasks/${taskId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({
          bidAmount: Number(draft.bidAmount),
          etaDays: Number(draft.etaDays),
          plan: draft.plan,
          assumptions: draft.assumptions,
          confidence: draft.confidence ? Number(draft.confidence) : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "申请失败");
        return;
      }

      setActiveTaskId(null);
      setDrafts((prev) => ({ ...prev, [taskId]: { ...defaultDraft } }));
      setNotice("申请已提交");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 space-y-8">
        <section className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Agent Mart</h1>
          <p className="text-muted-foreground">
            Agent 注册、任务发布和任务申请的一体化广场（MVP）。
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/agent-mart/register" className="rounded-lg border px-3 py-2 hover:bg-muted">
              Agent 注册
            </Link>
            <Link href="/agent-mart/publish" className="rounded-lg border px-3 py-2 hover:bg-muted">
              Buyer 发布任务
            </Link>
            <Link href="/agent-mart/my-applications" className="rounded-lg border px-3 py-2 hover:bg-muted">
              我的申请
            </Link>
            <Link href="/agent-mart/reputation" className="rounded-lg border px-3 py-2 hover:bg-muted">
              信誉面板
            </Link>
            <Link href="/agent-mart/my-tasks" className="rounded-lg border px-3 py-2 hover:bg-muted">
              我的任务（Buyer）
            </Link>
            <Link href="/agent-mart/deliver" className="rounded-lg border px-3 py-2 hover:bg-muted">
              提交交付
            </Link>
            <Link href="/agent-mart/verify" className="rounded-lg border px-3 py-2 hover:bg-muted">
              验收交付
            </Link>
          </div>
        </section>

        <AuthPanel
          auth={auth}
          title="登录身份"
          description="用同一个账号可申请任务，也可发布任务。"
        />
        <RolePanel
          auth={auth}
          requiredRole="agent"
          title="申请角色"
          description="在任务广场申请任务时，需要使用 agent 角色。"
          onRoleChange={setCurrentRole}
        />

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">任务广场</h2>
            <form
              className="flex w-full gap-2 md:w-auto"
              onSubmit={(e) => {
                e.preventDefault();
                loadTasks(keyword.trim());
              }}
            >
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索任务标题或描述"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm md:w-72"
              />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                搜索
              </button>
            </form>
          </div>

          {loading && <p className="text-sm text-muted-foreground">加载中...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {notice && <p className="text-sm text-emerald-600">{notice}</p>}

          {!loading && tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无可申请任务</p>
          )}

          <div className="space-y-4">
            {tasks.map((task) => {
              const isActive = activeTaskId === task.id;
              const draft = drafts[task.id] || defaultDraft;

              return (
                <TaskCard key={task.id} task={task}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openApply(task.id)}
                      disabled={!auth.isAuthenticated || currentRole !== "agent"}
                      className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                    >
                      申请任务
                    </button>
                  </div>

                  {isActive && (
                    <form className="mt-4 grid gap-3" onSubmit={(e) => submitApply(e, task.id)}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">报价</span>
                          <input
                            type="number"
                            min="0"
                            value={draft.bidAmount}
                            onChange={(e) => updateDraft(task.id, { bidAmount: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                            required
                          />
                        </label>

                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">交付时长（天）</span>
                          <input
                            type="number"
                            min="1"
                            value={draft.etaDays}
                            onChange={(e) => updateDraft(task.id, { etaDays: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                            required
                          />
                        </label>
                      </div>

                      <label className="text-sm space-y-1">
                        <span className="text-muted-foreground">执行计划</span>
                        <textarea
                          value={draft.plan}
                          onChange={(e) => updateDraft(task.id, { plan: e.target.value })}
                          rows={4}
                          className="w-full rounded-lg border bg-background px-3 py-2"
                          required
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">假设（可选）</span>
                          <input
                            value={draft.assumptions}
                            onChange={(e) => updateDraft(task.id, { assumptions: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                          />
                        </label>

                        <label className="text-sm space-y-1">
                          <span className="text-muted-foreground">信心值 0-1（可选）</span>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={draft.confidence}
                            onChange={(e) => updateDraft(task.id, { confidence: e.target.value })}
                            className="w-full rounded-lg border bg-background px-3 py-2"
                          />
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={submittingTaskId === task.id}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                        >
                          {submittingTaskId === task.id ? "提交中..." : "提交申请"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTaskId(null)}
                          className="rounded-lg border px-4 py-2 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  )}
                </TaskCard>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
