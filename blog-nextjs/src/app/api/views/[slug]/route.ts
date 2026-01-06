/**
 * 文章浏览量 API
 *
 * POST /api/views/[slug] - 增加浏览量
 * GET /api/views/[slug] - 获取浏览量
 */

import { NextRequest, NextResponse } from "next/server";
import { incrementViewCount, getViewCount } from "@/lib/market/market-service";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * 增加浏览量
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const success = await incrementViewCount(slug);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to increment view count" },
        { status: 500 }
      );
    }

    const count = await getViewCount(slug);

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 获取浏览量
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const count = await getViewCount(slug);

    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching view count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
