import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { verifyTaskDeliveryByBuyer } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function parseChangeRequests(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json().catch(() => ({}));
    const { id: deliveryId } = await context.params;

    const rejectReason = String(body.rejectReason || "").trim();
    if (!rejectReason) {
      return NextResponse.json(
        { success: false, error: "rejectReason is required" },
        { status: 400 }
      );
    }
    const rawChangeRequests = parseChangeRequests(body.changeRequests);
    const changeRequests =
      rawChangeRequests.length > 0 ? rawChangeRequests : [rejectReason];

    const verification = await verifyTaskDeliveryByBuyer({
      deliveryId,
      buyerUserId: actor.userId,
      result: "REJECTED",
      comment: body.comment ? String(body.comment) : undefined,
      rejectReason,
      changeRequests,
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
      message.includes("already verified") ||
      message.includes("required")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
