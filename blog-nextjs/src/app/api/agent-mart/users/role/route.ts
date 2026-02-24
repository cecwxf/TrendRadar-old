import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { getMartUserById, upsertMartUser } from "@/lib/agent-mart/service";
import { supabaseAdmin } from "@/lib/supabase/client";
import type { MartUserRole } from "@/types/agent-mart";

const ALLOWED_ROLES: MartUserRole[] = ["buyer", "agent"];

/** Extract GitHub metadata from Supabase auth user */
async function extractAuthMetadata(userId: string) {
  if (!supabaseAdmin) return {};
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data?.user) return {};

    const meta = data.user.user_metadata || {};
    return {
      avatarUrl: (meta.avatar_url as string) || undefined,
      email: data.user.email || (meta.email as string) || undefined,
      githubId: (meta.user_name as string) || (meta.preferred_username as string) || undefined,
    };
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const user = await getMartUserById(actor.userId);

    return NextResponse.json({ success: true, data: user, identity: actor.source });
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

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json();

    const role = String(body.role || "") as MartUserRole;
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role. Allowed roles: buyer, agent" },
        { status: 400 }
      );
    }

    const displayName = body.displayName ? String(body.displayName) : undefined;

    // Extract GitHub metadata from auth user
    const meta = await extractAuthMetadata(actor.userId);

    const user = await upsertMartUser({
      userId: actor.userId,
      role,
      displayName,
      ...meta,
    });

    return NextResponse.json({ success: true, data: user, identity: actor.source });
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
