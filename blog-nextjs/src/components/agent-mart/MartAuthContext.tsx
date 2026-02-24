"use client";

import { createContext, useContext } from "react";
import { useMartAuth, type MartAuthState } from "./useMartAuth";
import type { MartUserRole } from "@/types/agent-mart";
import { useCallback, useEffect, useState } from "react";

interface MartAuthContextValue extends MartAuthState {
  /** All roles the user has (dual-identity: typically ["buyer","agent"]) */
  roles: MartUserRole[];
  roleLoading: boolean;
  roleMessage: string | null;
  /** Ensure user is registered (auto-grants dual roles) */
  ensureRegistered: (displayName?: string) => Promise<void>;
  refreshRole: () => Promise<void>;
  /** Check if user has a specific role */
  hasRole: (role: MartUserRole) => boolean;
}

const MartAuthCtx = createContext<MartAuthContextValue | null>(null);

export function useMartAuthContext(): MartAuthContextValue {
  const ctx = useContext(MartAuthCtx);
  if (!ctx) throw new Error("useMartAuthContext must be used within MartAuthProvider");
  return ctx;
}

export function MartAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMartAuth();
  const [roles, setRoles] = useState<MartUserRole[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const refreshRole = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.accessToken) {
      setRoles([]);
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
        setRoles([]);
        return;
      }

      const userRoles: MartUserRole[] = Array.isArray(json.data?.roles) ? json.data.roles : [];
      setRoles(userRoles);
    } catch (error) {
      setRoleMessage(error instanceof Error ? error.message : String(error));
      setRoles([]);
    } finally {
      setRoleLoading(false);
    }
  }, [auth.accessToken, auth.authHeaders, auth.isAuthenticated]);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  const ensureRegistered = useCallback(
    async (displayName?: string) => {
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
          body: JSON.stringify({ displayName }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          setRoleMessage(json.error || "注册失败");
          return;
        }

        setRoles(["buyer", "agent"]);
        setRoleMessage(null);
      } catch (error) {
        setRoleMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setRoleLoading(false);
      }
    },
    [auth.accessToken, auth.authHeaders, auth.isAuthenticated],
  );

  const hasRole = useCallback((role: MartUserRole) => roles.includes(role), [roles]);

  return (
    <MartAuthCtx.Provider
      value={{
        ...auth,
        roles,
        roleLoading,
        roleMessage,
        ensureRegistered,
        refreshRole,
        hasRole,
      }}
    >
      {children}
    </MartAuthCtx.Provider>
  );
}
