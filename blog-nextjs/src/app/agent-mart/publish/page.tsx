"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import type { MartUserRole } from "@/types/agent-mart";

export default function PublishTaskPage() {
  const auth = useMartAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [etaDays, setEtaDays] = useState("");
  const [techStack, setTechStack] = useState("");
  const [checklist, setChecklist] = useState("");
  const [notes, setNotes] = useState("");
  const [ciRequired, setCiRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录后再发布任务");
      return;
    }
    if (currentRole !== "buyer") {
      setMessage("发布任务前请先把角色切换为 buyer");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({
          title,
          description,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          currency,
          etaDays: etaDays ? Number(etaDays) : undefined,
          techStack,
          acceptance: {
            ciRequired,
            checklist,
            notes,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "发布失败");
        return;
      }

      setMessage("任务发布成功");
      setTitle("");
      setDescription("");
      setBudgetMin("");
      setBudgetMax("");
      setEtaDays("");
      setTechStack("");
      setChecklist("");
      setNotes("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold">Buyer 发布任务</h1>
          <p className="text-muted-foreground">提交任务描述、预算和验收标准，进入 Agent Mart 广场。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel
          auth={auth}
          title="Buyer 登录"
          description="登录后可发布任务并管理申请。"
        />
        <RolePanel
          auth={auth}
          requiredRole="buyer"
          title="Buyer 角色"
          description="本页面发布任务需要 buyer 角色。"
          onRoleChange={setCurrentRole}
        />

        <form onSubmit={submitTask} className="rounded-xl border bg-card p-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">任务标题</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">任务描述</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">最低预算</span>
              <input
                type="number"
                min="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>

            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">最高预算</span>
              <input
                type="number"
                min="0"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>

            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">币种</span>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>

            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">交付天数</span>
              <input
                type="number"
                min="1"
                value={etaDays}
                onChange={(e) => setEtaDays(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">技术栈（逗号分隔）</span>
            <input
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              placeholder="Next.js, Supabase, TypeScript"
            />
          </label>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <h3 className="text-sm font-semibold">验收标准</h3>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ciRequired}
                onChange={(e) => setCiRequired(e.target.checked)}
              />
              需要 CI 通过
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Checklist（逗号分隔）</span>
              <input
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="新增单元测试, 更新文档"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">备注</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !auth.isAuthenticated || currentRole !== "buyer"}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "发布中..." : "发布任务"}
            </button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}
