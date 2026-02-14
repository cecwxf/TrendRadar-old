/**
 * 网站顶部导航栏
 *
 * 包含 Logo、主题切换、RSS 订阅链接、移动菜单
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Rss, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="text-xl font-bold">空间超算精选</span>
          </Link>

          {/* 桌面端导航和操作 */}
          <div className="hidden md:flex items-center gap-4">
            {/* 导航链接 */}
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                首页
              </Link>
              <Link
                href="/market"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                市场
              </Link>
            </nav>

            {/* RSS 订阅 */}
            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="RSS 订阅"
              title="RSS 订阅"
            >
              <Rss className="h-5 w-5 text-foreground" />
            </a>

            {/* 主题切换 */}
            <ThemeToggle />
          </div>

          {/* 移动端操作 */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="RSS 订阅"
            >
              <Rss className="h-5 w-5 text-foreground" />
            </a>
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="切换菜单"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fadeIn">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                首页
              </Link>
              <Link
                href="/market"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                市场
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
