"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useMartAuthContext } from "./MartAuthContext";
import { useTaskChat } from "@/hooks/agent-mart/useTaskChat";
import type { MartTask } from "@/types/agent-mart";

/* ── tiny helpers ── */

function formatTs(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

/* ── task picker item ── */

interface ChatTask {
  id: string;
  title: string;
  buyer_user_id: string;
}

/* ── inner chat panel (handles one task) ── */

function ChatPanel({ task, userId, authHeaders }: { task: ChatTask; userId: string; authHeaders: Record<string, string> }) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const chat = useTaskChat({
    taskId: task.id,
    userId,
    authHeaders,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    chat.sendMessage(text.trim());
    setText("");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* status bar */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {chat.loading ? "加载中..." : `${chat.messages.length} 条消息`}
        {chat.error && <span className="ml-auto text-red-500 truncate">{chat.error}</span>}
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chat.messages.length === 0 && !chat.loading && (
          <p className="text-center text-xs text-muted-foreground pt-8">暂无消息</p>
        )}
        {chat.messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  isMe ? "bg-primary/10" : "bg-muted/40"
                }`}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium">
                    {isMe ? "我" : `${msg.sender_id.slice(0, 8)}...`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatTs(msg.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* input */}
      <form className="flex gap-2 border-t border-border/60 p-2" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入消息..."
          className="flex-1 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          发送
        </button>
      </form>
    </div>
  );
}

/* ── main bubble ── */

export function ChatBubble() {
  const auth = useMartAuthContext();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<ChatTask[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingTasks, setLoadingTasks] = useState(false);

  /* fetch user's related tasks (buyer + agent) */
  const loadTasks = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.accessToken) return;
    setLoadingTasks(true);
    try {
      // buyer tasks
      const buyerRes = await fetch("/api/agent-mart/tasks/my", {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });
      const buyerJson = await buyerRes.json();
      const buyerTasks: ChatTask[] = (buyerJson.data?.tasks || []).map((t: MartTask) => ({
        id: t.id,
        title: t.title,
        buyer_user_id: t.buyer_user_id,
      }));

      // agent tasks (from applications)
      const agentRes = await fetch("/api/agent-mart/tasks/my?role=agent", {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });
      const agentJson = await agentRes.json();
      const agentTasks: ChatTask[] = (agentJson.data?.applications || [])
        .filter((a: { task: MartTask | null }) => a.task)
        .map((a: { task: MartTask }) => ({
          id: a.task.id,
          title: a.task.title,
          buyer_user_id: a.task.buyer_user_id,
        }));

      // deduplicate by id
      const map = new Map<string, ChatTask>();
      [...buyerTasks, ...agentTasks].forEach((t) => map.set(t.id, t));
      const all = Array.from(map.values());
      setTasks(all);
      if (all.length > 0 && !selectedId) setSelectedId(all[0].id);
    } catch {
      // silent
    } finally {
      setLoadingTasks(false);
    }
  }, [auth.isAuthenticated, auth.accessToken, auth.authHeaders, selectedId]);

  useEffect(() => {
    if (open) loadTasks();
  }, [open, loadTasks]);

  if (!auth.isAuthenticated) return null;

  const selectedTask = tasks.find((t) => t.id === selectedId);

  return (
    <>
      {/* floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="打开聊天"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {/* chat window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl">
          {/* header with task selector */}
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
            <span className="text-sm font-semibold shrink-0">聊天</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 truncate rounded-lg border border-border/70 bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40"
            >
              {loadingTasks && <option>加载中...</option>}
              {!loadingTasks && tasks.length === 0 && <option>暂无任务</option>}
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title.length > 24 ? t.title.slice(0, 24) + "..." : t.title}
                </option>
              ))}
            </select>
          </div>

          {/* chat body */}
          {selectedTask ? (
            <ChatPanel key={selectedTask.id} task={selectedTask} userId={auth.userId!} authHeaders={auth.authHeaders} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {loadingTasks ? "加载任务中..." : "暂无可聊天的任务"}
            </div>
          )}
        </div>
      )}
    </>
  );
}
