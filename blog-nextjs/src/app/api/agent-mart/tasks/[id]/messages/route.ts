import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { sendTaskMessage, getTaskMessages } from "@/lib/agent-mart/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRequestActor(request);
    const { id: taskId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const before = searchParams.get("before") || undefined;

    const messages = await getTaskMessages(taskId, { limit, before });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRequestActor(request);
    const { id: taskId } = await context.params;
    const body = await request.json();

    const content = String(body.content || "").trim();
    if (!content) {
      return NextResponse.json({ success: false, error: "content is required" }, { status: 400 });
    }

    const msg = await sendTaskMessage({
      taskId,
      senderId: actor.userId,
      type: body.type || "TEXT",
      content,
    });

    return NextResponse.json({ success: true, data: msg, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
