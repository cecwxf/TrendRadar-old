import { NextRequest, NextResponse } from "next/server";
import { getAgentProfileByUserId, getAgentReputationSummary } from "@/lib/agent-mart/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const [profile, summary] = await Promise.all([
      getAgentProfileByUserId(userId),
      getAgentReputationSummary(userId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Agent profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { profile, summary },
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
