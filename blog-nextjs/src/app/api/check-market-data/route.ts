/**
 * 检查市场数据 API
 *
 * GET /api/check-market-data
 *
 * 直接从数据库读取最新数据，绕过所有缓存
 */

import { NextResponse } from 'next/server';
import { getLatestCryptoData, getLatestStockData } from '@/lib/market/market-service';

export const dynamic = 'force-dynamic'; // 强制动态渲染，不缓存
export const revalidate = 0; // 不缓存

export async function GET() {
  try {
    const [cryptoData, stockData] = await Promise.all([
      getLatestCryptoData(),
      getLatestStockData(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        crypto: {
          count: cryptoData.length,
          items: cryptoData.map(item => ({
            symbol: item.symbol,
            price: item.price,
            price_change_24h: item.price_change_24h,
            timestamp: item.timestamp,
          })),
        },
        stock: {
          count: stockData.length,
          items: stockData.map(item => ({
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            change_percent: item.change_percent,
            timestamp: item.timestamp,
          })),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
