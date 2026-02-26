"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { P2PMessage, P2PConnectionState } from "@/lib/agent-mart/p2p/types";

interface UseP2PChatOptions {
  taskId: string;
  userId: string;
  buyerUserId: string;
  secret?: string;
  relayUrl?: string;
}

interface UseP2PChatReturn {
  messages: P2PMessage[];
  sendMessage: (content: string) => void;
  peerCount: number;
  connectionState: P2PConnectionState;
  error: string | null;
}

export function useP2PChat({
  taskId,
  userId,
  buyerUserId,
  secret,
  relayUrl,
}: UseP2PChatOptions): UseP2PChatReturn {
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [connectionState, setConnectionState] = useState<P2PConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<import("@/lib/agent-mart/p2p/swarm-client").SwarmClient | null>(null);
  const topicHexRef = useRef<string>("");

  // Connect to swarm on mount — dynamic imports keep sodium-native out of SSR bundle
  useEffect(() => {
    if (!taskId || !userId || !buyerUserId) return;

    let cancelled = false;

    async function init() {
      try {
        const [{ SwarmClient }, { deriveTopic, deriveSecret, toHex }, { getMessages }] =
          await Promise.all([
            import("@/lib/agent-mart/p2p/swarm-client"),
            import("@/lib/agent-mart/p2p/crypto"),
            import("@/lib/agent-mart/p2p/message-store"),
          ]);

        const sec = secret || (await deriveSecret(taskId, buyerUserId));
        const topicBuf = await deriveTopic(taskId, sec);
        const topicHex = toHex(topicBuf);
        topicHexRef.current = topicHex;

        // Load history from IndexedDB
        const history = await getMessages(topicHex);
        if (!cancelled) setMessages(history);

        const client = new SwarmClient(userId, relayUrl);
        clientRef.current = client;

        client.setOnStateChange((s) => {
          if (!cancelled) setConnectionState(s);
        });

        client.setOnPeerCount((n) => {
          if (!cancelled) setPeerCount(n);
        });

        client.setOnMessage((msg) => {
          if (cancelled) return;
          // Deduplicate by id
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          import("@/lib/agent-mart/p2p/message-store").then(({ saveMessage }) =>
            saveMessage(msg).catch(() => {})
          );
        });

        await client.connect(topicBuf);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setConnectionState("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, [taskId, userId, buyerUserId, secret, relayUrl]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!clientRef.current || !topicHexRef.current) return;

      const msg: P2PMessage = {
        t: "msg",
        topic: topicHexRef.current,
        data: content,
        id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ts: Date.now(),
        sender: userId,
      };

      // Optimistic update
      setMessages((prev) => [...prev, msg]);
      import("@/lib/agent-mart/p2p/message-store").then(({ saveMessage }) =>
        saveMessage(msg).catch(() => {})
      );

      // Send to peers
      clientRef.current.send(msg);
    },
    [userId],
  );

  return { messages, sendMessage, peerCount, connectionState, error };
}
