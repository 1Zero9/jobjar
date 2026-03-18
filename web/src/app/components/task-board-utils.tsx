import type { TaskItem } from "@/app/components/task-board-types";

const AVATAR_PALETTE = [
  { bg: "#dbeafe", fg: "#1e40af" },
  { bg: "#ede9fe", fg: "#5b21b6" },
  { bg: "#d1fae5", fg: "#065f46" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#fee2e2", fg: "#991b1b" },
  { bg: "#e0f2fe", fg: "#075985" },
  { bg: "#fce7f3", fg: "#9d174d" },
  { bg: "#f1f5f9", fg: "#334155" },
];

export function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function nameToAvatarStyle(name: string): { background: string; color: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const entry = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  return { background: entry.bg, color: entry.fg };
}

export function formatRecordedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function getTaskState(task: {
  captureStage: string;
  schedule?: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string }>;
}) {
  if (task.occurrences.some((occurrence) => occurrence.status !== "done")) {
    return "open";
  }
  if (task.schedule) {
    return "open";
  }
  if (task.captureStage === "done" || task.occurrences[0]?.status === "done") {
    return "done";
  }
  return "open";
}

export function getTaskStatusLabel(task: {
  captureStage: string;
  schedule: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string; dueAt: string }>;
}) {
  if (getTaskState(task) === "done") {
    return "Done";
  }
  if (task.captureStage === "active") {
    return "In progress";
  }
  if (task.schedule) {
    return getRecurrenceStateLabel(task);
  }
  return "Open";
}

export function getLatestCompletedOccurrence<T extends { status: string; completedAt?: string | null; completedBy?: string | null; completerName?: string | null; dueAt?: string }>(
  occurrences: T[],
) {
  return occurrences.find((occurrence) => occurrence.status === "done") ?? null;
}

export function getOpenOccurrence<T extends { status: string; dueAt: string }>(occurrences: T[]) {
  return occurrences.find((occurrence) => occurrence.status !== "done") ?? null;
}

export function formatRecurrenceChip(schedule: { recurrenceType: string; intervalCount: number }) {
  const interval = schedule.intervalCount > 1 ? `${schedule.intervalCount} ` : "";
  if (schedule.recurrenceType === "daily") {
    return `Every ${interval}day${schedule.intervalCount > 1 ? "s" : ""}`;
  }
  if (schedule.recurrenceType === "monthly") {
    return `Every ${interval}month${schedule.intervalCount > 1 ? "s" : ""}`;
  }
  return `Every ${interval}week${schedule.intervalCount > 1 ? "s" : ""}`;
}

export function getRecurrenceStateLabel(task: {
  schedule: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string; dueAt: string }>;
}) {
  const openOccurrence = getOpenOccurrence(task.occurrences);
  const dueAt = openOccurrence?.dueAt ?? task.schedule?.nextDueAt;
  if (!dueAt) {
    return "Scheduled";
  }

  const now = new Date();
  const dueTime = new Date(dueAt).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = today + (24 * 60 * 60 * 1000);

  if (dueTime < now.getTime()) {
    return "Lapsed";
  }
  if (dueTime >= today && dueTime < tomorrow) {
    return "Due today";
  }
  return "On track";
}

export function recurrenceStateClassName(task: {
  schedule: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string; dueAt: string }>;
}) {
  const label = getRecurrenceStateLabel(task);
  if (label === "Lapsed") {
    return "task-chip-lapsed";
  }
  if (label === "Due today") {
    return "task-chip-due";
  }
  return "task-chip-recurring";
}

export function wasOccurrenceOnTime(occurrence: { dueAt?: string; completedAt?: string | null }) {
  if (!occurrence.dueAt || !occurrence.completedAt) {
    return true;
  }
  return new Date(occurrence.completedAt).getTime() <= new Date(occurrence.dueAt).getTime();
}

