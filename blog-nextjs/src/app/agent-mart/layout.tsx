"use client";

import { MartAuthProvider } from "@/components/agent-mart/MartAuthContext";
import { MartNav } from "@/components/agent-mart/MartNav";

function MartShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MartNav />
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
