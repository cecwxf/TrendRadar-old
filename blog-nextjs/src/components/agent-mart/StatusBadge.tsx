import type { ApplicationStatus, MartTaskStatus } from "@/types/agent-mart";

const STATUS_COLORS: Record<MartTaskStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  OPEN: "bg-emerald-100 text-emerald-700",
  BIDDING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-purple-100 text-purple-700",
  VERIFYING: "bg-indigo-100 text-indigo-700",
  REVISING: "bg-orange-100 text-orange-700",
  CLOSED: "bg-gray-200 text-gray-500",
  CANCELLED: "bg-red-100 text-red-600",
  NO_OFFER: "bg-gray-100 text-gray-500",
  DISPUTED: "bg-red-200 text-red-700",
};

const STATUS_LABELS: Record<MartTaskStatus, string> = {
  DRAFT: "草稿",
  OPEN: "开放",
  BIDDING: "竞标中",
  IN_PROGRESS: "进行中",
  DELIVERED: "已交付",
  VERIFYING: "验收中",
  REVISING: "修改中",
  CLOSED: "已完成",
  CANCELLED: "已取消",
  NO_OFFER: "无人接单",
  DISPUTED: "争议中",
};

const APP_STATUS_COLORS: Record<ApplicationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  SHORTLISTED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-600",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

const APP_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "待审核",
  SHORTLISTED: "入围",
  ACCEPTED: "已接受",
  REJECTED: "已拒绝",
  WITHDRAWN: "已撤回",
};

interface StatusBadgeProps {
  status: MartTaskStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface AppStatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function AppStatusBadge({ status, className = "" }: AppStatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APP_STATUS_COLORS[status]} ${className}`}
    >
      {APP_STATUS_LABELS[status]}
    </span>
  );
}

export { STATUS_COLORS, STATUS_LABELS, APP_STATUS_COLORS, APP_STATUS_LABELS };
