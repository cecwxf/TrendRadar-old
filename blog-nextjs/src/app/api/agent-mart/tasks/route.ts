import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { createTask, listTasks, upsertMartUser } from "@/lib/agent-mart/service";
import type { MartTaskStatus, MartTaskType, MartTaskSource, TaskQueryFilters } from "@/types/agent-mart";

const STATUS_SET: MartTaskStatus[] = [
  "DRAFT", "OPEN", "BIDDING", "IN_PROGRESS", "DELIVERED", "VERIFYING", "REVISING", "CLOSED", "CANCELLED", "NO_OFFER", "DISPUTED",
];
const TASK_TYPES: MartTaskType[] = ["CODE", "TEST", "DOC", "DATA", "DESIGN", "OTHER"];
const TASK_SOURCES: MartTaskSource[] = ["MANUAL", "GITHUB", "API"];

function parseOptionalNumber(input: string | null): number | undefined {
  if (!input) return undefined;
  const parsed = Number(input);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

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

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const status = sp.get("status") || undefined;

    const type = sp.get("type") || undefined;

    const filters: TaskQueryFilters = {
      status: status && STATUS_SET.includes(status as MartTaskStatus) ? (status as MartTaskStatus) : undefined,
      type: type && TASK_TYPES.includes(type as MartTaskType) ? (type as MartTaskType) : undefined,
      tech: sp.get("tech") || undefined,
      minBudget: parseOptionalNumber(sp.get("minBudget")),
      maxBudget: parseOptionalNumber(sp.get("maxBudget")),
      q: sp.get("q") || undefined,
      limit: parseOptionalNumber(sp.get("limit")),
    };

    const tasks = await listTasks(filters);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
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

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "title and description are required" },
        { status: 400 }
      );
    }

    await upsertMartUser({
      userId: actor.userId,
      role: "buyer",
      displayName: body.displayName ? String(body.displayName) : undefined,
    });

    const rawType = body.type ? String(body.type) : undefined;
    const rawSource = body.source ? String(body.source) : undefined;

    const task = await createTask({
      buyerUserId: actor.userId,
      title,
      description,
      budgetMin: typeof body.budgetMin === "number" ? body.budgetMin : undefined,
      budgetMax: typeof body.budgetMax === "number" ? body.budgetMax : undefined,
      currency: body.currency ? String(body.currency) : "USD",
      etaDays: typeof body.etaDays === "number" ? body.etaDays : undefined,
      techStack: parseStringList(body.techStack),
      acceptance:
        body.acceptance && typeof body.acceptance === "object"
          ? {
              ciRequired: Boolean(body.acceptance.ciRequired),
              checklist: parseStringList(body.acceptance.checklist),
              notes: body.acceptance.notes ? String(body.acceptance.notes) : undefined,
            }
          : undefined,
      type: rawType && TASK_TYPES.includes(rawType as MartTaskType) ? (rawType as MartTaskType) : undefined,
      deadline: body.deadline ? String(body.deadline) : undefined,
      source: rawSource && TASK_SOURCES.includes(rawSource as MartTaskSource) ? (rawSource as MartTaskSource) : undefined,
      githubRepo: body.githubRepo ? String(body.githubRepo) : undefined,
      githubIssueId: typeof body.githubIssueId === "number" ? body.githubIssueId : undefined,
      asDraft: body.asDraft === true,
    });

    return NextResponse.json({ success: true, data: task, identity: actor.source });
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
