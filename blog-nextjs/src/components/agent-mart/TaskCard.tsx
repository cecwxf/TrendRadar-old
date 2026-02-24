import Link from "next/link";
import type { MartTask, MartTaskType } from "@/types/agent-mart";
import { StatusBadge, STATUS_BORDER_COLORS } from "./StatusBadge";

interface TaskCardProps {
  task: MartTask & { buyer_info?: { display_name: string | null; avatar_url: string | null } };
  /** If true, the card title links to /agent-mart/tasks/[id] */
  linkable?: boolean;
  children?: React.ReactNode;
}

const TYPE_LABELS: Record<MartTaskType, string> = {
  CODE: "开发",
  TEST: "测试",
  DOC: "文档",
  DATA: "数据",
  DESIGN: "设计",
  OTHER: "其他",
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 月前`;
}

/* ── component ── */

export function TaskCard({ task, linkable = false, children }: TaskCardProps) {
  const dlLabel = deadlineLabel(task.deadline);
  const isUrgent = dlLabel !== null && (dlLabel === "已过期" || dlLabel === "今天截止");
  const buyerName = task.buyer_info?.display_name || "匿名用户";

  const title = (
    <h3 className="text-lg font-semibold leading-snug text-foreground">
      {linkable ? (
        <Link
          href={`/agent-mart/tasks/${task.id}`}
          className="transition-colors hover:text-primary hover:underline underline-offset-4"
        >
          {task.title}
        </Link>
      ) : (
        task.title
      )}
    </h3>
  );

  return (
    <article
      className={`group rounded-2xl border border-l-4 ${STATUS_BORDER_COLORS[task.status]} bg-card/95 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}
    >
      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title}
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={task.status} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide">
            {TYPE_LABELS[task.type] ?? task.type}
          </span>
        </div>
      </div>

      {/* tech stack chips */}
      {task.tech_stack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.tech_stack.map((t) => (
            <span
              key={t}
              className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary/80"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* meta row — primary info */}
      <div className="mt-3 grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-muted-foreground">预算</p>
          <p className="text-sm font-semibold text-foreground">{formatBudget(task)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-muted-foreground">预计交付</p>
          <p className="text-sm text-foreground">{task.eta_days ? `${task.eta_days} 天` : "待协商"}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-muted-foreground">申请数</p>
          <p className="text-sm text-foreground">{task.application_count} 位 Agent</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {dlLabel && (
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              isUrgent ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300" : "bg-muted text-muted-foreground"
            }`}
          >
            {dlLabel}
          </span>
        )}
        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">发布者: {buyerName}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{timeAgo(task.created_at)}</span>
        {task.source !== "MANUAL" && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">来源: {task.source}</span>
        )}
      </div>

      {linkable && (
        <div className="mt-3">
          <Link
            href={`/agent-mart/tasks/${task.id}`}
            className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            查看详情
          </Link>
        </div>
      )}

      {children && <div className="mt-3 border-t border-border/70 pt-3">{children}</div>}
    </article>
  );
}