export function rowStateClass(task: {
  captureStage: string;
  occurrences: Array<{ status: string; dueAt: string }>;
  schedule: { nextDueAt: string | null } | null;
  assignmentUserId: string | null;
  isPrivate: boolean;
}): string {
  const privateClass = task.isPrivate ? " row-state-private" : "";
  if (getTaskState(task) === "done") return `row-state-done${privateClass}`;
  const stateClass = recurrenceStateClassName(task);
  if (stateClass === "task-chip-lapsed") return `row-state-overdue${privateClass}`;
  if (stateClass === "task-chip-due") return `row-state-due${privateClass}`;
  if (task.schedule) return `row-state-active${privateClass}`;
  if (!task.assignmentUserId) return `row-state-unassigned${privateClass}`;
  return `row-state-assigned${privateClass}`;
}

export function computeStreak(occurrences: Array<{ status: string }>) {
  let streak = 0;
  for (const occ of occurrences) {
    if (occ.status === "done") streak++;
    else break;
  }
  return streak;
}

export function displayRoomName(roomName: string) {
  return roomName.toLowerCase() === "unsorted" ? "No room" : roomName;
}

export function formatTaskPlace(locationName: string | null, roomName: string) {
  const resolvedRoomName = displayRoomName(roomName);
  return locationName ? `${locationName} · ${resolvedRoomName}` : resolvedRoomName;
}

export function isProjectTask(task: TaskItem) {
  return (
    task.jobKind === "project" ||
    task.projectChildren.length > 0 ||
    task.projectCosts.length > 0 ||
    task.projectMaterials.length > 0 ||
    task.projectMilestones.length > 0 ||
    task.projectBudgetCents !== null ||
    task.projectTargetAt !== null
  );
}

export function summarizeProject(task: TaskItem) {
  const now = Date.now();
  const totalChildren = task.projectChildren.length;
  const completedChildren = task.projectChildren.filter((child) => getTaskState(child) === "done").length;
  const overdueChildren = task.projectChildren.filter((child) => isProjectChildOverdue(child)).length;
  const spentCents = task.projectCosts.reduce((sum, cost) => sum + cost.amountCents, 0);
  const totalMaterials = task.projectMaterials.length;
  const purchasedMaterials = task.projectMaterials.filter((material) => material.purchasedAt).length;
  const materialEstimateCents = task.projectMaterials.reduce((sum, material) => sum + (material.estimatedCostCents ?? 0), 0);
  const materialSpentCents = task.projectMaterials.reduce((sum, material) => sum + (material.actualCostCents ?? 0), 0);
  const totalMilestones = task.projectMilestones.length;
  const completedMilestones = task.projectMilestones.filter((milestone) => milestone.completedAt).length;
  const overdueMilestones = task.projectMilestones.filter((milestone) => isMilestoneOverdue(milestone)).length;
  const totalEstimatedMinutes =
    task.estimatedMinutes + task.projectChildren.reduce((sum, child) => sum + child.estimatedMinutes, 0);
  const overBudget = task.projectBudgetCents !== null && spentCents > task.projectBudgetCents;
  const complete = task.projectChildren.length > 0
    ? completedChildren === totalChildren
    : getTaskState(task) === "done";
  const planning =
    task.projectChildren.length === 0 &&
    task.projectMilestones.length === 0 &&
    task.projectMaterials.length === 0 &&
    getTaskState(task) !== "done";
  const targetMissed =
    !complete && task.projectTargetAt !== null && new Date(task.projectTargetAt).getTime() < now;
  const atRisk = !complete && (overBudget || overdueChildren > 0 || overdueMilestones > 0 || targetMissed);
  const milestoneLabel = totalMilestones > 0 ? `${completedMilestones}/${totalMilestones} milestones` : null;
  const materialsLabel = totalMaterials > 0 ? `${purchasedMaterials}/${totalMaterials} bought` : null;
  const statusLabel = complete ? "Complete" : planning ? "Planning" : atRisk ? "At risk" : "Active";

  return {
    totalChildren,
    completedChildren,
    overdueChildren,
    spentCents,
    totalMaterials,
    purchasedMaterials,
    materialEstimateCents,
    materialSpentCents,
    totalEstimatedMinutes,
    totalMilestones,
    completedMilestones,
    overdueMilestones,
    overBudget,
    atRisk,
    statusLabel,
    milestoneLabel,
    materialsLabel,
    materialSpendLabel:
      totalMaterials > 0
        ? materialSpentCents > 0
          ? `${formatMoney(materialSpentCents)} across ${purchasedMaterials}`
          : purchasedMaterials > 0
            ? `${purchasedMaterials} bought`
            : "None bought"
        : "No materials",
    progressLabel: totalChildren > 0 ? `${completedChildren}/${totalChildren} tasks done` : "Project shell",
  };
}

