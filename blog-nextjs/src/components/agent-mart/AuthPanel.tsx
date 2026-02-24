"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MartAuthState } from "@/components/agent-mart/useMartAuth";

interface AuthPanelProps {
  auth: MartAuthState;
  title?: string;
  description?: string;
}

export function AuthPanel({
  auth,
  title = "登录 Agent Mart",
  description = "使用 Supabase Auth 登录。任务发布、申请、审核都基于登录态权限。",
}: AuthPanelProps) {
  const inputCls =
    "w-full rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const modeLabel = useMemo(() => (mode === "signin" ? "登录" : "注册"), [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorCode = hashParams.get("error_code");
    const errorDescription = hashParams.get("error_description");

    if (errorCode === "otp_expired") {
      setNotice("邮箱验证链接已过期，请点击“重新发送验证邮件”。");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }

    if (hashParams.get("error")) {
      setNotice(errorDescription || "邮箱验证失败，请重试。");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setNotice("请输入邮箱和密码");
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const result =
        mode === "signin"
          ? await auth.signInWithPassword(email.trim(), password)
          : await auth.signUpWithPassword(email.trim(), password);

      if (!result.success) {
        setNotice(result.error || `${modeLabel}失败`);
        return;
      }

      const successNotice =
        "notice" in result && typeof result.notice === "string" ? result.notice : undefined;
      setNotice(successNotice || `${modeLabel}成功`);
      if (mode === "signup" && "notice" in result) {
        setPendingVerifyEmail(email.trim());
      }
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {auth.loading ? (
        <p className="text-sm text-muted-foreground">正在检查登录状态...</p>
      ) : auth.isAuthenticated ? (
        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-sm">已登录账号：{auth.email || "(no email)"}</p>
          <p className="text-xs text-muted-foreground break-all">User ID: {auth.userId}</p>
          <button
            type="button"
            onClick={async () => {
              const result = await auth.signOut();
              setNotice(result.success ? "已退出登录" : result.error || "退出失败");
            }}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
          >
            退出登录
          </button>
        </div>
      ) : (
        <>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                mode === "signin" ? "bg-primary text-primary-foreground" : "border"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                mode === "signup" ? "bg-primary text-primary-foreground" : "border"
              }`}
            >
              注册
            </button>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              required
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "处理中..." : modeLabel}
          </button>

          {(pendingVerifyEmail || mode === "signup") && !auth.isAuthenticated ? (
            <button
              type="button"
              disabled={resending || !((pendingVerifyEmail || email).trim())}
              onClick={async () => {
                const targetEmail = (pendingVerifyEmail || email).trim();
                if (!targetEmail) {
                  setNotice("请先输入邮箱");
                  return;
                }

                setResending(true);
                const result = await auth.resendSignUpConfirmation(targetEmail);
                if (!result.success) {
                  setNotice(result.error || "重发失败");
                } else {
                  setNotice(result.notice || "已重发验证邮件");
                  setPendingVerifyEmail(targetEmail);
                }
                setResending(false);
              }}
              className="ml-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-60"
            >
              {resending ? "发送中..." : "重新发送验证邮件"}
            </button>
          ) : null}
        </form>

        {/* Divider + GitHub OAuth */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t" />
          <span className="mx-3 text-xs text-muted-foreground">或</span>
          <div className="flex-grow border-t" />
        </div>

        <button
          type="button"
          onClick={async () => {
            const result = await auth.signInWithGitHub();
            if (!result.success) {
              setNotice(result.error || "GitHub 登录失败");
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub 登录
        </button>
        </>
      )}

      {auth.error && <p className="text-sm text-red-500">{auth.error}</p>}
      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  );
}
