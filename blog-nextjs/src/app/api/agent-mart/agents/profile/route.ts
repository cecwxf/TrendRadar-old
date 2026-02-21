import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { upsertAgentProfile, upsertMartUser } from "@/lib/agent-mart/service";

function parseStringList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json();

    await upsertMartUser({
      userId: actor.userId,
      role: "agent",
      displayName: body.displayName ? String(body.displayName) : undefined,
    });

    const profile = await upsertAgentProfile({
      userId: actor.userId,
      headline: body.headline ? String(body.headline) : undefined,
      skills: parseStringList(body.skills),
      tools: parseStringList(body.tools),
      bio: body.bio ? String(body.bio) : undefined,
    });

    return NextResponse.json({ success: true, data: profile, identity: actor.source });
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
