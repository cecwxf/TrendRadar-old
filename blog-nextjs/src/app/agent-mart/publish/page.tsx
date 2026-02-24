"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import type { MartTaskType } from "@/types/agent-mart";

const TASK_TYPES: { value: MartTaskType; label: string }[] = [
  { value: "CODE", label: "编码开发" },
  { value: "TEST", label: "测试" },
  { value: "DOC", label: "文档" },
  { value: "DATA", label: "数据" },
  { value: "DESIGN", label: "设计" },
  { value: "OTHER", label: "其他" },
];

const labelCls = "text-xs font-semibold tracking-wide text-muted-foreground";
const inputCls =
  "w-full rounded-xl border border-border/80 bg-background/95 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

export default function PublishTaskPage() {
  const auth = useMartAuthContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<MartTaskType>("CODE");
  const [deadline, setDeadline] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [etaDays, setEtaDays] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [checklist, setChecklist] = useState("");
  const [notes, setNotes] = useState("");
  const [ciRequired, setCiRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ── tag helpers ── */
  const addTag = (raw: string) => {
    const t = raw.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));
  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  /* ── submit ── */
  const doSubmit = async (asDraft: boolean) => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录后再发布任务");
      return;
    }
    if (!auth.hasRole("buyer")) {
      setMessage("发布任务前请先注册 buyer 身份");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth.authHeaders },
        body: JSON.stringify({
          title,
          description,
          type: taskType,
          deadline: deadline || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          currency,
          etaDays: etaDays ? Number(etaDays) : undefined,
          techStack: tags,
          acceptance: { ciRequired, checklist, notes },
          asDraft,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "发布失败");
        return;
      }

      setMessage(asDraft ? "草稿已保存" : "任务发布成功");
      if (!asDraft) {
        setTitle("");
        setDescription("");
        setTaskType("CODE");
        setDeadline("");
        setBudgetMin("");
        setBudgetMax("");
        setEtaDays("");
        setTags([]);
        setTagInput("");
        setChecklist("");
        setNotes("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSubmit(false);
  };

  const canSubmit = auth.isAuthenticated && auth.hasRole("buyer") && !submitting;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_36%)]">
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur">
          <Link href="/agent-mart" className="inline-flex text-sm font-medium text-primary hover:underline">
            ← 返回 Agent Mart
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">发布任务</h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            填写目标、预算与验收标准，任务会进入广场等待 Agent 竞标。
          </p>
        </section>

        <AuthPanel auth={auth} title="Buyer 登录" description="登录后可发布任务并管理申请。" />
        <RolePanel
          auth={auth}
          requiredRole="buyer"
          title="Buyer 角色"
          description="本页面发布任务需要 buyer 角色。"
        />

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <label className="block space-y-1">
            <span className={labelCls}>任务标题 *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required />
          </label>

          <label className="block space-y-1">
            <span className={labelCls}>任务描述 *</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={inputCls}
              required
            />
          </label>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold">任务范围</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className={labelCls}>任务类型</span>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as MartTaskType)}
                  className={inputCls}
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className={labelCls}>截止日期</span>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="mb-3 text-sm font-semibold">预算与周期</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelCls}>最低预算</span>
                  <input type="number" min="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={inputCls} />
                </label>
                <label className="block space-y-1">
                  <span className={labelCls}>最高预算</span>
                  <input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={inputCls} />
                </label>
                <label className="block space-y-1">
                  <span className={labelCls}>币种</span>
                  <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={inputCls} />
                </label>
                <label className="block space-y-1">
                  <span className={labelCls}>交付天数</span>
                  <input type="number" min="1" value={etaDays} onChange={(e) => setEtaDays(e.target.value)} className={inputCls} />
                </label>
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-border/70 bg-muted/20 p-4">
              <span className={labelCls}>技术标签</span>
              <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border bg-background/90 px-2 py-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">×</button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  onBlur={() => addTag(tagInput)}
                  placeholder={tags.length ? "" : "输入后按 Enter 添加"}
                  className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">示例：React, Next.js, Python, LangChain</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <h3 className="text-sm font-semibold">验收标准</h3>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ciRequired} onChange={(e) => setCiRequired(e.target.checked)} />
              需要 CI 通过
            </label>

            <label className="block space-y-1">
              <span className={labelCls}>Checklist（逗号分隔）</span>
              <input
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
                className={inputCls}
                placeholder="新增单元测试, 更新文档"
              />
            </label>

            <label className="block space-y-1">
              <span className={labelCls}>备注</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "发布中..." : "发布任务"}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => doSubmit(true)}
              className="rounded-xl border px-5 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              保存草稿
            </button>
          </div>
          {message && (
            <p className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
