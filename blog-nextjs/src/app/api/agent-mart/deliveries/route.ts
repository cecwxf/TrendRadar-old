import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { submitTaskDelivery, upsertMartUser } from "@/lib/agent-mart/service";
import type { DeliveryEvidence } from "@/types/agent-mart";

function parseEvidence(input: unknown): DeliveryEvidence {
  if (!input || typeof input !== "object") {
    throw new Error("evidence is required");
  }

  const raw = input as Record<string, unknown>;

  const prUrl = String(raw.pr_url || "").trim();
  const repoFullName = String(raw.repo_full_name || "").trim();
  const prNumber = Number(raw.pr_number);
  const commitSha = String(raw.commit_sha || "").trim();
  const selfCheck = String(raw.self_check || "").trim();

  if (!prUrl || !repoFullName || Number.isNaN(prNumber) || !commitSha || !selfCheck) {
    throw new Error("evidence missing required fields");
  }

  const evidence: DeliveryEvidence = {
    pr_url: prUrl,
    repo_full_name: repoFullName,
    pr_number: prNumber,
    commit_sha: commitSha,
    self_check: selfCheck,
  };

  if (raw.ci_evidence && typeof raw.ci_evidence === "object") {
    const ciUrl = String((raw.ci_evidence as Record<string, unknown>).ci_url || "").trim();
    if (ciUrl) {
      evidence.ci_evidence = { ci_url: ciUrl };
    }
  }

  if (raw.logs && typeof raw.logs === "object") {
    const logUrl = String((raw.logs as Record<string, unknown>).log_url || "").trim();
    if (logUrl) {
      evidence.logs = { log_url: logUrl };
    }
  }

  return evidence;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const body = await request.json();

    const taskId = String(body.taskId || "").trim();
    if (!taskId) {
      return NextResponse.json({ success: false, error: "taskId is required" }, { status: 400 });
    }

    const evidence = parseEvidence(body.evidence);

    await upsertMartUser({
      userId: actor.userId,
      role: "agent",
      displayName: body.displayName ? String(body.displayName) : undefined,
    });

    const delivery = await submitTaskDelivery({
      taskId,
      agentUserId: actor.userId,
      evidence,
    });

    return NextResponse.json({ success: true, data: delivery, identity: actor.source });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid bearer token" },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("required") ||
      message.includes("No accepted application") ||
      message.includes("deliverable") ||
      message.includes("not found")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
