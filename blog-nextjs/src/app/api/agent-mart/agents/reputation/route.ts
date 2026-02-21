import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { getAgentProfileByUserId, getAgentReputationSummary } from "@/lib/agent-mart/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);

    const [profile, summary] = await Promise.all([
      getAgentProfileByUserId(actor.userId),
      getAgentReputationSummary(actor.userId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        summary,
      },
      identity: actor.source,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
