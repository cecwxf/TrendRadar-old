/**
 * Supabase 连接测试端点
 *
 * 访问 /api/test-supabase 来验证 Supabase 配置是否正确
 */

import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, TABLE_NAMES } from '@/lib/supabase/client';

export async function GET() {
  const startTime = Date.now();

  try {
    // 检查环境变量
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!hasUrl) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL 未配置',
        hint: '请在 .env.local 中添加 NEXT_PUBLIC_SUPABASE_URL'
      }, { status: 500 });
    }

    if (!hasAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置',
        hint: '请在 .env.local 中添加 NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }, { status: 500 });
    }

    if (!hasServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY 未配置',
        hint: '请在 .env.local 中添加 SUPABASE_SERVICE_ROLE_KEY（用于数据写入）'
      }, { status: 500 });
    }

    if (!supabase || !supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 客户端初始化失败',
        hint: '请检查环境变量配置是否正确'
      }, { status: 500 });
    }

    // 测试数据库连接 - 查询每个表的记录数
    const tableCounts: Record<string, number | string> = {};

    for (const [key, tableName] of Object.entries(TABLE_NAMES)) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tableCounts[tableName] = `Error: ${error.message}`;
        } else {
          tableCounts[tableName] = count || 0;
        }
      } catch (error: any) {
        tableCounts[tableName] = `Error: ${error.message}`;
      }
    }

    // 测试写入权限
    let canWrite = false;
    try {
      // 尝试插入一条测试数据（然后立即删除）
      const testData = {
        symbol: 'TEST',
        price: 0.01,
        price_change_24h: 0,
        volume_24h: 0,
        exchange: 'Test',
        timestamp: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from(TABLE_NAMES.CRYPTO_DATA)
        .insert(testData)
        .select()
        .single();

      if (insertError) {
        console.warn('写入测试失败:', insertError);
      } else if (inserted) {
        canWrite = true;
        // 删除测试数据
        await supabaseAdmin
          .from(TABLE_NAMES.CRYPTO_DATA)
          .delete()
          .eq('id', inserted.id);
      }
    } catch (error) {
      console.warn('写入权限测试异常:', error);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Supabase 连接成功！',
      tables: tableCounts,
      permissions: {
        read: true,
        write: canWrite,
      },
      env: {
        hasUrl: true,
        hasAnonKey: true,
        hasServiceKey: true,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      responseTime: `${duration}ms`,
      hint: canWrite
        ? '所有功能正常，可以开始使用'
        : '读取正常，但写入权限测试失败（可能是 RLS 策略问题）',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString(),
      responseTime: `${duration}ms`,
      hint: '请检查 Supabase 项目是否正确配置，并且数据库表已创建',
    }, { status: 500 });
  }
}
