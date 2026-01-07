/**
 * 清理旧数据 API
 *
 * GET /api/cleanup-old-data
 *
 * 删除所有旧的股票种子数据，保留最新的加密货币数据
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin, TABLE_NAMES } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase admin client not configured'
      }, { status: 500 });
    }

    // 删除所有股票数据（因为Yahoo Finance获取失败，只保留加密货币）
    const { data: deletedStocks, error: stockError } = await supabaseAdmin
      .from(TABLE_NAMES.STOCK_DATA)
      .delete()
      .neq('id', 0); // 删除所有记录

    if (stockError) {
      console.error('删除股票数据失败:', stockError);
    }

    // 也可以选择只删除旧的数据（保留最近1小时的）
    // const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // .lt('created_at', oneHourAgo)

    return NextResponse.json({
      success: true,
      message: '旧数据清理完成',
      deleted: {
        stocks: deletedStocks?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
