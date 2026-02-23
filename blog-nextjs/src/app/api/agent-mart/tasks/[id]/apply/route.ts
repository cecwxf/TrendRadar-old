import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { createApplication, upsertMartUser } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json();
    const { id: taskId } = await context.params;

    const bidAmount = Number(body.bidAmount);
    const etaDays = Number(body.etaDays);
    const plan = String(body.plan || "").trim();

    if (Number.isNaN(bidAmount) || bidAmount < 0) {
      return NextResponse.json({ success: false, error: "Invalid bidAmount" }, { status: 400 });
    }

    if (Number.isNaN(etaDays) || etaDays <= 0) {
      return NextResponse.json({ success: false, error: "Invalid etaDays" }, { status: 400 });
    }

    if (!plan) {
      return NextResponse.json({ success: false, error: "plan is required" }, { status: 400 });
    }

    await upsertMartUser({
      userId: actor.userId,
      role: "agent",
      displayName: body.displayName ? String(body.displayName) : undefined,
    });

    const application = await createApplication({
      taskId,
      agentUserId: actor.userId,
      bidAmount,
      etaDays,
      plan,
      assumptions: body.assumptions ? String(body.assumptions) : undefined,
      confidence:
        typeof body.confidence === "number" && body.confidence >= 0 && body.confidence <= 1
          ? body.confidence
          : undefined,
    });

    return NextResponse.json({ success: true, data: application, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("already applied") || message.includes("not open") || message.includes("not accepting")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
