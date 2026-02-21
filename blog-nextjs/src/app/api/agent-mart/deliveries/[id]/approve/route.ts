import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { verifyTaskDeliveryByBuyer } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json().catch(() => ({}));
    const { id: deliveryId } = await context.params;

    const verification = await verifyTaskDeliveryByBuyer({
      deliveryId,
      buyerUserId: actor.userId,
      result: "APPROVED",
      comment: body.comment ? String(body.comment) : undefined,
    });

    return NextResponse.json({ success: true, data: verification, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("access denied") ||
      message.includes("not found") ||
      message.includes("already verified")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
