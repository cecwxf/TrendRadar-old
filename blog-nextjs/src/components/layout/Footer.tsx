import Link from "next/link";

const financeLinks = [
  { name: "Twitter/X", href: "https://x.com" },
  { name: "Binance", href: "https://www.binance.com" },
  { name: "OKX", href: "https://www.okx.com" },
];

const devLinks = [
  { name: "GitHub", href: "https://github.com" },
  { name: "HuggingFace", href: "https://huggingface.co" },
  { name: "魔塔社区", href: "https://modelscope.cn" },
  { name: "PyTorch", href: "https://pytorch.org" },
  { name: "NVIDIA 开发者", href: "https://developer.nvidia.com" },
  { name: "AMD 开发者", href: "https://rocm.docs.amd.com" },
  { name: "地平线论坛", href: "https://developer.horizon.ai" },
  { name: "知乎", href: "https://www.zhihu.com" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-16 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          {financeLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
          {devLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          &copy; 2025 智展AI
        </p>
      </div>
    </footer>
  );
}
