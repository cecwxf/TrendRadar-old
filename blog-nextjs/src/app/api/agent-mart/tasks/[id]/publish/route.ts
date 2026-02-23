import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { publishDraftTask } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const { id: taskId } = await context.params;

    const task = await publishDraftTask(taskId, actor.userId);

    return NextResponse.json({ success: true, data: task, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("not found") ||
      message.includes("not the owner") ||
      message.includes("not in DRAFT")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
