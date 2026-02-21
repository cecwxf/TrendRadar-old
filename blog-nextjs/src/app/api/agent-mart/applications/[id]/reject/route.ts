import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { updateApplicationStatusByBuyer } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const { id: applicationId } = await context.params;

    const data = await updateApplicationStatusByBuyer({
      applicationId,
      buyerUserId: actor.userId,
      status: "REJECTED",
    });

    return NextResponse.json({ success: true, data, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("access denied") || message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
