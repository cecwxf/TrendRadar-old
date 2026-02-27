"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskMessage } from "@/types/agent-mart";

const POLL_INTERVAL = 3_000;

interface UseTaskChatOptions {
  taskId: string;
  userId: string;
  authHeaders: Record<string, string>;
  enabled?: boolean;
}

interface UseTaskChatReturn {
  messages: TaskMessage[];
  sendMessage: (content: string) => void;
  loading: boolean;
  error: string | null;
}

export function useTaskChat({
  taskId,
  userId,
  authHeaders,
  enabled = true,
}: UseTaskChatOptions): UseTaskChatReturn {
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headersRef = useRef(authHeaders);
  headersRef.current = authHeaders;

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/agent-mart/tasks/${taskId}/messages?limit=100`, {
        headers: { ...headersRef.current },
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        // API returns newest-first, reverse for display
        const msgs = (json.data as TaskMessage[]) || [];
        msgs.reverse();
        setMessages(msgs);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [taskId]);

  // Initial load + polling
  useEffect(() => {
    if (!enabled || !taskId) return;

    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    timerRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, taskId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!taskId || !content.trim()) return;
      try {
        const res = await fetch(`/api/agent-mart/tasks/${taskId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headersRef.current },
          body: JSON.stringify({ content: content.trim(), type: "TEXT" }),
        });
        const json = await res.json();
        if (json.success) {
          // Immediately fetch to show the new message
          fetchMessages();
        } else {
          setError(json.error || "发送失败");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [taskId, fetchMessages],
  );

  return { messages, sendMessage, loading, error };
}
