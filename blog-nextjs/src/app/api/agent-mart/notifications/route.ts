import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import {
  createNotification,
  getNotifications,
  markNotificationsRead,
} from "@/lib/agent-mart/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const notifications = await getNotifications(actor.userId, { unreadOnly, limit });

    return NextResponse.json({ success: true, data: notifications, identity: actor.source });
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

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json();

    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
    }

    const notification = await createNotification({
      userId: body.userId || actor.userId,
      type: body.type || "SYSTEM",
      title,
      body: body.body || "",
      meta: body.meta,
    });

    return NextResponse.json({ success: true, data: notification, identity: actor.source });
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

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json();

    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "ids array is required" },
        { status: 400 }
      );
    }

    await markNotificationsRead(actor.userId, ids);

    return NextResponse.json({ success: true, identity: actor.source });
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
