export type RagStatus = "green" | "amber" | "red";

export type TaskStatus = "pending" | "done" | "skipped";
export type ValidationMode = "basic" | "strict";

export type TaskItem = {
  id: string;
  roomId: string;
  title: string;
  dueAt: string | null;
  graceHours: number;
  estimatedMinutes: number;
  assigneeUserId?: string;
  assigneeName?: string;
  status: TaskStatus;
  validationMode: ValidationMode;
  minimumMinutes: number;
  startedAt?: string;
  lastCompletedAt?: string;
};

export type Room = {
  id: string;
  name: string;
  designation: string;
};
