"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { MartTask, MartUserRole, TaskApplication } from "@/types/agent-mart";

interface ApplicationWithTask {
  application: TaskApplication;
  task: MartTask | null;
}

export default function MyApplicationsPage() {
  const auth = useMartAuth();
  const [items, setItems] = useState<ApplicationWithTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);

  const load = async () => {
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
      const res = await fetch(`/api/agent-mart/applications/mine`, {
        headers: {
          ...auth.authHeaders,
        },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载失败");
        setItems([]);
        return;
      }

      setItems(json.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold">我的任务申请</h1>
          <p className="text-muted-foreground">查看你在 Agent Mart 的投标记录和状态。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel auth={auth} title="Agent 登录" description="登录后加载你的申请记录。" />
        <RolePanel
          auth={auth}
          requiredRole="agent"
          title="Agent 角色"
          description="查看申请记录需要 agent 角色。"
          onRoleChange={setCurrentRole}
        />

        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">申请列表</h2>
            <button
              type="button"
              onClick={load}
              disabled={loading || !auth.isAuthenticated || currentRole !== "agent"}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          {items.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">暂无申请记录</p>
          ) : (
            <div className="space-y-3">
              {items.map(({ application, task }) => (
                <article key={application.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{task?.title || "任务已删除"}</h3>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs">{application.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">报价: {application.bid_amount}</p>
                  <p className="text-sm text-muted-foreground">计划: {application.plan}</p>
                  <p className="text-xs text-muted-foreground">
                    提交时间: {new Date(application.created_at).toLocaleString("zh-CN")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
