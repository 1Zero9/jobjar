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

  refreshViews();
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

  refreshViews();
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
  refreshViews();
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

  const recurrenceType = parseRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const recurrenceTime = String(formData.get("recurrenceTime") ?? "").trim() || "09:00";
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();

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
      schedule: {
        create: {
          recurrenceType,
          intervalCount: recurrenceInterval,
          timeOfDay: recurrenceTime,
          nextDueAt: dueAt,
          daysOfWeek: [],
        },
      },
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

  if (assigneeUserId) {
    await prisma.taskAssignment.create({
      data: {
        taskId: task.id,
        userId: assigneeUserId,
        assignedFrom: new Date(),
      },
    });
  }

  refreshViews();
}

export async function createQuickTaskAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const requestedRoomId = String(formData.get("roomId") ?? "").trim();
  if (!title) {
    return;
  }

  const householdId = await getOrCreateDefaultHouseholdId();
  let roomId = requestedRoomId;

  if (!roomId) {
    const firstRoom = await prisma.room.findFirst({
      where: { householdId, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (firstRoom) {
      roomId = firstRoom.id;
    } else {
      const createdRoom = await prisma.room.create({
        data: {
          householdId,
          name: "General",
          designation: "Quick add area",
          sortOrder: 1,
        },
        select: { id: true },
      });
      roomId = createdRoom.id;
    }
  }

  const dueAt = new Date();
  const task = await prisma.task.create({
    data: {
      title,
      roomId,
      estimatedMinutes: 15,
      graceHours: 12,
      description: "validation=basic;min=0",
      schedule: {
        create: {
          recurrenceType: "weekly",
          intervalCount: 1,
          timeOfDay: "09:00",
          nextDueAt: dueAt,
          daysOfWeek: [],
        },
      },
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

  refreshViews();
}

export async function updateTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      schedule: true,
      assignments: {
        where: { assignedTo: null },
        orderBy: { assignedFrom: "desc" },
        take: 1,
      },
    },
  });
  if (!existing) {
    return;
  }

  const title = String(formData.get("title") ?? existing.title).trim() || existing.title;
  const roomId = String(formData.get("roomId") ?? existing.roomId).trim() || existing.roomId;
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), existing.estimatedMinutes);
  const graceHours = toPositiveInt(formData.get("graceHours"), existing.graceHours);

  const currentValidationMode = parseValidationMode(existing.description);
  const currentMinimum = parseMinimumMinutes(existing.description);
  const validationMode = formData.has("strictMode")
    ? formData.get("strictMode") === "on"
      ? "strict"
      : "basic"
    : currentValidationMode;
  const minimumMinutes = toNonNegativeInt(formData.get("minimumMinutes"), currentMinimum);
  const dueAt = toDate(formData.get("dueAt"));
  const description = buildValidationMeta(validationMode, minimumMinutes);

  const recurrenceType = formData.get("recurrenceType")
    ? parseRecurrenceType(formData.get("recurrenceType"))
    : (existing.schedule?.recurrenceType ?? "weekly");
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), existing.schedule?.intervalCount ?? 1);
  const recurrenceTime = String(formData.get("recurrenceTime") ?? existing.schedule?.timeOfDay ?? "09:00").trim() || "09:00";
  const currentAssigneeUserId = existing.assignments[0]?.userId ?? "";
  const assigneeUserId = formData.has("assigneeUserId")
    ? String(formData.get("assigneeUserId") ?? "").trim()
    : currentAssigneeUserId;

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

  await prisma.taskSchedule.upsert({
    where: { taskId },
    create: {
      taskId,
      recurrenceType,
      intervalCount: recurrenceInterval,
      timeOfDay: recurrenceTime,
      nextDueAt: dueAt ?? new Date(),
      daysOfWeek: [],
    },
    update: {
      recurrenceType,
      intervalCount: recurrenceInterval,
      timeOfDay: recurrenceTime,
      ...(dueAt ? { nextDueAt: dueAt } : {}),
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

  await prisma.taskAssignment.updateMany({
    where: { taskId, assignedTo: null },
    data: { assignedTo: new Date() },
  });

  if (assigneeUserId) {
    await prisma.taskAssignment.create({
      data: {
        taskId,
        userId: assigneeUserId,
        assignedFrom: new Date(),
      },
    });
  }

  refreshViews();
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
  refreshViews();
}

export async function createPersonAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();

  if (!displayName) {
    return;
  }

  const householdId = await getOrCreateDefaultHouseholdId();
  const email =
    emailInput || `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@jobjar.local`;

  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName },
    create: {
      email,
      displayName,
    },
  });

  await prisma.householdMember.upsert({
    where: {
      householdId_userId: {
        householdId,
        userId: user.id,
      },
    },
    update: { role: "member" },
    create: {
      householdId,
      userId: user.id,
      role: "member",
    },
  });

  refreshViews();
}

export async function removePersonAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    return;
  }

  const householdId = await getOrCreateDefaultHouseholdId();

  await prisma.householdMember.deleteMany({
    where: { householdId, userId },
  });

  await prisma.taskAssignment.updateMany({
    where: { userId, assignedTo: null },
    data: { assignedTo: new Date() },
  });

  refreshViews();
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

  refreshViews();
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

  refreshViews();
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

  refreshViews();
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

function parseRecurrenceType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "daily" || raw === "weekly" || raw === "monthly" || raw === "custom") {
    return raw;
  }
  return "weekly";
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

function refreshViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/tv");
}
