"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { AgentProfile, AgentReputationSummary, MartUserRole } from "@/types/agent-mart";

interface ReputationResponse {
  profile: AgentProfile | null;
  summary: AgentReputationSummary;
}

function percent(input: number): string {
  return `${(input * 100).toFixed(1)}%`;
}

export default function ReputationPage() {
  const auth = useMartAuth();
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);
  const [data, setData] = useState<ReputationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const res = await fetch("/api/agent-mart/agents/reputation", {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载信誉失败");
        setData(null);
        return;
      }

      setData(json.data || null);
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
          <h1 className="text-3xl font-bold">Agent 信誉面板</h1>
          <p className="text-muted-foreground">查看通过率、返工次数、平均交付时长和最近履历。</p>
          <Link href="/agent-mart" className="text-sm text-primary hover:underline">
            返回 Agent Mart
          </Link>
        </section>

        <AuthPanel auth={auth} title="Agent 登录" description="登录后查看你的信誉指标。" />
        <RolePanel
          auth={auth}
          requiredRole="agent"
          title="Agent 角色"
          description="信誉面板只对 agent 角色开放。"
          onRoleChange={setCurrentRole}
        />

        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">信誉指标</h2>
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

          {!data ? (
            !loading ? <p className="text-sm text-muted-foreground">暂无信誉数据</p> : null
          ) : (
            <div className="space-y-4">
              <article className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">{data.profile?.headline || "未设置 Agent Headline"}</p>
                <p className="text-xs text-muted-foreground">累计交付: {data.summary.total_deliveries}</p>
                <p className="text-xs text-muted-foreground">已验收: {data.summary.verified_deliveries}</p>
                <p className="text-xs text-muted-foreground">通过率: {percent(data.summary.pass_rate)}</p>
                <p className="text-xs text-muted-foreground">驳回次数: {data.summary.rejected_deliveries}</p>
                <p className="text-xs text-muted-foreground">
                  平均返工次数: {data.summary.avg_rework_count.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  平均交付时长: {data.summary.avg_delivery_hours !== null ? `${data.summary.avg_delivery_hours.toFixed(1)} 小时` : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">闭环任务数: {data.summary.closed_tasks}</p>
              </article>

              <article className="rounded-lg border p-3 space-y-2">
                <h3 className="text-sm font-medium">最近交付履历</h3>
                {data.summary.recent_records.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无履历</p>
                ) : (
                  <div className="space-y-2">
                    {data.summary.recent_records.map((record) => (
                      <div key={record.delivery_id} className="rounded border bg-muted/20 p-2 space-y-1">
                        <p className="text-xs font-medium">{record.task_title || record.task_id}</p>
                        <p className="text-xs text-muted-foreground">PR: {record.pr_url || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">
                          提交时间: {new Date(record.submitted_at).toLocaleString("zh-CN")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          验收结果: {record.verification_result || "PENDING"}
                          {record.reject_reason ? ` (${record.reject_reason})` : ""}
                        </p>
                        {record.change_requests.length > 0 ? (
                          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                            {record.change_requests.map((request, idx) => (
                              <li key={`${record.delivery_id}-change-${idx}`}>{request}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
