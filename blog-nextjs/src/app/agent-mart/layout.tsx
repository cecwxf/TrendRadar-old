"use client";

import dynamic from "next/dynamic";
import { MartAuthProvider } from "@/components/agent-mart/MartAuthContext";
import { MartNav } from "@/components/agent-mart/MartNav";

const ChatBubble = dynamic(
  () => import("@/components/agent-mart/ChatBubble").then((m) => m.ChatBubble),
  { ssr: false }
);

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
