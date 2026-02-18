"use client";

import { useLanguage } from "@/components/language/LanguageProvider";

interface FooterLink {
  name: string;
  href: string;
  domain: string;
}

const aiLinks: FooterLink[] = [
  { name: "ChatGPT",  href: "https://chat.openai.com",       domain: "openai.com" },
  { name: "OpenAI",   href: "https://openai.com",             domain: "openai.com" },
  { name: "Claude",   href: "https://claude.ai",              domain: "claude.ai" },
  { name: "Gemini",   href: "https://gemini.google.com",      domain: "gemini.google.com" },
  { name: "DeepSeek", href: "https://chat.deepseek.com",      domain: "deepseek.com" },
  { name: "Kimi",     href: "https://kimi.moonshot.cn",       domain: "kimi.moonshot.cn" },
  { name: "豆包",     href: "https://www.doubao.com",         domain: "doubao.com" },
  { name: "通义",     href: "https://tongyi.aliyun.com",      domain: "tongyi.aliyun.com" },
  { name: "智谱GLM",  href: "https://chatglm.cn",             domain: "chatglm.cn" },
];

const financeLinks: FooterLink[] = [
  { name: "Twitter/X", href: "https://x.com",            domain: "x.com" },
  { name: "Binance",   href: "https://www.binance.com",   domain: "binance.com" },
  { name: "OKX",       href: "https://www.okx.com",       domain: "okx.com" },
];

const devLinks: FooterLink[] = [
  { name: "GitHub",       href: "https://github.com",              domain: "github.com" },
  { name: "HuggingFace",  href: "https://huggingface.co",          domain: "huggingface.co" },
  { name: "魔塔社区",     href: "https://modelscope.cn",            domain: "modelscope.cn" },
  { name: "PyTorch",      href: "https://pytorch.org",             domain: "pytorch.org" },
  { name: "NVIDIA Dev",   href: "https://developer.nvidia.com",    domain: "developer.nvidia.com" },
  { name: "AMD ROCm",     href: "https://rocm.docs.amd.com",       domain: "amd.com" },
  { name: "地平线",       href: "https://developer.horizon.ai",    domain: "horizon.ai" },
  { name: "知乎",         href: "https://www.zhihu.com",           domain: "zhihu.com" },
];

const SECTION_LABELS: Record<string, Record<string, string>> = {
  ai: { zh: "AI 助手", en: "AI Assistants", vi: "Trợ lý AI", de: "KI-Assistenten" },
  finance: { zh: "金融", en: "Finance", vi: "Tài chính", de: "Finanzen" },
  dev: { zh: "开发者", en: "Developers", vi: "Nhà phát triển", de: "Entwickler" },
};

function LinkItem({ link }: { link: FooterLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${link.domain}&sz=32`}
        alt=""
        className="h-5 w-5 rounded-sm flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <span>{link.name}</span>
    </a>
  );
}

export function Footer() {
  const { lang } = useLanguage();

  return (
    <footer className="border-t border-border/40 mt-16 py-8">
      <div className="container mx-auto px-4">
        <p className="text-xs text-muted-foreground/60 text-center mb-3">{SECTION_LABELS.ai[lang] || SECTION_LABELS.ai.zh}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {aiLinks.map((link) => (
            <LinkItem key={link.name} link={link} />
          ))}
        </div>

        <div className="border-t border-border/30 my-3" />

        <p className="text-xs text-muted-foreground/60 text-center mb-3">{SECTION_LABELS.finance[lang] || SECTION_LABELS.finance.zh}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {financeLinks.map((link) => (
            <LinkItem key={link.name} link={link} />
          ))}
        </div>

        <div className="border-t border-border/30 my-3" />

        <p className="text-xs text-muted-foreground/60 text-center mb-3">{SECTION_LABELS.dev[lang] || SECTION_LABELS.dev.zh}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {devLinks.map((link) => (
            <LinkItem key={link.name} link={link} />
          ))}
        </div>

        <div className="border-t border-border/30 my-3" />

        <p className="text-xs text-muted-foreground text-center">
          &copy; 2025 智展AI
        </p>
      </div>
    </footer>
  );
}
