/**
 * 网站顶部导航栏
 *
 * 包含 Logo、主题切换、RSS 订阅链接、移动菜单
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Twitter, Menu, X, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useLanguage, type Lang } from "@/components/language/LanguageProvider";

const NAV_LABELS: Record<string, Record<string, string>> = {
  home: { zh: "首页", en: "Home", vi: "Trang chủ", de: "Startseite" },
  market: { zh: "市场", en: "Market", vi: "Thị trường", de: "Markt" },
  agentMart: { zh: "Agent广场", en: "Agent Mart", vi: "Agent Mart", de: "Agent Mart" },
  llm: { zh: "LLM排行榜", en: "LLM Rankings", vi: "Bảng xếp hạng LLM", de: "LLM-Rangliste" },
  chips: { zh: "AI芯片榜", en: "AI Chip Rankings", vi: "Bảng chip AI", de: "KI-Chip-Ranking" },
};

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "zh", label: "简体中文" },
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "de", label: "Deutsch" },
];

const LANG_SHORT: Record<Lang, string> = {
  zh: "中文",
  en: "EN",
  vi: "VI",
  de: "DE",
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { lang, setLang } = useLanguage();
  const langMenuRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node) &&
        mobileLangRef.current &&
        !mobileLangRef.current.contains(e.target as Node)
      ) {
        setLangMenuOpen(false);
      }
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node) &&
        !mobileLangRef.current
      ) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <Image
              src="/logo.png"
              alt="智展AI"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
              priority
            />
            <span className="text-xl font-bold">智展AI</span>
          </Link>

          {/* 桌面端导航和操作 */}
          <div className="hidden md:flex items-center gap-4">
            {/* 导航链接 */}
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {NAV_LABELS.home[lang]}
              </Link>
              <Link
                href="/market"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {NAV_LABELS.market[lang]}
              </Link>
              <Link
                href="/agent-mart"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {NAV_LABELS.agentMart[lang]}
              </Link>
              <Link
                href="/llm"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {NAV_LABELS.llm[lang]}
              </Link>
              <Link
                href="/chips"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {NAV_LABELS.chips[lang]}
              </Link>
            </nav>

            {/* Language selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 rounded-lg p-2 hover:bg-muted transition-colors text-sm font-medium"
                aria-label="Switch language"
              >
                <Globe className="h-4 w-4" />
                <span>{LANG_SHORT[lang]}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-1 min-w-[140px] rounded-lg border border-border bg-background shadow-lg z-50">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setLang(opt.code);
                        setLangMenuOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        lang === opt.code
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* X (Twitter) */}
            <a
              href="https://x.com/metawxf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="X (Twitter)"
              title="X (Twitter)"
            >
              <Twitter className="h-5 w-5 text-foreground" />
            </a>

            {/* 主题切换 */}
            <ThemeToggle />
          </div>

          {/* 移动端操作 */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile language selector */}
            <div className="relative" ref={mobileLangRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="rounded-lg p-2 hover:bg-muted transition-colors"
                aria-label="Switch language"
              >
                <Globe className="h-5 w-5" />
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-1 min-w-[140px] rounded-lg border border-border bg-background shadow-lg z-50">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setLang(opt.code);
                        setLangMenuOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        lang === opt.code
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a
              href="https://x.com/metawxf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="h-5 w-5 text-foreground" />
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
                {NAV_LABELS.home[lang]}
              </Link>
              <Link
                href="/market"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {NAV_LABELS.market[lang]}
              </Link>
              <Link
                href="/agent-mart"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {NAV_LABELS.agentMart[lang]}
              </Link>
              <Link
                href="/llm"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {NAV_LABELS.llm[lang]}
              </Link>
              <Link
                href="/chips"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {NAV_LABELS.chips[lang]}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
