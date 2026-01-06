/**
 * Giscus 评论组件
 *
 * 基于 GitHub Discussions 的评论系统
 *
 * 配置步骤：
 * 1. 在 GitHub 仓库启用 Discussions
 * 2. 安装 Giscus App: https://github.com/apps/giscus
 * 3. 在 https://giscus.app/zh-CN 获取配置
 * 4. 配置环境变量
 */

"use client";

import Giscus from "@giscus/react";
import { useEffect, useState } from "react";

interface CommentsProps {
  slug: string;
}

export function Comments({ slug }: CommentsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-32 bg-muted/20 rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">加载评论中...</p>
      </div>
    );
  }

  // 从环境变量读取配置（可选，也可以硬编码）
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "";
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "";
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "General";
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "";

  if (!repo || !repoId || !categoryId) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">评论系统未配置</h3>
        <p className="text-sm text-muted-foreground mb-4">
          请配置 Giscus 环境变量以启用评论功能
        </p>
        <div className="text-left max-w-md mx-auto bg-muted/50 p-4 rounded">
          <p className="text-xs font-mono mb-2">需要配置：</p>
          <ul className="text-xs font-mono space-y-1">
            <li>NEXT_PUBLIC_GISCUS_REPO</li>
            <li>NEXT_PUBLIC_GISCUS_REPO_ID</li>
            <li>NEXT_PUBLIC_GISCUS_CATEGORY</li>
            <li>NEXT_PUBLIC_GISCUS_CATEGORY_ID</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="giscus-wrapper">
      <Giscus
        id="comments"
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        mapping="pathname"
        term={slug}
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="preferred_color_scheme"
        lang="zh-CN"
        loading="lazy"
      />
    </div>
  );
}
