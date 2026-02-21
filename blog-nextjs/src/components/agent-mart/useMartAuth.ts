"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function useMartAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const client = getSupabaseBrowserClient();

    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;

        if (sessionError) {
          setError(sessionError.message);
        }

        setSession(data.session || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const accessToken = session?.access_token || "";
  const userId = session?.user?.id || "";
  const email = session?.user?.email || "";

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }, [accessToken]);

  type AuthActionResult =
    | { success: true; notice?: string }
    | { success: false; error: string };

  const signInWithPassword = async (emailInput: string, password: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();

    const { error: signInError } = await client.auth.signInWithPassword({
      email: emailInput,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return { success: false, error: signInError.message } satisfies AuthActionResult;
    }

    return { success: true } satisfies AuthActionResult;
  };

  const signUpWithPassword = async (emailInput: string, password: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();

    const { data, error: signUpError } = await client.auth.signUp({
      email: emailInput,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return { success: false, error: signUpError.message } satisfies AuthActionResult;
    }

    if (!data.session) {
      return {
        success: true,
        notice: "注册成功，请到邮箱完成验证后再登录。",
      } satisfies AuthActionResult;
    }

    return { success: true, notice: "注册并登录成功" } satisfies AuthActionResult;
  };

  const signOut = async () => {
    setError(null);
    const client = getSupabaseBrowserClient();

    const { error: signOutError } = await client.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return { success: false, error: signOutError.message } satisfies AuthActionResult;
    }

    return { success: true } satisfies AuthActionResult;
  };

  return {
    session,
    loading,
    error,
    isAuthenticated: Boolean(session?.user),
    userId,
    email,
    accessToken,
    authHeaders,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}

export type MartAuthState = ReturnType<typeof useMartAuth>;
