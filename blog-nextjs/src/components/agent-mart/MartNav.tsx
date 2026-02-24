"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useMartAuthContext } from "./MartAuthContext";

const CORE_NAV_ITEMS = [
  { href: "/agent-mart", label: "任务广场" },
  { href: "/agent-mart/dashboard", label: "工作台" },
  { href: "/agent-mart/reputation", label: "信誉面板" },
] as const;

export function MartNav() {
  const pathname = usePathname();
  const auth = useMartAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    try {
      const res = await fetch("/api/agent-mart/notifications?unreadOnly=true&limit=99", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const json = await res.json();
      if (json.success) setUnreadCount(json.data?.length ?? 0);
    } catch {}
  }, [auth.isAuthenticated, auth.accessToken]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const navItems = auth.userId
    ? [...CORE_NAV_ITEMS, { href: `/agent-mart/profile/${auth.userId}`, label: "个人中心" }]
    : [...CORE_NAV_ITEMS];

  const isActive = (href: string) => {
    if (href.startsWith("/agent-mart/profile/")) return pathname.startsWith("/agent-mart/profile/");
    if (href === "/agent-mart") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-16 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3 lg:gap-6">
          <Link
            href="/agent-mart"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold tracking-tight text-primary"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            Agent Mart
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2.5">
          {auth.isAuthenticated && (
            <Link
              href="/agent-mart/publish"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              + 发布任务
            </Link>
          )}
          {auth.isAuthenticated && (
            <Link
              href="/agent-mart/notifications"
              className="relative rounded-lg p-1.5 transition-colors hover:bg-muted"
              aria-label="通知"
            >
              <svg className="h-5 w-5 text-foreground/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {auth.isAuthenticated ? (
            <>
              <span className="max-w-[180px] truncate text-sm text-muted-foreground">
                {auth.email}
              </span>
              <button
                type="button"
                onClick={() => auth.signOut()}
                className="rounded-lg border px-2 py-1 text-xs transition-colors hover:bg-muted"
              >
                退出
              </button>
            </>
          ) : (
            <Link
              href="/agent-mart/login"
              className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              登录
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg border p-2 transition-colors hover:bg-muted md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="space-y-2 border-t bg-card px-4 py-3 md:hidden">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {auth.isAuthenticated && (
            <Link
              href="/agent-mart/publish"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            >
              + 发布任务
            </Link>
          )}
          {auth.isAuthenticated && (
            <Link
              href="/agent-mart/notifications"
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === "/agent-mart/notifications"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              通知{unreadCount > 0 && ` (${unreadCount})`}
            </Link>
          )}

          <div className="mt-2 space-y-2 border-t pt-2">
            {auth.isAuthenticated ? (
              <>
                <p className="text-sm text-muted-foreground truncate">{auth.email}</p>
                <button
                  type="button"
                  onClick={() => { auth.signOut(); setMenuOpen(false); }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  退出登录
                </button>
              </>
            ) : (
              <Link
                href="/agent-mart/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg border px-3 py-2 text-sm hover:bg-muted"
              >
                去登录
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
