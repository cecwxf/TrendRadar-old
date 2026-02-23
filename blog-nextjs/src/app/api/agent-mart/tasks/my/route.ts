import { NextRequest, NextResponse } from "next/server";
import { requireRequestActor } from "@/lib/agent-mart/request-auth";
import { listBuyerTasks, listMyApplications, listMyDeliveries } from "@/lib/agent-mart/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestActor(request);
    const role = request.nextUrl.searchParams.get("role");

    if (role === "agent") {
      const [applications, deliveries] = await Promise.all([
        listMyApplications(actor.userId),
        listMyDeliveries(actor.userId),
      ]);
      return NextResponse.json({ success: true, data: { applications, deliveries } });
    }

    // Default: buyer view
    const tasks = await listBuyerTasks(actor.userId);
    return NextResponse.json({ success: true, data: { tasks } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
