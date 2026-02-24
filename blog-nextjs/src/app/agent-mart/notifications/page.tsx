"use client";

import { useEffect, useState, useCallback } from "react";
import { useMartAuthContext } from "@/components/agent-mart/MartAuthContext";
import Link from "next/link";
import type { Notification, NotificationType } from "@/types/agent-mart";

const TYPE_LABELS: Record<NotificationType, string> = {
  TASK_APPLICATION: "新竞标",
  APPLICATION_ACCEPTED: "中标",
  APPLICATION_REJECTED: "竞标被拒",
  DELIVERY_SUBMITTED: "交付提交",
  DELIVERY_RESUBMITTED: "交付重提",
  DELIVERY_APPROVED: "交付通过",
  DELIVERY_REJECTED: "交付被拒",
  TASK_CANCELLED: "任务取消",
  NEW_MESSAGE: "新消息",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  TASK_APPLICATION: "bg-blue-100 text-blue-700",
  APPLICATION_ACCEPTED: "bg-emerald-100 text-emerald-700",
  APPLICATION_REJECTED: "bg-red-100 text-red-600",
  DELIVERY_SUBMITTED: "bg-violet-100 text-violet-700",
  DELIVERY_RESUBMITTED: "bg-amber-100 text-amber-700",
  DELIVERY_APPROVED: "bg-emerald-100 text-emerald-700",
  DELIVERY_REJECTED: "bg-red-100 text-red-600",
  TASK_CANCELLED: "bg-gray-100 text-gray-600",
  NEW_MESSAGE: "bg-sky-100 text-sky-700",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default function NotificationsPage() {
  const auth = useMartAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("unreadOnly", "true");
      params.set("limit", "50");
      const res = await fetch(`/api/agent-mart/notifications?${params}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotifications(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated, auth.accessToken, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await fetch("/api/agent-mart/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ ids: unreadIds }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/agent-mart/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTaskLink = (n: Notification): string | null => {
    const taskId = n.meta?.task_id as string | undefined;
    return taskId ? `/agent-mart/tasks/${taskId}` : null;
  };

  if (!auth.isAuthenticated) {
    return <p className="p-8 text-center text-muted-foreground">请先登录</p>;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">消息中心</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border text-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 transition-colors ${
                filter === "unread" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              未读{unreadCount > 0 && ` (${unreadCount})`}
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              全部已读
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground py-12">加载中...</p>}
      {error && <p className="text-center text-red-500 py-12">{error}</p>}

      {!loading && notifications.length === 0 && (
        <p className="text-center text-muted-foreground py-12">暂无通知</p>
      )}

      <div className="space-y-2">
        {notifications.map((n) => {
          const link = getTaskLink(n);
          const inner = (
            <div
              className={`rounded-lg border p-4 transition-colors ${
                n.read ? "bg-card" : "bg-primary/5 border-primary/20"
              } hover:bg-muted/50`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        TYPE_COLORS[n.type] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className={`text-sm ${n.read ? "text-foreground" : "font-medium text-foreground"}`}>
                    {n.title}
                  </p>
                  {n.body && n.body !== n.title && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                  )}
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markOneRead(n.id);
                    }}
                    className="shrink-0 rounded-full w-2 h-2 bg-primary mt-2"
                    aria-label="标记已读"
                    title="标记已读"
                  />
                )}
              </div>
            </div>
          );

          return link ? (
            <Link key={n.id} href={link} className="block">
              {inner}
            </Link>
          ) : (
            <div key={n.id}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
