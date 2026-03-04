import { RagStatus, TaskItem } from "@/lib/types";

export function deriveTaskRag(task: TaskItem, now = new Date()): RagStatus {
  if (task.status === "done") {
    return "green";
  }

  if (!task.dueAt) {
    return "green";
  }

  const dueAt = new Date(task.dueAt);
  const msToDue = dueAt.getTime() - now.getTime();
  const graceMs = task.graceHours * 60 * 60 * 1000;

  if (msToDue > 2 * 60 * 60 * 1000) {
    return "green";
  }

  if (msToDue >= -graceMs) {
    return "amber";
  }

  return "red";
}

export function rollupRoomRag(statuses: RagStatus[]): RagStatus {
  if (statuses.includes("red")) {
    return "red";
  }
  if (statuses.includes("amber")) {
    return "amber";
  }
  return "green";
}
