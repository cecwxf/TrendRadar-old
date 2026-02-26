"use client";

import { MartAuthProvider } from "@/components/agent-mart/MartAuthContext";
import { MartNav } from "@/components/agent-mart/MartNav";
import { ChatBubble } from "@/components/agent-mart/ChatBubble";

function MartShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MartNav />
      {children}
      <ChatBubble />
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
