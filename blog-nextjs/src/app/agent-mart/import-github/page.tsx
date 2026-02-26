"use client";

import { useState } from "react";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import Link from "next/link";
import type { MartTaskType } from "@/types/agent-mart";

/* ── GitHub API types ── */

interface GitHubLabel {
  name: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: GitHubLabel[];
  user: { login: string } | null;
  pull_request?: unknown;
}

/* ── label → task type mapping ── */

const LABEL_TYPE_MAP: Record<string, MartTaskType> = {
  bug: "CODE",
  feature: "CODE",
  enhancement: "CODE",
  documentation: "DOC",
  docs: "DOC",
  test: "TEST",
  testing: "TEST",
  design: "DESIGN",
  data: "DATA",
};

function inferType(labels: GitHubLabel[]): MartTaskType {
  for (const l of labels) {
    const key = l.name.toLowerCase();
    if (LABEL_TYPE_MAP[key]) return LABEL_TYPE_MAP[key];
  }
  return "OTHER";
}

function extractTechStack(labels: GitHubLabel[]): string[] {
  const techKeywords = [
    "javascript", "typescript", "python", "rust", "go", "java", "react",
    "vue", "angular", "node", "nextjs", "tailwind", "docker", "kubernetes",
  ];
  return labels
    .map((l) => l.name.toLowerCase())
    .filter((n) => techKeywords.includes(n));
}

/* ── result type ── */

interface ImportResult {
  issueNumber: number;
  title: string;
  ok: boolean;
  error?: string;
}

/* ── component ── */

export default function ImportGitHubPage() {
  const auth = useMartAuthContext();
  const [repo, setRepo] = useState("");
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  /* ── fetch issues ── */
  async function handleFetch() {
    const trimmed = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (!/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
      setFetchError("请输入 owner/repo 格式，例如 vercel/next.js");
      return;
    }

    setFetchError(null);
    setIssues([]);
    setSelected(new Set());
    setResults(null);
    setFetching(true);

    try {
      const res = await fetch(
        `https://api.github.com/repos/${trimmed}/issues?state=open&per_page=100`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
      }
      const data: GitHubIssue[] = await res.json();
      // filter out pull requests
      setIssues(data.filter((i) => !i.pull_request));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  /* ── toggle selection ── */
  function toggle(num: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === issues.length) setSelected(new Set());
    else setSelected(new Set(issues.map((i) => i.number)));
  }

  /* ── import selected ── */
  async function handleImport() {
    if (selected.size === 0) return;
    const trimmed = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");

    setImporting(true);
    setResults(null);

    const batch: ImportResult[] = [];

    for (const issue of issues.filter((i) => selected.has(i.number))) {
      try {
        const res = await fetch("/api/agent-mart/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth.authHeaders },
          body: JSON.stringify({
            title: issue.title,
            description: issue.body || `GitHub Issue #${issue.number}`,
            source: "GITHUB",
            githubRepo: trimmed,
            githubIssueId: issue.number,
            type: inferType(issue.labels),
            techStack: extractTechStack(issue.labels),
            asDraft: true,
          }),
        });
        const json = await res.json();
        batch.push({
          issueNumber: issue.number,
          title: issue.title,
          ok: json.success === true,
          error: json.success ? undefined : json.error,
        });
      } catch (err) {
        batch.push({
          issueNumber: issue.number,
          title: issue.title,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setResults(batch);
    setImporting(false);
  }

  const successCount = results?.filter((r) => r.ok).length ?? 0;
  const failCount = results?.filter((r) => !r.ok).length ?? 0;

  /* ── not logged in ── */
  if (!auth.isAuthenticated) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%)]">
        <div className="container mx-auto px-4 py-10">
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-muted-foreground">
            请先前往{" "}
            <Link href="/agent-mart/login" className="font-medium text-primary hover:underline">
              登录页
            </Link>{" "}
            登录后再使用导入功能
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%)]">
      <section className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">导入 GitHub Issue</h1>
          <Link
            href="/agent-mart/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            返回工作台
          </Link>
        </div>

        {/* repo input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            placeholder="owner/repo，例如 vercel/next.js"
            className="flex-1 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching || !repo.trim()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {fetching ? "获取中…" : "获取 Issues"}
          </button>
        </div>

        {fetchError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {fetchError}
          </p>
        )}

        {/* issue list */}
        {issues.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {issues.length} 个 open issue，已选 {selected.size} 个
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selected.size === issues.length ? "取消全选" : "全选"}
              </button>
            </div>

            <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
              {issues.map((issue) => (
                <li key={issue.number}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={selected.has(issue.number)}
                      onChange={() => toggle(issue.number)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        <span className="mr-1.5 text-muted-foreground">#{issue.number}</span>
                        {issue.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {issue.labels.map((l) => (
                          <span
                            key={l.name}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {l.name}
                          </span>
                        ))}
                        {issue.user && (
                          <span className="text-[10px] text-muted-foreground">
                            by {issue.user.login}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {inferType(issue.labels)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {importing
                ? "导入中…"
                : `导入选中 (${selected.size})`}
            </button>
          </div>
        )}

        {issues.length === 0 && !fetching && !fetchError && repo.trim() && (
          <p className="rounded-xl border border-border/70 bg-card py-6 text-center text-sm text-muted-foreground">
            该仓库暂无 open issue
          </p>
        )}

        {/* results */}
        {results && (
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">
              导入完成：{successCount} 成功
              {failCount > 0 && <span className="text-red-500">，{failCount} 失败</span>}
            </h2>
            <ul className="space-y-1 text-sm">
              {results.map((r) => (
                <li key={r.issueNumber} className="flex items-center gap-2">
                  <span className={r.ok ? "text-emerald-600" : "text-red-500"}>
                    {r.ok ? "✓" : "✗"}
                  </span>
                  <span className="text-muted-foreground">#{r.issueNumber}</span>
                  <span className="truncate">{r.title}</span>
                  {r.error && (
                    <span className="ml-auto shrink-0 text-xs text-red-400">{r.error}</span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href="/agent-mart/dashboard"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              前往工作台查看草稿
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
