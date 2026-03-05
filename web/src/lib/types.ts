export type RagStatus = "green" | "amber" | "red";

export type TaskStatus = "pending" | "done" | "skipped";
export type ValidationMode = "basic" | "strict";
export type JobKind = "upkeep" | "issue" | "project" | "clear_out" | "outdoor" | "planning";
export type CaptureStage = "captured" | "shaped" | "active" | "done";

export type TaskItem = {
  id: string;
  roomId: string;
  title: string;
  detailNotes?: string | null;
  locationDetails?: string | null;
  jobKind: JobKind;
  captureStage: CaptureStage;
  projectParentId?: string | null;
  projectParentTitle?: string | null;
  childCount: number;
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
