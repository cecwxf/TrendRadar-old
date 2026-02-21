import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

export interface RequestActor {
  userId: string;
  source: "supabase" | "header";
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  return match[1]?.trim() || null;
}

export async function getRequestActor(request: NextRequest): Promise<RequestActor | null> {
  const token = getBearerToken(request);

  if (token && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user?.id) {
      return { userId: data.user.id, source: "supabase" };
    }
  }

  // Development-only fallback for local debugging.
  if (process.env.AGENT_MART_ALLOW_HEADER_ID === "true") {
    const fallbackUserId =
      request.headers.get("x-agent-mart-user") || request.headers.get("x-user-id");
    if (fallbackUserId) {
      return { userId: fallbackUserId, source: "header" };
    }
  }

  return null;
}

export async function requireRequestActor(request: NextRequest): Promise<RequestActor> {
  const actor = await getRequestActor(request);

  if (!actor?.userId) {
    throw new Error("UNAUTHORIZED");
  }

  return actor;
}
