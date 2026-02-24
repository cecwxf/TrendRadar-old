"use client";

import Link from "next/link";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";

export default function AgentMartLoginPage() {
  const auth = useMartAuthContext();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%)]">
      <div className="container mx-auto max-w-xl px-4 py-8 space-y-6">
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur">
          <Link href="/agent-mart" className="inline-flex text-sm font-medium text-primary hover:underline">
            ← 返回 Agent Mart
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">登录</h1>
          <p className="text-sm text-muted-foreground">登录后可发布任务、申请任务、提交交付和查看工作台。</p>
        </section>
        <AuthPanel auth={auth} />
      </div>
    </main>
  );
}
