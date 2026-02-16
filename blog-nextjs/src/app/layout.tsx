import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Header } from "@/components/layout/Header";
import "../styles/globals.css";
import "../styles/markdown.css";

// Inter 英文字体
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// TODO: Add LXGW WenKai font when font file is available
// Download from: https://github.com/lxgw/LxgwWenKai/releases
// const wenkai = localFont({
//   src: "../../public/fonts/LXGWWenKai-Regular.ttf",
//   variable: "--font-wenkai",
//   display: "swap",
// });

export const metadata: Metadata = {
  title: {
    default: "博客 - 空间超算",
    template: "%s | 空间超算",
  },
  description: "个人博客 - 我们反思成长，静静等待扭转乾坤",
  keywords: ["博客", "AI", "SaaS", "出海", "Next.js", "加密货币"],
  authors: [{ name: "空间超算" }],
  creator: "空间超算",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://your-domain.com",
    siteName: "空间超算",
    title: "空间超算",
    description: "个人博客 - 我们反思成长，静静等待扭转乾坤",
  },
  twitter: {
    card: "summary_large_image",
    title: "空间超算",
    description: "个人博客 - 我们反思成长，静静等待扭转乾坤",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
