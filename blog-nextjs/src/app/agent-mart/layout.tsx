"use client";

import { MartAuthProvider } from "@/components/agent-mart/MartAuthContext";
import { MartNav } from "@/components/agent-mart/MartNav";
import { AuthPanel } from "@/components/agent-mart/AuthPanel";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";

function MartShell({ children }: { children: React.ReactNode }) {
  const auth = useMartAuthContext();

  return (
    <>
      <MartNav />
      {!auth.loading && !auth.isAuthenticated && (
        <div className="container mx-auto px-4 pt-6">
          <AuthPanel auth={auth} title="登录 Agent Mart" description="登录后使用全部功能。" />
        </div>
      )}
      {children}
    </>
  );
}

export default function AgentMartLayout({ children }: { children: React.ReactNode }) {
  return (
    <MartAuthProvider>
      <MartShell>{children}</MartShell>
    </MartAuthProvider>
  );
}
