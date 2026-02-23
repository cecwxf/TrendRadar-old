"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { RolePanel } from "@/components/agent-mart/RolePanel";
import { useMartAuth } from "@/components/agent-mart/useMartAuth";
import type { AgentProfile, AgentReputationSummary, MartUserRole, ReputationTier } from "@/types/agent-mart";

interface ReputationResponse {
  profile: AgentProfile | null;
  summary: AgentReputationSummary;
}

function percent(input: number): string {
  return `${(input * 100).toFixed(1)}%`;
}

// ─── Tier helpers ────────────────────────────────────────────────

const TIER_META: Record<ReputationTier, { label: string; color: string; ring: string }> = {
  ROOKIE:  { label: "新手",   color: "text-zinc-400",   ring: "stroke-zinc-400" },
  SKILLED: { label: "熟练",   color: "text-blue-500",   ring: "stroke-blue-500" },
  EXPERT:  { label: "专家",   color: "text-purple-500", ring: "stroke-purple-500" },
  ELITE:   { label: "精英",   color: "text-amber-500",  ring: "stroke-amber-500" },
};

/** SVG donut gauge — 120×120, score 0~100 */
function ScoreGauge({ score, tier }: { score: number; tier: ReputationTier }) {
  const meta = TIER_META[tier];
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={120} height={120} className="-rotate-90" aria-label={`信誉评分 ${score}`}>
        <circle cx={60} cy={60} r={radius} fill="none" strokeWidth={8} className="stroke-muted" />
        <circle
          cx={60} cy={60} r={radius} fill="none" strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className={meta.ring}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className={`text-3xl font-bold ${meta.color}`}>{score}</span>
      <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
    </div>
  );
}

const BREAKDOWN_LABELS: { key: "completion" | "quality" | "speed" | "consistency"; label: string; weight: string }[] = [
  { key: "completion",  label: "完成度", weight: "35%" },
  { key: "quality",     label: "质量",   weight: "30%" },
  { key: "speed",       label: "速度",   weight: "20%" },
  { key: "consistency", label: "稳定性", weight: "15%" },
];

function BreakdownBars({ breakdown }: { breakdown: AgentReputationSummary["score"]["breakdown"] }) {
  return (
    <div className="space-y-3">
      {BREAKDOWN_LABELS.map(({ key, label, weight }) => {
        const value = breakdown[key];
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{label} <span className="text-muted-foreground">({weight})</span></span>
              <span className="tabular-nums">{value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${value}%`, transition: "width 0.5s ease" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
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
              {/* ── Score gauge + breakdown ── */}
              <article className="rounded-lg border p-4">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreGauge score={data.summary.score.total} tier={data.summary.score.tier} />
                  <div className="flex-1 w-full">
                    <BreakdownBars breakdown={data.summary.score.breakdown} />
                  </div>
                </div>
              </article>

              {/* ── Raw metrics ── */}
              <article className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">{data.profile?.headline || "未设置 Agent Headline"}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Stat label="累计交付" value={data.summary.total_deliveries} />
                  <Stat label="已验收" value={data.summary.verified_deliveries} />
                  <Stat label="通过率" value={percent(data.summary.pass_rate)} />
                  <Stat label="驳回" value={data.summary.rejected_deliveries} />
                  <Stat label="平均返工" value={data.summary.avg_rework_count.toFixed(2)} />
                  <Stat label="平均交付时长" value={data.summary.avg_delivery_hours !== null ? `${data.summary.avg_delivery_hours.toFixed(1)}h` : "N/A"} />
                  <Stat label="闭环任务" value={data.summary.closed_tasks} />
                </div>
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
