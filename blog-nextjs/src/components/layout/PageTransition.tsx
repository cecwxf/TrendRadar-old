/**
 * 页面过渡动画组件
 *
 * 为页面内容添加淡入动画
 */

"use client";

import { useEffect, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={mounted ? "animate-fadeIn" : "opacity-0"}>
      {children}
    </div>
  );
}
