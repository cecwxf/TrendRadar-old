"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import type { MartTask, MartTaskStatus, MartTaskType } from "@/types/agent-mart";

/* ── filter / sort types ── */

type SortKey = "newest" | "budget_desc" | "deadline_asc" | "applications";

const BROWSABLE_STATUSES: MartTaskStatus[] = ["OPEN", "BIDDING"];
const ALL_TYPES: MartTaskType[] = ["CODE", "TEST", "DOC", "DATA", "DESIGN", "OTHER"];

interface Filters {
  q: string;
  status: MartTaskStatus | "";
  type: MartTaskType | "";
  tech: string;
  minBudget: string;
  maxBudget: string;
  sort: SortKey;
}

const defaultFilters: Filters = {
  q: "",
  status: "OPEN",
  type: "",
  tech: "",
  minBudget: "",
  maxBudget: "",
  sort: "newest",
};

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

/* ── client-side sort ── */

function sortTasks(tasks: MartTask[], key: SortKey): MartTask[] {
  const sorted = [...tasks];
  switch (key) {
    case "newest":
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "budget_desc":
      return sorted.sort((a, b) => (b.budget_max ?? 0) - (a.budget_max ?? 0));
    case "deadline_asc":
      return sorted.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    case "applications":
      return sorted.sort((a, b) => b.application_count - a.application_count);
    default:
      return sorted;
  }
}

/* ── component ── */

export default function AgentMartPage() {
  const auth = useMartAuthContext();
  const [tasks, setTasks] = useState<MartTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ApplyDraft>>({});
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const params = new URLSearchParams();
      if (f.status) params.set("status", f.status);
      if (f.type) params.set("type", f.type);
      if (f.q.trim()) params.set("q", f.q.trim());
      if (f.tech.trim()) params.set("tech", f.tech.trim());
      if (f.minBudget) params.set("minBudget", f.minBudget);
      if (f.maxBudget) params.set("maxBudget", f.maxBudget);

      const res = await fetch(`/api/agent-mart/tasks?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "加载任务失败");
        setTasks([]);
        return;
      }

      setTasks(sortTasks(json.data || [], f.sort));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    loadTasks(filters);
  };

  const patchFilters = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  /* ── apply helpers ── */

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
      [taskId]: { ...(prev[taskId] || defaultDraft), ...patch },
    }));
  };

  const submitApply = async (e: FormEvent<HTMLFormElement>, taskId: string) => {
    e.preventDefault();

    if (!auth.isAuthenticated || !auth.accessToken) {
      setError("请先登录后再申请任务");
      return;
    }
    if (auth.currentRole !== "agent") {
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
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
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

  const applyFilter = () => loadTasks(filters);

  const labelCls = "text-xs font-medium text-muted-foreground";
  const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* ── header + search ── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">任务广场</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={filters.q}
              onChange={(e) => patchFilters({ q: e.target.value })}
              placeholder="搜索标题或描述"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-64"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              搜索
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ── left sidebar filters ── */}
          <aside className="w-full shrink-0 space-y-5 rounded-xl border bg-card p-4 lg:w-60">
            <div className="space-y-1.5">
              <span className={labelCls}>状态</span>
              <select
                value={filters.status}
                onChange={(e) => {
                  patchFilters({ status: e.target.value as Filters["status"] });
                }}
                className={inputCls}
                aria-label="状态筛选"
              >
                <option value="">全部状态</option>
                {BROWSABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className={labelCls}>类型</span>
              <select
                value={filters.type}
                onChange={(e) => {
                  patchFilters({ type: e.target.value as Filters["type"] });
                }}
                className={inputCls}
                aria-label="类型筛选"
              >
                <option value="">全部类型</option>
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className={labelCls}>预算范围</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="最低"
                  value={filters.minBudget}
                  onChange={(e) => patchFilters({ minBudget: e.target.value })}
                  className={inputCls}
                  aria-label="最低预算"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="最高"
                  value={filters.maxBudget}
                  onChange={(e) => patchFilters({ maxBudget: e.target.value })}
                  className={inputCls}
                  aria-label="最高预算"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={labelCls}>技术标签</span>
              <input
                placeholder="如 React, Python"
                value={filters.tech}
                onChange={(e) => patchFilters({ tech: e.target.value })}
                className={inputCls}
                aria-label="技术标签筛选"
              />
            </div>

            <div className="space-y-1.5">
              <span className={labelCls}>排序</span>
              <select
                value={filters.sort}
                onChange={(e) => {
                  const key = e.target.value as SortKey;
                  patchFilters({ sort: key });
                  setTasks((prev) => sortTasks(prev, key));
                }}
                className={inputCls}
                aria-label="排序"
              >
                <option value="newest">最新发布</option>
                <option value="budget_desc">预算从高到低</option>
                <option value="deadline_asc">截止日期最近</option>
                <option value="applications">申请最多</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyFilter}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              >
                筛选
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters(defaultFilters);
                  loadTasks(defaultFilters);
                }}
                className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
              >
                重置
              </button>
            </div>
          </aside>

          {/* ── right content area ── */}
          <section className="min-w-0 flex-1 space-y-4">
            {/* status messages */}
            {loading && <p className="text-sm text-muted-foreground">加载中...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}

            {!loading && tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无匹配任务</p>
            )}

            {/* task grid */}
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {tasks.map((task) => {
                const isActive = activeTaskId === task.id;
                const draft = drafts[task.id] || defaultDraft;

                return (
                  <TaskCard key={task.id} task={task} linkable>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openApply(task.id)}
                        disabled={!auth.isAuthenticated || auth.currentRole !== "agent"}
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
                            rows={3}
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
      </div>
    </main>
  );
}
