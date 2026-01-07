/**
 * Notion API 连接测试端点
 *
 * 访问 /api/test-notion 来验证 Notion 配置是否正确
 */

import { NextResponse } from 'next/server';
import { getPosts } from '@/lib/notion/client';

export async function GET() {
  const startTime = Date.now();

  try {
    // 检查环境变量
    const hasToken = !!process.env.NOTION_TOKEN;
    const hasDatabaseId = !!process.env.NOTION_DATABASE_ID;

    if (!hasToken) {
      return NextResponse.json({
        success: false,
        error: 'NOTION_TOKEN 未配置',
        hint: '请在 Vercel 项目设置中添加 NOTION_TOKEN 环境变量'
      }, { status: 500 });
    }

    if (!hasDatabaseId) {
      return NextResponse.json({
        success: false,
        error: 'NOTION_DATABASE_ID 未配置',
        hint: '请在 Vercel 项目设置中添加 NOTION_DATABASE_ID 环境变量'
      }, { status: 500 });
    }

    // 尝试获取文章
    const posts = await getPosts();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Notion API 连接成功！',
      data: {
        postsCount: posts.length,
        posts: posts.map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          category: p.category,
          publishedAt: p.publishedAt
        })),
        responseTime: `${duration}ms`
      },
      env: {
        hasToken: true,
        hasDatabaseId: true,
        tokenPrefix: process.env.NOTION_TOKEN?.substring(0, 4) + '...'
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString(),
      responseTime: `${duration}ms`,
      hint: '请检查 Notion Integration 是否已连接到 Database'
    }, { status: 500 });
  }
}
