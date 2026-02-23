"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMartAuthContext } from "./MartAuthContext";

const NAV_ITEMS = [
  { href: "/agent-mart", label: "任务广场" },
  { href: "/agent-mart/publish", label: "发布任务" },
  { href: "/agent-mart/dashboard", label: "工作台" },
  { href: "/agent-mart/reputation", label: "信誉面板" },
] as const;

export function MartNav() {
  const pathname = usePathname();
  const auth = useMartAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-6">
          <Link href="/agent-mart" className="text-lg font-bold tracking-tight">
            Agent Mart
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {auth.isAuthenticated ? (
            <>
              {auth.currentRole && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {auth.currentRole}
                </span>
              )}
              <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                {auth.email}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => auth.setRole("buyer")}
                  disabled={auth.roleLoading || auth.currentRole === "buyer"}
                  className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                    auth.currentRole === "buyer"
                      ? "bg-primary text-primary-foreground"
                      : "border hover:bg-muted"
                  } disabled:opacity-60`}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() => auth.setRole("agent")}
                  disabled={auth.roleLoading || auth.currentRole === "agent"}
                  className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                    auth.currentRole === "agent"
                      ? "bg-primary text-primary-foreground"
                      : "border hover:bg-muted"
                  } disabled:opacity-60`}
                >
                  Agent
                </button>
              </div>
              <button
                type="button"
                onClick={() => auth.signOut()}
                className="rounded-lg border px-2 py-1 text-xs hover:bg-muted"
              >
                退出
              </button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">未登录</span>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden rounded-lg border p-2 hover:bg-muted"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-2 bg-card">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
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

          <div className="border-t pt-2 mt-2 space-y-2">
            {auth.isAuthenticated ? (
              <>
                <p className="text-sm text-muted-foreground truncate">{auth.email}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => auth.setRole("buyer")}
                    disabled={auth.roleLoading}
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      auth.currentRole === "buyer" ? "bg-primary text-primary-foreground" : "border"
                    } disabled:opacity-60`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => auth.setRole("agent")}
                    disabled={auth.roleLoading}
                    className={`rounded-lg px-3 py-1.5 text-xs ${
                      auth.currentRole === "agent" ? "bg-primary text-primary-foreground" : "border"
                    } disabled:opacity-60`}
                  >
                    Agent
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { auth.signOut(); setMenuOpen(false); }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  退出登录
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">未登录</p>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
