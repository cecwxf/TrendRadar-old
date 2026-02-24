"use client";

import { useCallback, useEffect, useState } from "react";
import type { MartAuthState } from "@/components/agent-mart/useMartAuth";
import type { MartUserRole } from "@/types/agent-mart";

interface RolePanelProps {
  auth: MartAuthState;
  requiredRole?: MartUserRole;
  title?: string;
  description?: string;
}

export function RolePanel({
  auth,
  requiredRole,
  title = "角色设置",
  description = "选择你当前在 Agent Mart 的角色。",
}: RolePanelProps) {
  const inputCls =
    "w-full rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20";
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingRole, setSavingRole] = useState<MartUserRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshRole = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setCurrentRole(null);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/users/role", {
        headers: {
          ...auth.authHeaders,
        },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "加载角色失败");
        setCurrentRole(null);
        return;
      }

      const role = (json.data?.role as MartUserRole | undefined) || null;
      const fetchedName = (json.data?.display_name as string | undefined) || "";

      setCurrentRole(role);
      setDisplayName((prev) => prev || fetchedName);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(text);
      setCurrentRole(null);
    } finally {
      setLoading(false);
    }
  }, [auth.accessToken, auth.authHeaders, auth.isAuthenticated]);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  const setRole = async (role: MartUserRole) => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setMessage("请先登录");
      return;
    }

    setSavingRole(role);
    setMessage(null);

    try {
      const res = await fetch("/api/agent-mart/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth.authHeaders,
        },
        body: JSON.stringify({
          role,
          displayName: displayName || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || "设置角色失败");
        return;
      }

      setCurrentRole(role);
      setMessage(`当前角色已切换为 ${role}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingRole(null);
    }
  };

  const roleMismatch = Boolean(requiredRole && currentRole && currentRole !== requiredRole);

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {auth.isAuthenticated ? (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Display Name（可选）</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
              placeholder="显示名"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              disabled={savingRole !== null}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                currentRole === "buyer" ? "bg-primary text-primary-foreground" : "border"
              } disabled:opacity-60`}
            >
              {savingRole === "buyer" ? "设置中..." : "切到 buyer"}
            </button>
            <button
              type="button"
              onClick={() => setRole("agent")}
              disabled={savingRole !== null}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                currentRole === "agent" ? "bg-primary text-primary-foreground" : "border"
              } disabled:opacity-60`}
            >
              {savingRole === "agent" ? "设置中..." : "切到 agent"}
            </button>
            <button
              type="button"
              onClick={refreshRole}
              disabled={loading}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              {loading ? "刷新中..." : "刷新角色"}
            </button>
          </div>

          <div className="text-sm text-muted-foreground">
            当前角色：{currentRole || "未设置"}
            {requiredRole ? `（本页要求：${requiredRole}）` : ""}
          </div>

          {roleMismatch && (
            <p className="text-sm text-amber-600">
              你的角色与当前页面不匹配，请切换到 `{requiredRole}`。
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">请先登录。</p>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
