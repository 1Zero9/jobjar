"use server";

import { getOrCreateDefaultHouseholdId } from "@/lib/household";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRoomAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";

  if (!name) {
    return;
  }

  const householdId = await getOrCreateDefaultHouseholdId();
  const maxSort = await prisma.room.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  await prisma.room.create({
    data: {
      householdId,
      name,
      designation,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/");
}

export async function updateRoomAction(formData: FormData) {
  const roomId = String(formData.get("roomId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";

  if (!roomId || !name) {
    return;
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { name, designation },
  });

  revalidatePath("/");
}

export async function deleteRoomAction(formData: FormData) {
  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) {
    return;
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { roomId },
      data: { active: false },
    }),
    prisma.room.update({
      where: { id: roomId },
      data: { active: false },
    }),
  ]);
  revalidatePath("/");
}

export async function createTaskAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), 15);
  const graceHours = toPositiveInt(formData.get("graceHours"), 12);
  const minimumMinutes = toNonNegativeInt(formData.get("minimumMinutes"), 0);
  const validationMode = formData.get("strictMode") === "on" ? "strict" : "basic";
  const dueAt = toDate(formData.get("dueAt")) ?? new Date();
  const description = buildValidationMeta(validationMode, minimumMinutes);

  if (!title || !roomId) {
    return;
  }

  const task = await prisma.task.create({
    data: {
      title,
      roomId,
      estimatedMinutes,
      graceHours,
      description,
    },
    select: { id: true },
  });

  await prisma.taskOccurrence.create({
    data: {
      taskId: task.id,
      dueAt,
      status: "pending",
    },
  });

  revalidatePath("/");
}

export async function updateTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), 15);
  const graceHours = toPositiveInt(formData.get("graceHours"), 12);
  const minimumMinutes = toNonNegativeInt(formData.get("minimumMinutes"), 0);
  const validationMode = formData.get("strictMode") === "on" ? "strict" : "basic";
  const dueAt = toDate(formData.get("dueAt"));
  const description = buildValidationMeta(validationMode, minimumMinutes);

  if (!taskId || !title || !roomId) {
    return;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      roomId,
      estimatedMinutes,
      graceHours,
      description,
    },
  });

  if (dueAt) {
    const latestOccurrence = await prisma.taskOccurrence.findFirst({
      where: { taskId },
      orderBy: { dueAt: "desc" },
      select: { id: true },
    });

    if (latestOccurrence) {
      await prisma.taskOccurrence.update({
        where: { id: latestOccurrence.id },
        data: { dueAt },
      });
    } else {
      await prisma.taskOccurrence.create({
        data: {
          taskId,
          dueAt,
          status: "pending",
        },
      });
    }
  }

  revalidatePath("/");
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { active: false },
  });
  revalidatePath("/");
}

export async function startTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  await prisma.taskLog.create({
    data: {
      taskId,
      action: "started",
      atTime: new Date(),
    },
  });

  revalidatePath("/");
}

export async function completeTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!taskId) {
    return;
  }

  const now = new Date();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      description: true,
      occurrences: {
        orderBy: { dueAt: "desc" },
        take: 1,
        select: { id: true },
      },
      logs: {
        where: { action: "started" },
        orderBy: { atTime: "desc" },
        take: 1,
        select: { atTime: true },
      },
    },
  });

  if (!task) {
    return;
  }

  const validationMode = parseValidationMode(task.description);
  const minimumMinutes = parseMinimumMinutes(task.description);
  const lastStart = task.logs[0]?.atTime;
  if (validationMode === "strict") {
    if (note.length < 8) {
      return;
    }

    if (!lastStart) {
      return;
    }

    const minutesWorked = (now.getTime() - lastStart.getTime()) / 60000;
    if (minutesWorked < minimumMinutes) {
      return;
    }
  }

  const lastOccurrenceId = task.occurrences[0]?.id;
  if (lastOccurrenceId) {
    await prisma.taskOccurrence.update({
      where: { id: lastOccurrenceId },
      data: {
        status: "done",
        completedAt: now,
      },
    });
  } else {
    await prisma.taskOccurrence.create({
      data: {
        taskId,
        dueAt: now,
        status: "done",
        completedAt: now,
      },
    });
  }

  const durationSeconds = lastStart ? Math.max(0, Math.floor((now.getTime() - lastStart.getTime()) / 1000)) : null;
  await prisma.taskLog.create({
    data: {
      taskId,
      action: "completed",
      atTime: now,
      note: note || null,
      durationSeconds,
    },
  });

  revalidatePath("/");
}

export async function reopenTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const latestOccurrence = await prisma.taskOccurrence.findFirst({
    where: { taskId },
    orderBy: { dueAt: "desc" },
    select: { id: true, status: true },
  });

  if (latestOccurrence && latestOccurrence.status === "done") {
    await prisma.taskOccurrence.update({
      where: { id: latestOccurrence.id },
      data: {
        status: "pending",
        completedAt: null,
      },
    });
  }

  await prisma.taskLog.create({
    data: {
      taskId,
      action: "reopened",
      atTime: new Date(),
      note: "Marked not done",
    },
  });

  revalidatePath("/");
}

function toPositiveInt(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return fallback;
  }
  return num;
}

function toNonNegativeInt(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return fallback;
  }
  return num;
}

function toDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function buildValidationMeta(mode: "basic" | "strict", minimumMinutes: number) {
  if (mode === "strict") {
    return `validation=strict;min=${minimumMinutes}`;
  }
  return `validation=basic;min=${minimumMinutes}`;
}

function parseValidationMode(description: string | null) {
  if (!description) {
    return "basic";
  }
  return description.includes("validation=strict") ? "strict" : "basic";
}

function parseMinimumMinutes(description: string | null) {
  if (!description) {
    return 0;
  }
  const match = description.match(/min=(\d+)/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) || 0;
}
