import { NextRequest, NextResponse } from "next/server";
import {
  getAgentProfileByUserId,
  getAgentReputationSummary,
  getMartUserById,
  getBuyerStats,
} from "@/lib/agent-mart/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const [profile, summary, user, buyerStats] = await Promise.all([
      getAgentProfileByUserId(userId),
      getAgentReputationSummary(userId),
      getMartUserById(userId),
      getBuyerStats(userId),
    ]);

    if (!profile && !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: profile || null,
        summary: profile ? summary : null,
        user: user || null,
        buyerStats,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
