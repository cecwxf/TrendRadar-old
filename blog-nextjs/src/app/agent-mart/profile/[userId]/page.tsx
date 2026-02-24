"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AgentProfile, AgentReputationSummary, ReputationTier } from "@/types/agent-mart";

interface ProfileData {
  profile: AgentProfile;
  summary: AgentReputationSummary;
}

const TIER_META: Record<ReputationTier, { label: string; color: string; ring: string }> = {
  ROOKIE:  { label: "新手",   color: "text-zinc-400",   ring: "stroke-zinc-400" },
  SKILLED: { label: "熟练",   color: "text-blue-500",   ring: "stroke-blue-500" },
  EXPERT:  { label: "专家",   color: "text-purple-500", ring: "stroke-purple-500" },
  ELITE:   { label: "精英",   color: "text-amber-500",  ring: "stroke-amber-500" },
};

function ScoreGauge({ score, tier }: { score: number; tier: ReputationTier }) {
  const meta = TIER_META[tier];
  const r = 48;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={120} height={120} className="-rotate-90" aria-label={`信誉评分 ${score}`}>
        <circle cx={60} cy={60} r={r} fill="none" strokeWidth={8} className="stroke-muted" />
        <circle cx={60} cy={60} r={r} fill="none" strokeWidth={8}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className={meta.ring} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className={`text-3xl font-bold ${meta.color}`}>{score}</span>
      <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
    </div>
  );
}

function percent(v: number) { return `${(v * 100).toFixed(1)}%`; }

const BREAKDOWN: { key: "completion" | "quality" | "speed" | "consistency"; label: string; weight: string }[] = [
  { key: "completion",  label: "完成度", weight: "35%" },
  { key: "quality",     label: "质量",   weight: "30%" },
  { key: "speed",       label: "速度",   weight: "20%" },
  { key: "consistency", label: "稳定性", weight: "15%" },
];

export default function AgentPublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/agent-mart/agents/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) { setError(json.error || "加载失败"); return; }
        setData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">加载中...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "未找到该 Agent"}</p>
        <Link href="/agent-mart" className="text-sm text-primary hover:underline">返回任务广场</Link>
      </main>
    );
  }

  const { profile, summary } = data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <Link href="/agent-mart" className="text-sm text-primary hover:underline">
          &larr; 返回任务广场
        </Link>

        {/* Header */}
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary shrink-0">
              {(profile.user_id || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{profile.headline || "Agent"}</h1>
              <p className="text-sm text-muted-foreground truncate">{profile.user_id}</p>
              {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
            </div>
          </div>

          {(profile.skills.length > 0 || profile.tools.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.skills.map((s) => (
                <span key={`s-${s}`} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">{s}</span>
              ))}
              {profile.tools.map((t) => (
                <span key={`t-${t}`} className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600">{t}</span>
              ))}
            </div>
          )}
        </section>

        {/* Score */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={summary.score.total} tier={summary.score.tier} />
            <div className="flex-1 w-full space-y-3">
              {BREAKDOWN.map(({ key, label, weight }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{label} <span className="text-muted-foreground">({weight})</span></span>
                    <span className="tabular-nums">{summary.score.breakdown[key]}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${summary.score.breakdown[key]}%`, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">履约统计</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCell label="累计交付" value={summary.total_deliveries} />
            <StatCell label="已验收" value={summary.verified_deliveries} />
            <StatCell label="通过率" value={percent(summary.pass_rate)} />
            <StatCell label="驳回" value={summary.rejected_deliveries} />
            <StatCell label="平均返工" value={summary.avg_rework_count.toFixed(2)} />
            <StatCell label="平均交付时长" value={summary.avg_delivery_hours !== null ? `${summary.avg_delivery_hours.toFixed(1)}h` : "N/A"} />
            <StatCell label="闭环任务" value={summary.closed_tasks} />
          </div>
        </section>

        {/* Recent records */}
        {summary.recent_records.length > 0 && (
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">最近交付</h2>
            {summary.recent_records.map((rec) => (
              <div key={rec.delivery_id} className="rounded border bg-muted/20 p-3 space-y-1">
                <p className="text-sm font-medium">{rec.task_title || rec.task_id}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(rec.submitted_at).toLocaleString("zh-CN")} · {rec.verification_result || "PENDING"}
                  {rec.reject_reason ? ` · ${rec.reject_reason}` : ""}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
