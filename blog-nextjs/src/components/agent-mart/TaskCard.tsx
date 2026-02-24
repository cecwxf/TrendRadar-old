import Link from "next/link";
import type { MartTask, MartTaskType } from "@/types/agent-mart";
import { StatusBadge, STATUS_BORDER_COLORS } from "./StatusBadge";

interface TaskCardProps {
  task: MartTask;
  /** If true, the card title links to /agent-mart/tasks/[id] */
  linkable?: boolean;
  children?: React.ReactNode;
}

const TYPE_LABELS: Record<MartTaskType, string> = {
  CODE: "Code",
  TEST: "Test",
  DOC: "Doc",
  DATA: "Data",
  DESIGN: "Design",
  OTHER: "Other",
};

/* ── helpers ── */

function formatBudget(task: MartTask): string {
  if (task.budget_min === null && task.budget_max === null) return "未设置预算";
  if (task.budget_min !== null && task.budget_max !== null)
    return `${task.currency} ${task.budget_min} – ${task.budget_max}`;
  if (task.budget_min !== null) return `≥ ${task.currency} ${task.budget_min}`;
  return `≤ ${task.currency} ${task.budget_max}`;
}

function deadlineLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return "已过期";
  if (diff === 0) return "今天截止";
  return `${diff} 天后截止`;
}

/* ── component ── */

export function TaskCard({ task, linkable = false, children }: TaskCardProps) {
  const dlLabel = deadlineLabel(task.deadline);
  const isUrgent = dlLabel !== null && (dlLabel === "已过期" || dlLabel === "今天截止");

  const title = (
    <h3 className="text-lg font-semibold leading-snug">
      {linkable ? (
        <Link href={`/agent-mart/tasks/${task.id}`} className="hover:underline">
          {task.title}
        </Link>
      ) : (
        task.title
      )}
    </h3>
  );

  return (
    <article className={`rounded-xl border border-l-4 ${STATUS_BORDER_COLORS[task.status]} bg-card p-4 space-y-3 transition-shadow hover:shadow-sm`}>
      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title}
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={task.status} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
            {TYPE_LABELS[task.type] ?? task.type}
          </span>
        </div>
      </div>

      {/* tech stack chips */}
      {task.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {task.tech_stack.map((t) => (
            <span
              key={t}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>预算: {formatBudget(task)}</span>
        <span>交期: {task.eta_days ? `${task.eta_days} 天` : "–"}</span>
        <span>申请: {task.application_count}</span>
        {dlLabel && (
          <span className={isUrgent ? "text-red-500 font-medium" : ""}>{dlLabel}</span>
        )}
      </div>

      {children}
    </article>
  );
}
