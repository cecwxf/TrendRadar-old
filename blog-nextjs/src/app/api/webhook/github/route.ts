import { NextRequest, NextResponse } from "next/server";
import { createTaskFromGitHubIssue, handlePRMerge } from "@/lib/agent-mart/service";
import type { GitHubWebhookIssuePayload, GitHubWebhookPRPayload } from "@/types/agent-mart";

async function verifySignature(request: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const digest = "sha256=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === digest;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const valid = await verifySignature(request, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (event === "issues") {
      const issuePayload = payload as GitHubWebhookIssuePayload;
      if (issuePayload.action === "opened") {
        const task = await createTaskFromGitHubIssue(issuePayload);
        return NextResponse.json({ success: true, action: "task_created", taskId: task.id });
      }
    }

    if (event === "pull_request") {
      const prPayload = payload as GitHubWebhookPRPayload;
      if (prPayload.action === "closed" && prPayload.pull_request.merged) {
        await handlePRMerge(prPayload);
        return NextResponse.json({ success: true, action: "pr_merge_handled" });
      }
    }

    return NextResponse.json({ success: true, action: "ignored" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
