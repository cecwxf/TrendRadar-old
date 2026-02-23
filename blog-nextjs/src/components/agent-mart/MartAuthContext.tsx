"use client";

import { createContext, useContext } from "react";
import { useMartAuth, type MartAuthState } from "./useMartAuth";
import type { MartUserRole } from "@/types/agent-mart";
import { useCallback, useEffect, useState } from "react";

interface MartAuthContextValue extends MartAuthState {
  currentRole: MartUserRole | null;
  roleLoading: boolean;
  roleMessage: string | null;
  setRole: (role: MartUserRole, displayName?: string) => Promise<void>;
  refreshRole: () => Promise<void>;
}

const MartAuthCtx = createContext<MartAuthContextValue | null>(null);

export function useMartAuthContext(): MartAuthContextValue {
  const ctx = useContext(MartAuthCtx);
  if (!ctx) throw new Error("useMartAuthContext must be used within MartAuthProvider");
  return ctx;
}

export function MartAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMartAuth();
  const [currentRole, setCurrentRole] = useState<MartUserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const refreshRole = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setCurrentRole(null);
      return;
    }

    setRoleLoading(true);
    setRoleMessage(null);

    try {
      const res = await fetch("/api/agent-mart/users/role", {
        headers: { ...auth.authHeaders },
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setRoleMessage(json.error || "加载角色失败");
        setCurrentRole(null);
        return;
      }

      setCurrentRole((json.data?.role as MartUserRole | undefined) || null);
    } catch (error) {
      setRoleMessage(error instanceof Error ? error.message : String(error));
      setCurrentRole(null);
    } finally {
      setRoleLoading(false);
    }
  }, [auth.accessToken, auth.authHeaders, auth.isAuthenticated]);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  const setRole = useCallback(
    async (role: MartUserRole, displayName?: string) => {
      if (!auth.isAuthenticated || !auth.accessToken) {
        setRoleMessage("请先登录");
        return;
      }

      setRoleLoading(true);
      setRoleMessage(null);

      try {
        const res = await fetch("/api/agent-mart/users/role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...auth.authHeaders,
          },
          body: JSON.stringify({ role, displayName }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          setRoleMessage(json.error || "设置角色失败");
          return;
        }

        setCurrentRole(role);
        setRoleMessage(`已切换为 ${role}`);
      } catch (error) {
        setRoleMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setRoleLoading(false);
      }
    },
    [auth.accessToken, auth.authHeaders, auth.isAuthenticated],
  );

  return (
    <MartAuthCtx.Provider
      value={{
        ...auth,
        currentRole,
        roleLoading,
        roleMessage,
        setRole,
        refreshRole,
      }}
    >
      {children}
    </MartAuthCtx.Provider>
  );
}
