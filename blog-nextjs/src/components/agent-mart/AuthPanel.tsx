"use client";

import { FormEvent, useMemo, useState } from "react";
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const modeLabel = useMemo(() => (mode === "signin" ? "登录" : "注册"), [mode]);

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
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {auth.loading ? (
        <p className="text-sm text-muted-foreground">正在检查登录状态...</p>
      ) : auth.isAuthenticated ? (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-sm">已登录账号：{auth.email || "(no email)"}</p>
          <p className="text-xs text-muted-foreground break-all">User ID: {auth.userId}</p>
          <button
            type="button"
            onClick={async () => {
              const result = await auth.signOut();
              setNotice(result.success ? "已退出登录" : result.error || "退出失败");
            }}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            退出登录
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-lg px-3 py-2 text-sm ${
                mode === "signin" ? "bg-primary text-primary-foreground" : "border"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm ${
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
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "处理中..." : modeLabel}
          </button>
        </form>
      )}

      {auth.error && <p className="text-sm text-red-500">{auth.error}</p>}
      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  );
}
