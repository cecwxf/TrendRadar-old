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
    default: "智展AI",
    template: "%s | 智展AI",
  },
  description: "我们反思成长，静静等待扭转乾坤",
  keywords: ["智展AI", "反思成长"],
  authors: [{ name: "智展AI" }],
  creator: "智展AI",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://your-domain.com",
    siteName: "智展AI",
    title: "智展AI",
    description: "我们反思成长，静静等待扭转乾坤",
  },
  twitter: {
    card: "summary_large_image",
    title: "智展AI",
    description: "我们反思成长，静静等待扭转乾坤",
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
