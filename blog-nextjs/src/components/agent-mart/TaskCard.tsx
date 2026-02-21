import type { MartTask } from "@/types/agent-mart";

interface TaskCardProps {
  task: MartTask;
  children?: React.ReactNode;
}

function formatBudget(task: MartTask): string {
  if (task.budget_min === null && task.budget_max === null) {
    return "未设置预算";
  }

  if (task.budget_min !== null && task.budget_max !== null) {
    return `${task.currency} ${task.budget_min} - ${task.budget_max}`;
  }

  if (task.budget_min !== null) {
    return `>= ${task.currency} ${task.budget_min}`;
  }

  return `<= ${task.currency} ${task.budget_max}`;
}

export function TaskCard({ task, children }: TaskCardProps) {
  return (
    <article className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{task.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{task.status}</span>
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
        <p>预算: {formatBudget(task)}</p>
        <p>交期: {task.eta_days ? `${task.eta_days} 天` : "未设置"}</p>
        <p>技术栈: {task.tech_stack.length > 0 ? task.tech_stack.join(", ") : "未设置"}</p>
      </div>

      {children}
    </article>
  );
}
