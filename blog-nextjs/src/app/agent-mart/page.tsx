"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TaskCard } from "@/components/agent-mart/TaskCard";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import type { MartTask, MartTaskStatus, MartTaskType } from "@/types/agent-mart";

/* ── filter / sort types ── */

type SortKey = "newest" | "budget_desc" | "deadline_asc" | "applications";

const BROWSABLE_STATUSES: MartTaskStatus[] = ["OPEN", "BIDDING"];
const ALL_TYPES: MartTaskType[] = ["CODE", "TEST", "DOC", "DATA", "DESIGN", "OTHER"];
const STATUS_FILTER_LABELS: Partial<Record<MartTaskStatus, string>> = {
  OPEN: "开放中",
  BIDDING: "竞标中",
};
const TYPE_LABELS: Record<MartTaskType, string> = {
  CODE: "开发",
  TEST: "测试",
  DOC: "文档",
  DATA: "数据",
  DESIGN: "设计",
  OTHER: "其他",
};
const SORT_LABELS: Record<SortKey, string> = {
  newest: "最新发布",
  budget_desc: "预算从高到低",
  deadline_asc: "截止日期最近",
  applications: "申请最多",
};

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
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  const loadTasks = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);

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

  const applyFilter = () => loadTasks(filters);
  const applyFilterAndClose = () => {
    applyFilter();
    setFilterOpen(false);
  };
  const clearFilterPatch = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    loadTasks(next);
  };

  const labelCls = "text-xs font-semibold tracking-wide text-muted-foreground";
  const inputCls =
    "w-full rounded-xl border border-border/80 bg-background/95 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20";
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (filters.q.trim()) {
      chips.push({
        key: "q",
        label: `关键词: ${filters.q.trim()}`,
        clear: () => clearFilterPatch({ q: "" }),
      });
    }
    if (filters.status && filters.status !== defaultFilters.status) {
      chips.push({
        key: "status",
        label: `状态: ${STATUS_FILTER_LABELS[filters.status] || filters.status}`,
        clear: () => clearFilterPatch({ status: "" }),
      });
    }
    if (filters.type) {
      chips.push({
        key: "type",
        label: `类型: ${TYPE_LABELS[filters.type]}`,
        clear: () => clearFilterPatch({ type: "" }),
      });
    }
    if (filters.tech.trim()) {
      chips.push({
        key: "tech",
        label: `技术: ${filters.tech.trim()}`,
        clear: () => clearFilterPatch({ tech: "" }),
      });
    }
    if (filters.minBudget || filters.maxBudget) {
      chips.push({
        key: "budget",
        label: `预算: ${filters.minBudget || "0"} - ${filters.maxBudget || "∞"}`,
        clear: () => clearFilterPatch({ minBudget: "", maxBudget: "" }),
      });
    }
    if (filters.sort !== defaultFilters.sort) {
      chips.push({
        key: "sort",
        label: `排序: ${SORT_LABELS[filters.sort]}`,
        clear: () => clearFilterPatch({ sort: defaultFilters.sort }),
      });
    }
    return chips;
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.10),transparent_40%)]">
      <div className="container mx-auto px-4 py-8 lg:py-10">
        <section className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">AgentMart 任务广场</h1>
              <p className="text-sm text-muted-foreground lg:text-base">
                浏览任务、快速筛选、直接竞标。核心路径保持三次点击内可达。
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  当前任务: {tasks.length}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  登录状态: {auth.isAuthenticated ? "已登录" : "未登录"}
                </span>
              </div>
            </div>
            {auth.isAuthenticated && (
              <Link
                href="/agent-mart/publish"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                + 发布任务
              </Link>
            )}
          </div>

          <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={filters.q}
              onChange={(e) => patchFilters({ q: e.target.value })}
              placeholder="搜索标题、描述、技术关键词"
              className={`${inputCls} sm:flex-1`}
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              搜索任务
            </button>
          </form>
        </section>

        <div className="mt-4 xl:hidden">
          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-2.5 text-sm font-semibold"
          >
            <span>筛选与排序</span>
            <span className="text-xs text-muted-foreground">
              {activeFilterChips.length > 0 ? `${activeFilterChips.length} 项已启用` : "未启用筛选"}
            </span>
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${filterOpen ? "block" : "hidden"} xl:sticky xl:top-36 xl:block xl:self-start`}>
            <div className="space-y-5 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
              <div>
                <p className="text-sm font-semibold">筛选器</p>
                <p className="text-xs text-muted-foreground">组合条件后点击“应用筛选”</p>
              </div>

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
                    <option key={s} value={s}>{STATUS_FILTER_LABELS[s] || s}</option>
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
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
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
                  onClick={applyFilterAndClose}
                  className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  应用筛选
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilters(defaultFilters);
                    loadTasks(defaultFilters);
                    setFilterOpen(false);
                  }}
                  className="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  重置
                </button>
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-4">
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground">当前筛选:</span>
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.clear}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary/90 transition-colors hover:bg-primary/10"
                  >
                    {chip.label}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
                加载中...
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            )}

            {!loading && tasks.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <p className="text-sm text-muted-foreground">暂无匹配任务，请调整筛选条件后重试。</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} linkable />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
