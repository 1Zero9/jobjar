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

  await prisma.room.delete({ where: { id: roomId } });
  revalidatePath("/");
}

export async function createTaskAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), 15);
  const graceHours = toPositiveInt(formData.get("graceHours"), 12);
  const dueAt = toDate(formData.get("dueAt")) ?? new Date();

  if (!title || !roomId) {
    return;
  }

  const task = await prisma.task.create({
    data: {
      title,
      roomId,
      estimatedMinutes,
      graceHours,
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
  const dueAt = toDate(formData.get("dueAt"));

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

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/");
}

function toPositiveInt(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
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
