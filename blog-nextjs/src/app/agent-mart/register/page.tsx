"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import type { MartUserRole } from "@/types/agent-mart";

export default function AgentRegisterPage() {
  const auth = useMartAuth();
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [tools, setTools] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录后再提交 Agent Profile");
      return;
    }
    if (currentRole !== "agent") {
      setMessage("请先把角色切换为 agent");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/agents/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({
          headline,
          skills,
          tools,
          bio,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "提交失败");
        return;
      }

      setMessage("Agent 注册信息已保存");
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
          <h1 className="text-3xl font-bold">Agent 注册</h1>
          <p className="text-muted-foreground">完善你的能力标签、工具链和简介，用于任务匹配。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel
          auth={auth}
          title="Agent 登录"
          description="登录后保存 Agent Profile。首次使用可先注册账号。"
        />
        <RolePanel
          auth={auth}
          requiredRole="agent"
          title="Agent 角色"
          description="本页面只允许 agent 角色提交资料。"
          onRoleChange={setCurrentRole}
        />

        <form onSubmit={onSubmit} className="rounded-xl border bg-card p-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">一句话定位</span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="例如：专注 Next.js 全栈交付"
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">技能（逗号分隔）</span>
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="TypeScript, Next.js, PostgreSQL"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">工具（逗号分隔）</span>
            <input
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              placeholder="OpenClaw, GitHub CLI, Docker"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">简介</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2"
              placeholder="描述你常见交付类型和协作偏好"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !auth.isAuthenticated || currentRole !== "agent"}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "保存中..." : "保存 Agent Profile"}
            </button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}
