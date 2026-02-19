import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request);
    const url = `${baseUrl}/api/ai-news?refresh=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "TrendRadar-Cron/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Failed to refresh ai-news: ${response.status}`,
          detail: text.slice(0, 500),
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "AI news snapshot refreshed",
      stats: data?.stats || null,
      updatedAt: data?.updatedAt || new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