export function getSubtaskProgressLabel(summary: ReturnType<typeof summarizeProject>) {
  return summary.totalChildren > 0 ? `${summary.completedChildren}/${summary.totalChildren} done` : "No subtasks";
}

export function hasLegacyProjectPlanningData(task: TaskItem) {
  return (
    task.projectCosts.length > 0 ||
    task.projectMaterials.length > 0 ||
    task.projectMilestones.length > 0 ||
    task.projectBudgetCents !== null ||
    task.projectTargetAt !== null
  );
}

export function formatMinutes(value: number) {
  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function getRewardStatusLabel(cents: number, confirmed: boolean, paidAt: string | null) {
  const amount = formatMoney(cents);
  if (paidAt) {
    return `${amount} paid`;
  }
  if (confirmed) {
    return `${amount} accepted`;
  }
  return `${amount} offer`;
}

export function getRewardChipClassName(confirmed: boolean, paidAt: string | null) {
  if (paidAt) {
    return "task-chip-reward-paid";
  }
  if (confirmed) {
    return "task-chip-reward";
  }
  return "task-chip-reward-offer";
}

export function formatJobKind(jobKind: string) {
  const labels: Record<string, string> = {
    upkeep: "Upkeep",
    issue: "Issue",
    project: "Parent job",
    clear_out: "Clear out",
    outdoor: "Outdoor",
    planning: "Planning",
  };
  return labels[jobKind] ?? jobKind;
}

export function getTaskIconTone(
  task: Pick<TaskItem, "captureStage" | "schedule" | "occurrences">,
  isProject: boolean,
) {
  if (isProject) return "project";
  if (getTaskState(task) === "done") return "done";
  if (task.schedule) return "recurring";
  return "standard";
}

export function renderTaskIcon(
  task: Pick<TaskItem, "captureStage" | "schedule" | "occurrences">,
  isProject: boolean,
) {
  if (isProject) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <circle cx="4" cy="6" r="1.5" />
        <circle cx="4" cy="12" r="1.5" />
        <circle cx="4" cy="18" r="1.5" />
      </svg>
    );
  }
  if (getTaskState(task) === "done") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (task.schedule) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11a8 8 0 0 1 13.66-5.66L19 7.5" />
        <path d="M21 13a8 8 0 0 1-13.66 5.66L5 16.5" />
        <path d="M19 3v4.5h-4.5" />
        <path d="M5 21v-4.5h4.5" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="m3 6 1.4 1.4L6.8 5" />
      <path d="m3 12 1.4 1.4L6.8 11" />
      <path d="m3 18 1.4 1.4L6.8 17" />
    </svg>
  );
}

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function groupRoomsByLocation<T extends { location?: { name: string } | null; name: string }>(rooms: T[]) {
  const grouped = new Map<string, T[]>();
  for (const room of rooms) {
    const key = room.location?.name ?? "Other";
    const entries = grouped.get(key) ?? [];
    entries.push(room);
    grouped.set(key, entries);
  }
  return [...grouped.entries()];
}

export function isProjectChildOverdue(child: { captureStage: string; nextDueAt: string | null; occurrences: Array<{ status: string; dueAt: string }> }) {
  if (getTaskState(child) === "done") {
    return false;
  }
  const dueAt = child.nextDueAt ?? getOpenOccurrence(child.occurrences)?.dueAt ?? null;
  return dueAt ? new Date(dueAt).getTime() < Date.now() : false;
}

function isMilestoneOverdue(milestone: { targetAt: string | null; completedAt: string | null }) {
  if (!milestone.targetAt || milestone.completedAt) {
    return false;
  }
  return new Date(milestone.targetAt).getTime() < Date.now();
}
