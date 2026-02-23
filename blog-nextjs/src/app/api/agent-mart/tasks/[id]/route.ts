import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { getTaskById, updateTask } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const task = await getTaskById(taskId);

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const { id: taskId } = await context.params;
    const body = await request.json();

    const task = await updateTask({
      taskId,
      buyerUserId: actor.userId,
      title: body.title,
      description: body.description,
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
      currency: body.currency,
      etaDays: body.etaDays,
      techStack: body.techStack,
      acceptance: body.acceptance,
      type: body.type,
      deadline: body.deadline,
      githubRepo: body.githubRepo,
    });

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
          : message.startsWith("Cannot edit")
            ? 409
            : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
