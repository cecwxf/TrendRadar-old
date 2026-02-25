import { NextRequest, NextResponse } from "next/server";
import { expireNoOfferTasks } from "@/lib/agent-mart/service";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.nextUrl.searchParams.get("secret")
    || request.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await expireNoOfferTasks();
    return NextResponse.json({ success: true, expired: count });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
