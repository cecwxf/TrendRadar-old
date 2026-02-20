"use client";

import Image from "next/image";

interface FooterLink {
  name: string;
  href: string;
  domain: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
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
  { name: "OpenClaw", href: "https://docs.openclaw.ai/",      domain: "docs.openclaw.ai" },
  { name: "OpenRouter", href: "https://openrouter.ai/",       domain: "openrouter.ai" },
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
  { name: "Linux Kernel 开发者", href: "https://docs.kernel.org/process/development-process.html", domain: "docs.kernel.org" },
  { name: "Android 开发者", href: "https://developer.android.com", domain: "developer.android.com" },
  { name: "地平线开发者论坛", href: "https://developer.horizon.auto/forum", domain: "developer.horizon.auto" },
  { name: "知乎",         href: "https://www.zhihu.com",           domain: "zhihu.com" },
];

function LinkItem({ link }: { link: FooterLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Image
        src={`https://www.google.com/s2/favicons?domain=${link.domain}&sz=48`}
        alt={`${link.name} icon`}
        width={24}
        height={24}
        className="h-6 w-6 rounded-sm flex-shrink-0"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <span>{link.name}</span>
    </a>
  );
}

function LinkSection({ section }: { section: FooterSection }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{section.title}</h3>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-1">
        {section.links.map((link) => (
          <LinkItem key={link.name} link={link} />
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const sections: FooterSection[] = [
    { title: "AI 工具", links: aiLinks },
    { title: "行情与资讯", links: financeLinks },
    { title: "开发者生态", links: devLinks },
  ];

  return (
    <footer className="border-t border-border/40 mt-16 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <LinkSection key={section.title} section={section} />
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; 2025 智展AI
        </p>
      </div>
    </footer>
  );
}
