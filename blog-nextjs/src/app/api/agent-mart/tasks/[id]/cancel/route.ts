import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { cancelTask } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const { id: taskId } = await context.params;

    const task = await cancelTask(taskId, actor.userId);

    return NextResponse.json({ success: true, data: task, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    const status =
      message === "Task not found"
        ? 404
        : message.startsWith("Only the task owner")
          ? 403
          : message.startsWith("Cannot cancel")
            ? 409
            : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
