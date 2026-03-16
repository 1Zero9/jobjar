"use server";

import {
  canManageProjectsRole,
  canUseMemberActions,
  clearSession,
  getHouseholdPasscode,
  isAdminRole,
  requireSessionContext,
  setSessionUserId,
} from "@/lib/auth";
import { getOrCreateHouseholdForUser } from "@/lib/household";
import { hasLocationRestrictions } from "@/lib/location-access";
import { canAccessExtendedViews, getAudienceAssignedTaskWhere } from "@/lib/member-audience";
import { notifyUser, resolveNotificationRecipientUserId } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { getUserPasswordHash, setUserPasswordHash } from "@/lib/auth-store";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function createRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!name) {
    redirectToReturnPath(returnTo, { error: "room-name-required" });
    return;
  }

  const duplicateRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      locationId: locationId ?? null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicateRoom) {
    redirectToReturnPath(returnTo, { duplicate: "room" });
    return;
  }

  const maxSort = await prisma.room.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  const validLocation = locationId
    ? await prisma.location.findFirst({ where: { id: locationId, householdId, active: true }, select: { id: true } })
    : null;

  await prisma.room.create({
    data: {
      householdId,
      name,
      designation,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      locationId: locationId && validLocation ? locationId : null,
    },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms", "/settings/locations"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { added: "room" });
  }
}

export async function updateRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!roomId) {
    return;
  }

  if (!name) {
    redirectToReturnPath(returnTo, { error: "room-name-required" });
    return;
  }

  const currentRoom = await prisma.room.findFirst({
    where: { id: roomId, householdId, active: true },
    select: { locationId: true },
  });

  const duplicateRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      id: { not: roomId },
      locationId: currentRoom?.locationId ?? null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicateRoom) {
    redirectToReturnPath(returnTo, { duplicate: "room" });
    return;
  }

  if (!currentRoom) {
    redirectToReturnPath(returnTo, { error: "room-not-found" });
    return;
  }

  await prisma.room.updateMany({
    where: { id: roomId, householdId, active: true },
    data: { name, designation },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms"]);
}

export async function deleteRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!roomId) {
    return;
  }

  const room = await prisma.room.findFirst({
    where: { id: roomId, householdId },
    select: { id: true },
  });
  if (!room) {
    redirectToReturnPath(returnTo, { error: "room-not-found" });
    return;
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { roomId: room.id },
      data: { active: false },
    }),
    prisma.room.updateMany({
      where: { id: room.id, householdId },
      data: { active: false },
    }),
  ]);
  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms", "/settings/locations"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { archived: "room" });
  }
}

export async function createLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!name) {
    redirectToReturnPath(returnTo, { error: "location-name-required" });
    return;
  }

  const duplicate = await prisma.location.findFirst({
    where: { householdId, active: true, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    redirectToReturnPath(returnTo, { duplicate: "location" });
    return;
  }

  const maxSort = await prisma.location.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  await prisma.location.create({
    data: { householdId, name, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/locations"]);
  if (returnTo) redirectToReturnPath(returnTo, { added: "location" });
}

export async function updateLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!locationId) {
    return;
  }

  if (!name) {
    redirectToReturnPath(returnTo, { error: "location-name-required" });
    return;
  }

  const duplicate = await prisma.location.findFirst({
    where: { householdId, active: true, id: { not: locationId }, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    redirectToReturnPath(returnTo, { duplicate: "location" });
    return;
  }

  const result = await prisma.location.updateMany({
    where: { id: locationId, householdId, active: true },
    data: { name },
  });

  if (result.count === 0) {
    redirectToReturnPath(returnTo, { error: "location-not-found" });
    return;
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/locations"]);
}

export async function deleteLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) return;

  const location = await prisma.location.findFirst({
    where: { id: locationId, householdId },
    select: { id: true },
  });
  if (!location) return;

  // Unlink rooms from this location (set locationId to null)
  await prisma.room.updateMany({
    where: { locationId: location.id, householdId },
    data: { locationId: null },
  });

  await prisma.location.updateMany({
    where: { id: location.id, householdId },
    data: { active: false },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/locations", "/settings/rooms"]);
}

export async function updateRoomLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  if (!roomId) return;

  const validLocation = locationId
    ? await prisma.location.findFirst({ where: { id: locationId, householdId, active: true }, select: { id: true } })
    : null;

  await prisma.room.updateMany({
    where: { id: roomId, householdId, active: true },
    data: { locationId: locationId && validLocation ? locationId : null },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms"]);
}

export async function createTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId } = await requireAdminAction();
  const title = String(formData.get("title") ?? "").trim();
  const requestedRoomId = String(formData.get("roomId") ?? "").trim();
  const detailNotes = String(formData.get("detailNotes") ?? "").trim() || null;
  const locationDetails = String(formData.get("locationDetails") ?? "").trim() || null;
  const jobKind = parseJobKind(formData.get("jobKind"), inferJobKindFromText(title));
  const captureStage = parseCaptureStage(formData.get("captureStage"), "shaped");
  const projectParentIdInput = String(formData.get("projectParentId") ?? "").trim();
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), 15);
  const graceHours = toPositiveInt(formData.get("graceHours"), 12);
  const minimumMinutes = toNonNegativeInt(formData.get("minimumMinutes"), 0);
  const validationMode = formData.get("strictMode") === "on" ? "strict" : "basic";
  const dueAt = toDate(formData.get("dueAt"));

  const recurrenceType = parseRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const recurrenceTime = String(formData.get("recurrenceTime") ?? "").trim() || "09:00";
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!title || !requestedRoomId) {
    if (!title) {
      redirectToReturnPath(returnTo, { error: "task-title-required" });
    } else {
      redirectToReturnPath(returnTo, { error: "task-room-required" });
    }
    return;
  }

  const room = await prisma.room.findFirst({
    where: { id: requestedRoomId, householdId, active: true },
    select: { id: true, name: true },
  });
  if (!room) {
    redirectToReturnPath(returnTo, { error: "task-room-invalid" });
    return;
  }

  const projectParentId = await resolveProjectParentId(projectParentIdInput, householdId);

  const task = await prisma.task.create({
    data: {
      title,
      roomId: room.id,
      createdByUserId: actorUserId,
      detailNotes,
      locationDetails,
      jobKind,
      captureStage,
      projectParentId,
      estimatedMinutes,
      graceHours,
      validationMode,
      minimumMinutes,
      ...(recurrenceType
        ? {
            schedule: {
              create: {
                recurrenceType,
                intervalCount: recurrenceInterval,
                timeOfDay: recurrenceTime,
                nextDueAt: dueAt,
                daysOfWeek: [],
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  if (dueAt) {
    await prisma.taskOccurrence.create({
      data: {
        taskId: task.id,
        dueAt,
        status: "pending",
      },
    });
  }

  if (assigneeUserId) {
    const assigneeMembership = await resolveAssignableMemberUserId(householdId, assigneeUserId, room.id);

    if (assigneeMembership) {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: assigneeUserId,
          assignedFrom: new Date(),
        },
      });

      const recipientUserId = await resolveNotificationRecipientUserId(householdId, assigneeUserId);
      if (recipientUserId && recipientUserId !== actorUserId) {
        await notifyUser(
          recipientUserId,
          "task_assigned",
          {
            title: "JobJar",
            body: `You were assigned "${title}" in ${room.name}.`,
            url: `/tasks#task-${task.id}`,
          },
          task.id,
        );
      }
    }
  }

  await prisma.taskLog.create({
    data: { taskId: task.id, action: "task_created", actorUserId, note: title },
  });

  refreshViews(["/", "/log", "/tasks"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { added: "task" });
  }
}

export async function createQuickTaskAction(formData: FormData) {
  const { householdId, userId, allowedLocationIds } = await requireSessionMemberAction();
  const title = String(formData.get("title") ?? "").trim();
  const projectParentIdInput = String(formData.get("projectParentId") ?? "").trim();
  const requestedRoomId = String(formData.get("roomId") ?? "").trim();
  const requestedPriority = toPositiveIntOrNull(formData.get("priority"));
  const detailNotes = String(formData.get("detailNotes") ?? "").trim() || null;
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim();
  const isPrivate = formData.get("isPrivate") === "true";
  const recordStatus = String(formData.get("recordStatus") ?? "open").trim();
  const completedByUserId = String(formData.get("completedByUserId") ?? "").trim();
  const resolvedAt = toDate(formData.get("resolvedAt")) ?? new Date();
  const recurrenceType = parseOptionalRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const requestedNextDueAt = toDate(formData.get("nextDueAt"));
  const rewardInput = String(formData.get("reward") ?? "").trim();
  const rewardCents = toCurrencyCentsOrNull(formData.get("reward"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/log");
  if (!title) {
    redirectToReturnPath(returnTo, { error: "task-title-required" });
    return;
  }
  if (rewardInput && rewardCents === null) {
    redirectToReturnPath(returnTo, { error: "reward-amount-invalid" });
    return;
  }

  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);
  let roomId = restrictedToLocations ? null : await getOrCreateUnsortedRoomId(householdId);
  if (requestedRoomId) {
    const room = await prisma.room.findFirst({
      where: {
        id: requestedRoomId,
        ...getAccessibleRoomWhere(householdId, allowedLocationIds),
        active: true,
      },
      select: { id: true },
    });

    if (room) {
      roomId = room.id;
    }
  }
  if (!roomId) {
    redirectToReturnPath(returnTo, { error: "task-room-required" });
    return;
  }

  const projectParentId = await resolveProjectParentId(projectParentIdInput, householdId, undefined, allowedLocationIds);

  const task = await prisma.task.create({
    data: {
      title,
      roomId,
      createdByUserId: userId,
      projectParentId,
      jobKind: "upkeep",
      captureStage: recordStatus === "done" && !recurrenceType ? "done" : "captured",
      detailNotes,
      priority: recordStatus === "done" && !recurrenceType ? 999 : 1,
      isPrivate,
      rewardCents,
    },
    select: { id: true },
  });

  if (recordStatus !== "done" || recurrenceType) {
    await moveOpenTaskToPriority(task.id, roomId, requestedPriority);
  }

  if (assignedToUserId && recordStatus !== "done") {
    const assigneeMember = await resolveAssignableMemberUserId(householdId, assignedToUserId, roomId);
    if (assigneeMember) {
      await prisma.taskAssignment.create({
        data: { taskId: task.id, userId: assignedToUserId, assignedFrom: new Date() },
      });

      const recipientUserId = await resolveNotificationRecipientUserId(householdId, assignedToUserId);
      if (recipientUserId && recipientUserId !== userId) {
        await notifyUser(
          recipientUserId,
          "task_assigned",
          {
            title: "JobJar",
            body: `You were assigned "${title}".`,
            url: `/tasks#task-${task.id}`,
          },
          task.id,
        );
      }
    }
  }

  if (recordStatus === "done") {
    const completedBy = await resolveMemberUserId(householdId, completedByUserId);
    const occurrence = await prisma.taskOccurrence.create({
      data: {
        taskId: task.id,
        dueAt: resolvedAt,
        status: "done",
        completedAt: resolvedAt,
        completedBy,
      },
      select: { id: true },
    });

    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        occurrenceId: occurrence.id,
        action: "completed",
        atTime: resolvedAt,
        note: detailNotes,
      },
    });
  }

  if (recurrenceType) {
    const nextDueAt = requestedNextDueAt ?? calculateNextDueAt(recordStatus === "done" ? resolvedAt : new Date(), recurrenceType, recurrenceInterval);
    await upsertSimpleSchedule(task.id, recurrenceType, recurrenceInterval, nextDueAt);
    await upsertPendingOccurrence(task.id, nextDueAt);
  }

  refreshViews(["/", "/log", "/tasks"]);
  redirectToReturnPath(returnTo, {
    added: recordStatus === "done" ? "done" : "task",
    taskId: task.id,
  }, "recorded");
}

export async function luckyDipAction(formData?: FormData) {
  const { householdId, allowedLocationIds } = await requireSessionMemberAction();
  const returnTo = getReturnPath(formData?.get("returnTo"), "/tasks");

  const tasks = await prisma.task.findMany({
    where: {
      active: true,
      captureStage: { not: "done" },
      schedule: null,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (tasks.length === 0) {
    redirect(`${returnTo}?lucky=empty#recorded`);
  }

  const pick = tasks[Math.floor(Math.random() * tasks.length)];
  redirect(`${returnTo}?lucky=${pick.id}#task-${pick.id}`);
}

export async function updateRecordedTaskAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const requestedRoomId = String(formData.get("roomId") ?? "").trim();
  const requestedPriority = toPositiveIntOrNull(formData.get("priority"));
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const isPrivate = formData.get("isPrivate") === "true";
  const detailNotes = String(formData.get("detailNotes") ?? "").trim() || null;
  const recordStatus = String(formData.get("recordStatus") ?? "open").trim();
  const completedByUserId = String(formData.get("completedByUserId") ?? "").trim();
  const resolvedAt = toDate(formData.get("resolvedAt")) ?? new Date();
  const recurrenceType = parseOptionalRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const requestedNextDueAt = toDate(formData.get("nextDueAt"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");

  if (!taskId) {
    return;
  }

  if (!title) {
    redirectToReturnPath(returnTo, { error: "task-title-required" });
    return;
  }

  const existingTask = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: {
      id: true,
      roomId: true,
      priority: true,
      captureStage: true,
      occurrences: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });
  if (!existingTask) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  let roomId = existingTask.roomId;
  if (requestedRoomId) {
    const room = await prisma.room.findFirst({
      where: {
        id: requestedRoomId,
        ...getAccessibleRoomWhere(householdId, allowedLocationIds),
        active: true,
      },
      select: { id: true },
    });
    if (room) {
      roomId = room.id;
    }
  } else if (!hasLocationRestrictions(allowedLocationIds)) {
    roomId = await getOrCreateUnsortedRoomId(householdId);
  }

  await prisma.task.update({
    where: { id: existingTask.id },
    data: {
      title,
      roomId,
      detailNotes,
      isPrivate,
      captureStage: recordStatus === "done" && !recurrenceType ? "done" : "captured",
      priority: recordStatus === "done" && !recurrenceType ? existingTask.priority : 1,
    },
  });

  await prisma.taskAssignment.updateMany({
    where: {
      taskId: existingTask.id,
      assignedTo: null,
    },
    data: {
      assignedTo: new Date(),
    },
  });

  if (assigneeUserId) {
    const member = await resolveAssignableMemberUserId(householdId, assigneeUserId, roomId);

    if (member) {
      await prisma.taskAssignment.create({
        data: {
          taskId: existingTask.id,
          userId: assigneeUserId,
          assignedFrom: new Date(),
        },
      });
    }
  }

  const latestOccurrence = existingTask.occurrences[0] ?? null;
  if (recordStatus === "done") {
    const completedBy = await resolveMemberUserId(householdId, completedByUserId);
    let completedOccurrenceId = latestOccurrence?.id ?? null;
    if (latestOccurrence) {
      await prisma.taskOccurrence.update({
        where: { id: latestOccurrence.id },
        data: {
          dueAt: resolvedAt,
          status: "done",
          completedAt: resolvedAt,
          completedBy,
        },
      });
    } else {
      const occurrence = await prisma.taskOccurrence.create({
        data: {
          taskId: existingTask.id,
          dueAt: resolvedAt,
          status: "done",
          completedAt: resolvedAt,
          completedBy,
        },
        select: { id: true },
      });
      completedOccurrenceId = occurrence.id;
    }

    await prisma.taskLog.create({
      data: {
        taskId: existingTask.id,
        occurrenceId: completedOccurrenceId,
        action: "completed",
        atTime: resolvedAt,
        note: detailNotes,
      },
    });
  } else if (latestOccurrence && latestOccurrence.status === "done") {
    await prisma.taskOccurrence.update({
      where: { id: latestOccurrence.id },
      data: {
        status: "pending",
        completedAt: null,
        completedBy: null,
      },
    });
  }

  if (recurrenceType) {
    const nextDueAt = requestedNextDueAt ?? calculateNextDueAt(resolvedAt, recurrenceType, recurrenceInterval);
    await upsertSimpleSchedule(existingTask.id, recurrenceType, recurrenceInterval, nextDueAt);
    await upsertPendingOccurrence(existingTask.id, nextDueAt);
  } else {
    await prisma.taskSchedule.deleteMany({
      where: { taskId: existingTask.id },
    });
    await prisma.taskOccurrence.deleteMany({
      where: {
        taskId: existingTask.id,
        status: { in: ["pending", "overdue", "skipped"] },
      },
    });
  }

  if (recordStatus === "done" && !recurrenceType) {
    await compactOpenTaskPriorities(existingTask.roomId);
    if (roomId !== existingTask.roomId) {
      await compactOpenTaskPriorities(roomId);
    }
  } else {
    await moveOpenTaskToPriority(existingTask.id, roomId, requestedPriority);
    if (roomId !== existingTask.roomId) {
      await compactOpenTaskPriorities(existingTask.roomId);
    }
  }

  refreshViews(["/", "/log", "/tasks"]);
  redirect(`${returnTo}?updated=${recordStatus === "done" ? "done" : "task"}#recorded`);
}

export async function renameRecordedTaskTitleAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");

  if (!taskId) {
    return;
  }

  if (!title) {
    redirectToReturnPath(returnTo, { error: "task-title-required" }, `task-${taskId}`);
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { title },
  });

  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      action: "task_updated",
    },
  });

  refreshViews(["/", "/log", "/tasks"]);
  redirectToReturnPath(returnTo, { updated: "task" }, `task-${task.id}`);
}

export async function updateTaskAssigneeAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");

  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true, roomId: true, title: true },
  });
  if (!task) {
    return;
  }

  await prisma.taskAssignment.updateMany({
    where: {
      taskId: task.id,
      assignedTo: null,
    },
    data: {
      assignedTo: new Date(),
    },
  });

  if (assigneeUserId) {
    const member = await resolveAssignableMemberUserId(householdId, assigneeUserId, task.roomId);

    if (member) {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: assigneeUserId,
          assignedFrom: new Date(),
        },
      });

      const recipientUserId = await resolveNotificationRecipientUserId(householdId, assigneeUserId);
      if (recipientUserId && recipientUserId !== actorUserId) {
        await notifyUser(
          recipientUserId,
          "task_assigned",
          {
            title: "JobJar",
            body: `You were assigned "${task.title}".`,
            url: `/tasks#task-${task.id}`,
          },
          task.id,
        );
      }
    }
  }

  await prisma.taskLog.create({
    data: { taskId: task.id, action: "assignee_changed", actorUserId, note: assigneeUserId || null },
  });

  refreshViews(["/", "/log", "/tasks"]);
  redirect(`${returnTo}${returnTo.includes("#") ? "" : `#task-${task.id}`}`);
}

export async function updateTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId } = await requireAdminAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!taskId) {
    return;
  }

  const existing = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: { householdId },
    },
    include: {
      schedule: true,
      projectParent: {
        select: { id: true },
      },
      assignments: {
        where: { assignedTo: null },
        orderBy: { assignedFrom: "desc" },
        take: 1,
      },
    },
  });
  if (!existing) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  const requestedTitle = String(formData.get("title") ?? existing.title).trim();
  if (!requestedTitle) {
    redirectToReturnPath(returnTo, { error: "task-title-required" });
    return;
  }

  const title = requestedTitle;
  const requestedRoomId = String(formData.get("roomId") ?? existing.roomId).trim() || existing.roomId;
  const detailNotes = formData.has("detailNotes") ? String(formData.get("detailNotes") ?? "").trim() || null : existing.detailNotes;
  const locationDetails = formData.has("locationDetails") ? String(formData.get("locationDetails") ?? "").trim() || null : existing.locationDetails;
  const jobKind = formData.has("jobKind") ? parseJobKind(formData.get("jobKind"), existing.jobKind) : existing.jobKind;
  const captureStage = formData.has("captureStage") ? parseCaptureStage(formData.get("captureStage"), existing.captureStage) : existing.captureStage;
  const requestedProjectParentId = formData.has("projectParentId")
    ? String(formData.get("projectParentId") ?? "").trim()
    : (existing.projectParentId ?? "");
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), existing.estimatedMinutes);
  const graceHours = toPositiveInt(formData.get("graceHours"), existing.graceHours);

  const validationMode = formData.has("strictMode")
    ? formData.get("strictMode") === "on"
      ? "strict"
      : "basic"
    : formData.has("strictModeMarker")
      ? "basic"
      : existing.validationMode;
  const minimumMinutes = toNonNegativeInt(formData.get("minimumMinutes"), existing.minimumMinutes);
  const dueAtRaw = formData.get("dueAt");
  const dueAt = toDate(dueAtRaw);
  const dueWasSupplied = dueAtRaw !== null;

  let roomId = existing.roomId;
  if (requestedRoomId !== existing.roomId) {
    const targetRoom = await prisma.room.findFirst({
      where: { id: requestedRoomId, householdId, active: true },
      select: { id: true },
    });
    if (targetRoom) {
      roomId = targetRoom.id;
    } else {
      redirectToReturnPath(returnTo, { error: "task-room-invalid" });
      return;
    }
  }

  const recurrenceType = formData.get("recurrenceType")
    ? parseRecurrenceType(formData.get("recurrenceType"))
    : (existing.schedule?.recurrenceType ?? null);
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), existing.schedule?.intervalCount ?? 1);
  const recurrenceTime = String(formData.get("recurrenceTime") ?? existing.schedule?.timeOfDay ?? "09:00").trim() || "09:00";
  const currentAssigneeUserId = existing.assignments[0]?.userId ?? "";
  const assigneeUserId = formData.has("assigneeUserId")
    ? String(formData.get("assigneeUserId") ?? "").trim()
    : currentAssigneeUserId;
  const projectParentId = await resolveProjectParentId(requestedProjectParentId, householdId, taskId);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      roomId,
      detailNotes,
      locationDetails,
      jobKind,
      captureStage,
      projectParentId,
      estimatedMinutes,
      graceHours,
      validationMode,
      minimumMinutes,
    },
  });

  await prisma.taskLog.create({
    data: { taskId, action: "task_updated", actorUserId },
  });

  if (recurrenceType) {
    await prisma.taskSchedule.upsert({
      where: { taskId },
      create: {
        taskId,
        recurrenceType,
        intervalCount: recurrenceInterval,
        timeOfDay: recurrenceTime,
        nextDueAt: dueAt,
        daysOfWeek: [],
      },
      update: {
        recurrenceType,
        intervalCount: recurrenceInterval,
        timeOfDay: recurrenceTime,
        ...(dueWasSupplied ? { nextDueAt: dueAt } : {}),
      },
    });
  } else {
    await prisma.taskSchedule.deleteMany({
      where: { taskId },
    });
  }

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

  if (dueWasSupplied && !dueAt) {
    await prisma.taskOccurrence.deleteMany({
      where: {
        taskId,
        status: { in: ["pending", "overdue", "skipped"] },
      },
    });
  }

  await prisma.taskAssignment.updateMany({
    where: { taskId, assignedTo: null },
    data: { assignedTo: new Date() },
  });

  if (assigneeUserId) {
    const assigneeMembership = await resolveAssignableMemberUserId(householdId, assigneeUserId, roomId);

    if (assigneeMembership) {
      await prisma.taskAssignment.create({
        data: {
          taskId,
          userId: assigneeUserId,
          assignedFrom: new Date(),
        },
      });
    }
  }

  refreshViews(["/", "/log", "/tasks"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { updated: "task" });
  }
}

export async function promoteTaskToProjectAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true, title: true, jobKind: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  if (task.jobKind !== "project") {
    await prisma.task.update({
      where: { id: task.id },
      data: { jobKind: "project" },
    });

    await prisma.taskLog.create({
      data: { taskId: task.id, action: "task_updated", actorUserId, note: "Promoted to project" },
    });
  }

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { updated: "project-promoted" }, `task-${task.id}`);
}

export async function demoteProjectToTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: {
      id: true,
      projectChildren: {
        where: { active: true },
        select: { id: true },
        take: 1,
      },
      projectCosts: {
        select: { id: true },
        take: 1,
      },
      projectMaterials: {
        select: { id: true },
        take: 1,
      },
      projectMilestones: {
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  const hasProjectContent =
    task.projectChildren.length > 0 ||
    task.projectCosts.length > 0 ||
    task.projectMaterials.length > 0 ||
    task.projectMilestones.length > 0;

  if (hasProjectContent) {
    redirectToReturnPath(returnTo, { error: "project-demote-blocked" }, `task-${task.id}`);
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      jobKind: "upkeep",
      projectTargetAt: null,
      projectBudgetCents: null,
    },
  });

  await prisma.taskLog.create({
    data: { taskId: task.id, action: "task_updated", actorUserId, note: "Returned project to job" },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  const destination = returnTo.startsWith("/projects") ? "/tasks" : returnTo;
  redirectToReturnPath(destination, { updated: "project-demoted" }, `task-${task.id}`);
}

export async function updateProjectPlanAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true, estimatedMinutes: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  const projectTargetAt = toDate(formData.get("projectTargetAt"));
  const projectBudgetCents = toCurrencyCentsOrNull(formData.get("projectBudget"));
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), task.estimatedMinutes);

  await prisma.task.update({
    where: { id: task.id },
    data: {
      jobKind: "project",
      estimatedMinutes,
      projectTargetAt,
      projectBudgetCents,
    },
  });

  await prisma.taskLog.create({
    data: { taskId: task.id, action: "task_updated", actorUserId, note: "Updated project plan" },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { updated: "project-plan" }, `task-${task.id}`);
}

export async function createProjectChildTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireProjectManagerAction();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const detailNotes = String(formData.get("detailNotes") ?? "").trim() || null;
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const dueAt = toDate(formData.get("dueAt"));
  const estimatedMinutes = toPositiveInt(formData.get("estimatedMinutes"), 30);
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!projectId) {
    return;
  }
  if (!title) {
    redirectToReturnPath(returnTo, { error: "project-child-title-required" }, `task-${projectId}`);
    return;
  }

  const project = await prisma.task.findFirst({
    where: {
      id: projectId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true, roomId: true, title: true },
  });
  if (!project) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  await prisma.task.update({
    where: { id: project.id },
    data: { jobKind: "project" },
  });

  const childTask = await prisma.task.create({
    data: {
      title,
      roomId: project.roomId,
      createdByUserId: actorUserId,
      detailNotes,
      jobKind: inferJobKindFromText(title),
      captureStage: "shaped",
      projectParentId: project.id,
      estimatedMinutes,
    },
    select: { id: true },
  });

  if (dueAt) {
    await prisma.taskOccurrence.create({
      data: {
        taskId: childTask.id,
        dueAt,
        status: "pending",
      },
    });
  }

  if (assigneeUserId) {
    const assigneeMembership = await resolveAssignableMemberUserId(householdId, assigneeUserId, project.roomId);

    if (assigneeMembership) {
      await prisma.taskAssignment.create({
        data: {
          taskId: childTask.id,
          userId: assigneeUserId,
          assignedFrom: new Date(),
        },
      });
    }
  }

  await prisma.taskLog.create({
    data: { taskId: childTask.id, action: "task_created", actorUserId, note: `Child of ${project.title}` },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { added: "project-child" }, `task-${project.id}`);
}

export async function createProjectCostAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amountCents = toCurrencyCentsOrNull(formData.get("amount"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) {
    return;
  }
  if (!title) {
    redirectToReturnPath(returnTo, { error: "project-cost-title-required" }, `task-${taskId}`);
    return;
  }
  if (amountCents === null || amountCents <= 0) {
    redirectToReturnPath(returnTo, { error: "project-cost-amount-invalid" }, `task-${taskId}`);
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  await prisma.projectCost.create({
    data: {
      taskId: task.id,
      title,
      amountCents,
    },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { added: "project-cost" }, `task-${task.id}`);
}

export async function deleteProjectCostAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const costId = String(formData.get("costId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId || !costId) {
    return;
  }

  const cost = await prisma.projectCost.findFirst({
    where: {
      id: costId,
      taskId,
      task: {
        room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      },
    },
    select: { id: true, taskId: true },
  });
  if (!cost) {
    redirectToReturnPath(returnTo, { error: "project-cost-not-found" }, `task-${taskId}`);
    return;
  }

  await prisma.projectCost.delete({
    where: { id: cost.id },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { removed: "project-cost" }, `task-${cost.taskId}`);
}

export async function createProjectMaterialAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const quantityLabel = String(formData.get("quantityLabel") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const estimatedCostCents = toCurrencyCentsOrNull(formData.get("estimatedCost"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/projects");
  if (!taskId) {
    return;
  }
  if (!title) {
    redirectToReturnPath(returnTo, { error: "project-material-title-required" }, `task-${taskId}`);
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  const maxSort = await prisma.projectMaterial.aggregate({
    where: { taskId: task.id },
    _max: { sortOrder: true },
  });

  await prisma.projectMaterial.create({
    data: {
      taskId: task.id,
      title,
      quantityLabel,
      source,
      estimatedCostCents,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { added: "project-material" }, `task-${task.id}`);
}

export async function toggleProjectMaterialPurchasedAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const materialId = String(formData.get("materialId") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || null;
  const actualCostCents = toCurrencyCentsOrNull(formData.get("actualCost"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/projects");
  if (!taskId || !materialId) {
    return;
  }

  const material = await prisma.projectMaterial.findFirst({
    where: {
      id: materialId,
      taskId,
      task: {
        room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      },
    },
    select: { id: true, taskId: true, purchasedAt: true, source: true },
  });
  if (!material) {
    redirectToReturnPath(returnTo, { error: "project-material-not-found" }, `task-${taskId}`);
    return;
  }

  await prisma.projectMaterial.update({
    where: { id: material.id },
    data: material.purchasedAt
      ? {
          purchasedAt: null,
          actualCostCents: null,
        }
      : {
          purchasedAt: new Date(),
          actualCostCents,
          source: source ?? material.source,
        },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { updated: "project-material" }, `task-${material.taskId}`);
}

export async function deleteProjectMaterialAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const materialId = String(formData.get("materialId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/projects");
  if (!taskId || !materialId) {
    return;
  }

  const material = await prisma.projectMaterial.findFirst({
    where: {
      id: materialId,
      taskId,
      task: {
        room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      },
    },
    select: { id: true, taskId: true },
  });
  if (!material) {
    redirectToReturnPath(returnTo, { error: "project-material-not-found" }, `task-${taskId}`);
    return;
  }

  await prisma.projectMaterial.delete({
    where: { id: material.id },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { removed: "project-material" }, `task-${material.taskId}`);
}

export async function createProjectMilestoneAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const targetAt = toDate(formData.get("targetAt"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/projects");
  if (!taskId) {
    return;
  }
  if (!title) {
    redirectToReturnPath(returnTo, { error: "project-milestone-title-required" }, `task-${taskId}`);
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  const maxSort = await prisma.projectMilestone.aggregate({
    where: { taskId: task.id },
    _max: { sortOrder: true },
  });

  await prisma.projectMilestone.create({
    data: {
      taskId: task.id,
      title,
      targetAt,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { added: "project-milestone" }, `task-${task.id}`);
}

export async function toggleProjectMilestoneAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/projects");
  if (!taskId || !milestoneId) {
    return;
  }

  const milestone = await prisma.projectMilestone.findFirst({
    where: {
      id: milestoneId,
      taskId,
      task: {
        room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      },
    },
    select: { id: true, taskId: true, completedAt: true },
  });
  if (!milestone) {
    redirectToReturnPath(returnTo, { error: "project-milestone-not-found" }, `task-${taskId}`);
    return;
  }

  await prisma.projectMilestone.update({
    where: { id: milestone.id },
    data: { completedAt: milestone.completedAt ? null : new Date() },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { updated: "project-milestone" }, `task-${milestone.taskId}`);
}

export async function deleteProjectMilestoneAction(formData: FormData) {
  const { householdId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/projects");
  if (!taskId || !milestoneId) {
    return;
  }

  const milestone = await prisma.projectMilestone.findFirst({
    where: {
      id: milestoneId,
      taskId,
      task: {
        room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      },
    },
    select: { id: true, taskId: true },
  });
  if (!milestone) {
    redirectToReturnPath(returnTo, { error: "project-milestone-not-found" }, `task-${taskId}`);
    return;
  }

  await prisma.projectMilestone.delete({
    where: { id: milestone.id },
  });

  refreshViews(["/", "/tasks", "/projects", "/projects/timeline", "/stats", "/admin"]);
  redirectToReturnPath(returnTo, { removed: "project-milestone" }, `task-${milestone.taskId}`);
}

export async function deleteTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId } = await requireAdminAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: { householdId },
    },
    select: { id: true, roomId: true, title: true },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { active: false },
  });

  await prisma.taskLog.create({
    data: { taskId: task.id, action: "task_deleted", actorUserId, note: task.title },
  });

  await compactOpenTaskPriorities(task.roomId);
  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { archived: "task" });
  }
}

export async function createPersonAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();
  const passcodeInput = String(formData.get("passcode") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const requestedAudienceBand = String(formData.get("audienceBand") ?? "").trim();
  const requestedProfileTheme = String(formData.get("profileTheme") ?? "").trim();
  const requestedLocationIds = parseLocationIds(formData.getAll("locationIds"));
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!displayName) {
    redirectToReturnPath(returnTo, { error: "person-name-required" });
    return;
  }

  const role = parseMemberRole(requestedRole, "member");
  const audienceBand = parseMemberAudience(requestedAudienceBand, "adult");
  const profileTheme = parseMemberProfileTheme(requestedProfileTheme, "default_theme");

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
    update: { role, audienceBand, profileTheme },
    create: {
      householdId,
      userId: user.id,
      role,
      audienceBand,
      profileTheme,
    },
  });

  await replaceMemberLocationAccess(householdId, user.id, requestedLocationIds);

  if (passcodeInput.length >= 4) {
    await setUserPasswordHash(user.id, hashPassword(passcodeInput));
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { added: "person" });
  }
}

export async function updatePersonRoleAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const role = parseMemberRole(requestedRole, "member");
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");
  if (!userId) {
    return;
  }

  if (userId === currentUserId && role !== "admin") {
    redirectToReturnPath(returnTo, { error: "person-role-self-admin-required" });
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await prisma.householdMember.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: { role },
  });

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=role`);
}

export async function updatePersonAudienceAction(formData: FormData) {
  const { householdId } = await requireProjectManagerAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedAudienceBand = String(formData.get("audienceBand") ?? "").trim();
  const audienceBand = parseMemberAudience(requestedAudienceBand, "adult");
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");

  if (!userId) {
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await prisma.householdMember.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: { audienceBand },
  });

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/stats", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=audience`);
}

export async function updatePersonProfileThemeAction(formData: FormData) {
  const { householdId } = await requireProjectManagerAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedProfileTheme = String(formData.get("profileTheme") ?? "").trim();
  const profileTheme = parseMemberProfileTheme(requestedProfileTheme, "default_theme");
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");

  if (!userId) {
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await prisma.householdMember.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: { profileTheme },
  });

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/stats", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=theme`);
}

export async function updatePersonLocationAccessAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");
  const requestedLocationIds = parseLocationIds(formData.getAll("locationIds"));
  if (!userId) {
    return;
  }

  if (userId === currentUserId) {
    redirectToReturnPath(returnTo, { error: "person-location-self-protected" });
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await replaceMemberLocationAccess(householdId, userId, requestedLocationIds);

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/stats", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=locations`);
}

export async function removePersonAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!userId) {
    return;
  }

  if (userId === currentUserId) {
    redirectToReturnPath(returnTo, { error: "person-remove-self-protected" });
    return;
  }

  await prisma.householdMember.deleteMany({
    where: { householdId, userId },
  });

  const openAssignmentIds = await prisma.taskAssignment.findMany({
    where: {
      userId,
      assignedTo: null,
      task: {
        room: { householdId },
      },
    },
    select: { id: true },
  });

  if (openAssignmentIds.length > 0) {
    await prisma.taskAssignment.updateMany({
      where: { id: { in: openAssignmentIds.map((entry) => entry.id) } },
      data: { assignedTo: new Date() },
    });
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { removed: "person" });
  }
}

export async function setPersonPasscodeAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!userId) {
    return;
  }

  if (passcode.length < 4) {
    redirectToReturnPath(returnTo, { error: "person-passcode-too-short" });
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    redirectToReturnPath(returnTo, { error: "person-not-found" });
    return;
  }

  await setUserPasswordHash(userId, hashPassword(passcode));
  refreshViews();
  if (returnTo) {
    redirectToReturnPath(returnTo, { updated: "passcode" });
  }
}

export async function startTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds, audienceBand } = await requireSessionMemberAction({ allowRestrictedChildAudience: true });
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      ...getAudienceAssignedTaskWhere(actorUserId, audienceBand),
    },
    select: { id: true },
  });
  if (!task) {
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { captureStage: "active" },
  });

  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      action: "started",
      actorUserId,
      atTime: new Date(),
    },
  });

  refreshViews();
}

export async function completeTaskAction(formData: FormData) {
  const { userId: currentUserId, householdId, allowedLocationIds, audienceBand } = await requireSessionMemberAction({ allowRestrictedChildAudience: true });
  const taskId = String(formData.get("taskId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) {
    return;
  }

  const now = new Date();
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      ...getAudienceAssignedTaskWhere(currentUserId, audienceBand),
    },
    select: {
      id: true,
      title: true,
      createdByUserId: true,
      validationMode: true,
      minimumMinutes: true,
      captureStage: true,
      schedule: {
        select: {
          recurrenceType: true,
          intervalCount: true,
          nextDueAt: true,
        },
      },
      occurrences: {
        orderBy: { dueAt: "desc" },
        take: 3,
        select: { id: true, status: true, dueAt: true },
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

  const lastStart = task.logs[0]?.atTime;
  if (task.validationMode === "strict") {
    if (note.length < 8) {
      redirectToReturnPath(returnTo, { error: "task-strict-note-required" });
      return;
    }

    if (!lastStart) {
      redirectToReturnPath(returnTo, { error: "task-strict-start-required" });
      return;
    }

    const minutesWorked = (now.getTime() - lastStart.getTime()) / 60000;
    if (minutesWorked < task.minimumMinutes) {
      redirectToReturnPath(returnTo, { error: "task-strict-minutes-required" });
      return;
    }
  }

  const isRecurring = Boolean(task.schedule);
  const openOccurrence = task.occurrences.find((occurrence) => occurrence.status !== "done") ?? null;
  const latestOccurrence = task.occurrences[0] ?? null;
  let completedOccurrenceId = openOccurrence?.id ?? latestOccurrence?.id ?? null;

  await prisma.task.update({
    where: { id: task.id },
    data: { captureStage: isRecurring ? "shaped" : "done" },
  });

  if (openOccurrence) {
    await prisma.taskOccurrence.update({
      where: { id: openOccurrence.id },
      data: {
        status: "done",
        completedAt: now,
        completedBy: currentUserId,
      },
    });
  } else if (latestOccurrence) {
    await prisma.taskOccurrence.update({
      where: { id: latestOccurrence.id },
      data: {
        status: "done",
        completedAt: now,
        completedBy: currentUserId,
      },
    });
  } else {
    const occurrence = await prisma.taskOccurrence.create({
      data: {
        taskId: task.id,
        dueAt: now,
        status: "done",
        completedAt: now,
        completedBy: currentUserId,
      },
      select: { id: true },
    });
    completedOccurrenceId = occurrence.id;
  }

  if (isRecurring && task.schedule) {
    if (isSimpleRecurrenceType(task.schedule.recurrenceType)) {
      const baseDueAt = openOccurrence?.dueAt ?? task.schedule.nextDueAt ?? now;
      const nextDueAt = calculateNextDueAt(baseDueAt, task.schedule.recurrenceType, task.schedule.intervalCount);
      await upsertSimpleSchedule(task.id, task.schedule.recurrenceType, task.schedule.intervalCount, nextDueAt);
      await upsertPendingOccurrence(task.id, nextDueAt);
    } else {
      await upsertPendingOccurrence(task.id, task.schedule.nextDueAt ?? now);
    }
  }

  const durationSeconds = lastStart ? Math.max(0, Math.floor((now.getTime() - lastStart.getTime()) / 1000)) : null;
  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      occurrenceId: completedOccurrenceId,
      action: "completed",
      actorUserId: currentUserId,
      atTime: now,
      note: note || null,
      durationSeconds,
    },
  });

  if (task.createdByUserId && task.createdByUserId !== currentUserId) {
    const [recipientUserId, actor] = await Promise.all([
      resolveNotificationRecipientUserId(householdId, task.createdByUserId),
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: { displayName: true },
      }),
    ]);

    if (recipientUserId && recipientUserId !== currentUserId) {
      await notifyUser(
        recipientUserId,
        "task_completed",
        {
          title: "JobJar",
          body: `"${task.title}" was completed by ${actor?.displayName ?? "someone"}.`,
          url: `/tasks#task-${task.id}`,
        },
        task.id,
      );
    }
  }

  refreshViews();
}

export async function acceptRewardAction(formData: FormData) {
  const { userId: actorUserId, householdId, allowedLocationIds, audienceBand } = await requireSessionMemberAction({ allowRestrictedChildAudience: true });
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");

  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      ...getAudienceAssignedTaskWhere(actorUserId, audienceBand),
    },
    select: {
      id: true,
      title: true,
      createdByUserId: true,
      rewardCents: true,
      rewardConfirmed: true,
      rewardPaidAt: true,
      assignments: {
        where: {
          userId: actorUserId,
          assignedTo: null,
        },
        take: 1,
        select: { userId: true },
      },
    },
  });

  if (!task || task.rewardCents === null || task.assignments.length === 0) {
    redirectToReturnPath(returnTo, { error: "reward-not-available" }, `task-${taskId}`);
    return;
  }

  if (task.rewardConfirmed || task.rewardPaidAt) {
    redirectToReturnPath(returnTo, { updated: "reward-accepted" }, `task-${task.id}`);
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { rewardConfirmed: true },
  });

  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      action: "task_updated",
      actorUserId,
      atTime: new Date(),
      note: "Reward accepted",
    },
  });

  if (task.createdByUserId && task.createdByUserId !== actorUserId) {
    const [recipientUserId, actor] = await Promise.all([
      resolveNotificationRecipientUserId(householdId, task.createdByUserId),
      prisma.user.findUnique({
        where: { id: actorUserId },
        select: { displayName: true },
      }),
    ]);

    if (recipientUserId && recipientUserId !== actorUserId) {
      await notifyUser(
        recipientUserId,
        "reward_accepted",
        {
          title: "JobJar",
          body: `${actor?.displayName ?? "Someone"} accepted "${task.title}" for ${formatCurrency(task.rewardCents)}.`,
          url: `/tasks#task-${task.id}`,
        },
        task.id,
      );
    }
  }

  refreshViews(["/", "/tasks", "/stats"]);
  redirectToReturnPath(returnTo, { updated: "reward-accepted" }, `task-${task.id}`);
}

export async function markRewardPaidAction(formData: FormData) {
  const { userId: actorUserId, householdId, allowedLocationIds, role } = await requireSessionMemberAction({ allowRestrictedChildAudience: true });
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");

  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: {
      id: true,
      title: true,
      createdByUserId: true,
      captureStage: true,
      rewardCents: true,
      rewardConfirmed: true,
      rewardPaidAt: true,
      assignments: {
        where: { assignedTo: null },
        orderBy: { assignedFrom: "desc" },
        take: 1,
        select: { userId: true },
      },
    },
  });

  if (!task || task.rewardCents === null) {
    redirectToReturnPath(returnTo, { error: "reward-not-available" }, `task-${taskId}`);
    return;
  }

  if (task.createdByUserId !== actorUserId && !isAdminRole(role)) {
    redirectToReturnPath(returnTo, { error: "reward-pay-not-allowed" }, `task-${task.id}`);
    return;
  }

  if (!task.rewardConfirmed) {
    redirectToReturnPath(returnTo, { error: "reward-pay-before-accept" }, `task-${task.id}`);
    return;
  }

  if (task.captureStage !== "done") {
    redirectToReturnPath(returnTo, { error: "reward-pay-before-complete" }, `task-${task.id}`);
    return;
  }

  if (task.rewardPaidAt) {
    redirectToReturnPath(returnTo, { updated: "reward-paid" }, `task-${task.id}`);
    return;
  }

  const paidAt = new Date();
  await prisma.task.update({
    where: { id: task.id },
    data: { rewardPaidAt: paidAt },
  });

  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      action: "task_updated",
      actorUserId,
      atTime: paidAt,
      note: "Reward paid",
    },
  });

  const assignedUserId = task.assignments[0]?.userId ?? null;
  if (assignedUserId && assignedUserId !== actorUserId) {
    const recipientUserId = await resolveNotificationRecipientUserId(householdId, assignedUserId);
    if (recipientUserId) {
      await notifyUser(
        recipientUserId,
        "reward_paid",
        {
          title: "JobJar",
          body: `${formatCurrency(task.rewardCents)} was marked paid for "${task.title}".`,
          url: `/tasks#task-${task.id}`,
        },
        task.id,
      );
    }
  }

  refreshViews(["/", "/tasks", "/stats"]);
  redirectToReturnPath(returnTo, { updated: "reward-paid" }, `task-${task.id}`);
}

export async function reopenTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds, audienceBand } = await requireSessionMemberAction({ allowRestrictedChildAudience: true });
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
      ...getAudienceAssignedTaskWhere(actorUserId, audienceBand),
    },
    select: { id: true },
  });
  if (!task) {
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { captureStage: "shaped" },
  });

  const latestOccurrence = await prisma.taskOccurrence.findFirst({
    where: { taskId: task.id },
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
      taskId: task.id,
      action: "reopened",
      actorUserId,
      atTime: new Date(),
      note: "Marked not done",
    },
  });

  refreshViews();
}

export async function bootstrapOwnerAction(formData: FormData) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    redirect("/login");
  }

  const displayName = String(formData.get("displayName") ?? "").trim() || "House Admin";
  const email = String(formData.get("email") ?? "").trim() || "owner@jobjar.app";
  const passcode = String(formData.get("passcode") ?? "").trim();

  if (passcode.length < 8) {
    redirect("/login?error=setup");
  }

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
    },
    select: { id: true },
  });

  await setUserPasswordHash(user.id, hashPassword(passcode));
  const householdId = await getOrCreateHouseholdForUser(user.id);
  await setSessionUserId(user.id, householdId);
  redirect("/");
}

export async function loginAction(formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    redirect("/login?error=rate-limited");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "").trim();
  const nextPath = String(formData.get("next") ?? "/").trim() || "/";

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const storedHash = await getUserPasswordHash(user.id);
  const householdPasscode = getHouseholdPasscode();
  const passcodeValid = storedHash
    ? verifyPassword(passcode, storedHash)
    : householdPasscode !== null && passcode === householdPasscode;
  if (!passcodeValid) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const householdId = await getOrCreateHouseholdForUser(user.id);
  await setSessionUserId(user.id, householdId);
  redirect(nextPath.startsWith("/") ? nextPath : "/");
}

export async function logoutAction(formData?: FormData) {
  await clearSession();

  const nextPath = formData ? getReturnPath(formData.get("next"), "") : "";
  const reason = formData ? String(formData.get("reason") ?? "").trim() : "";
  const params = new URLSearchParams();

  if (nextPath) {
    params.set("next", nextPath);
  }

  if (reason) {
    params.set("reason", reason);
  }

  const query = params.toString();
  redirect(query ? `/login?${query}` : "/login");
}

export async function updateNotificationSettingsAction(formData: FormData) {
  const { userId } = await requireSessionContext("/help");
  const returnTo = getReturnPath(formData.get("returnTo"), "/help");
  const notifyVia = parseNotifyChannel(String(formData.get("notifyVia") ?? "").trim(), "none");
  const phoneInput = String(formData.get("phone") ?? "").trim();
  const normalizedPhone = normalizePhoneNumber(phoneInput);

  if (phoneInput && !normalizedPhone) {
    redirectToReturnPath(returnTo, { error: "notification-phone-invalid" });
    return;
  }

  if (notifyVia === "sms" && !normalizedPhone) {
    redirectToReturnPath(returnTo, { error: "notification-phone-required" });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: normalizedPhone,
      notifyVia,
    },
  });

  refreshViews(["/help", "/settings/people"]);
  redirectToReturnPath(returnTo, { updated: "notifications" });
}

function toPositiveInt(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return fallback;
  }
  return num;
}

function toPositiveIntOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
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

function toCurrencyCentsOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
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
  return null;
}

function parseOptionalRecurrenceType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw;
  }
  return null;
}

function parseJobKind(value: FormDataEntryValue | null, fallback: "upkeep" | "issue" | "project" | "clear_out" | "outdoor" | "planning") {
  const raw = String(value ?? "").trim();
  if (raw === "upkeep" || raw === "issue" || raw === "project" || raw === "clear_out" || raw === "outdoor" || raw === "planning") {
    return raw;
  }
  return fallback;
}

function parseCaptureStage(value: FormDataEntryValue | null, fallback: "captured" | "shaped" | "active" | "done") {
  const raw = String(value ?? "").trim();
  if (raw === "captured" || raw === "shaped" || raw === "active" || raw === "done") {
    return raw;
  }
  return fallback;
}

function parseMemberRole(value: string, fallback: "admin" | "power_user" | "member" | "viewer") {
  if (value === "admin" || value === "power_user" || value === "member" || value === "viewer") {
    return value;
  }
  return fallback;
}

function parseMemberAudience(value: string, fallback: "adult" | "teen_12_18" | "under_12") {
  if (value === "adult" || value === "teen_12_18" || value === "under_12") {
    return value;
  }
  return fallback;
}

function parseMemberProfileTheme(value: string, fallback: "default_theme" | "boy_blue" | "girl_pink") {
  if (value === "default_theme" || value === "boy_blue" || value === "girl_pink") {
    return value;
  }
  return fallback;
}

function parseNotifyChannel(value: string, fallback: "sms" | "push" | "none") {
  if (value === "sms" || value === "push" || value === "none") {
    return value;
  }
  return fallback;
}

function inferJobKindFromText(text: string): "upkeep" | "issue" | "project" | "clear_out" | "outdoor" | "planning" {
  const value = text.toLowerCase();
  if (value.includes("garden") || value.includes("hedge") || value.includes("grass") || value.includes("plants")) {
    return "outdoor";
  }
  if (value.includes("attic") || value.includes("clear") || value.includes("dump") || value.includes("donat")) {
    return "clear_out";
  }
  if (value.includes("decorate") || value.includes("paint") || value.includes("renovat") || value.includes("redo")) {
    return "project";
  }
  if (value.includes("warning") || value.includes("tyre") || value.includes("repair") || value.includes("fix") || value.includes("car")) {
    return "issue";
  }
  if (value.includes("plan") || value.includes("sort") || value.includes("organ")) {
    return "planning";
  }
  return "upkeep";
}

function normalizePhoneNumber(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[\s()-]/g, "");
  if (!/^\+\d{8,15}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

async function resolveProjectParentId(
  projectParentId: string,
  householdId: string,
  currentTaskId?: string,
  allowedLocationIds?: string[] | null,
) {
  if (!projectParentId || projectParentId === currentTaskId) {
    return null;
  }

  const parent = await prisma.task.findFirst({
    where: {
      id: projectParentId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true },
  });

  return parent?.id ?? null;
}

function refreshViews(paths = ["/", "/log", "/tasks", "/admin", "/settings", "/settings/rooms", "/settings/people", "/settings/locations", "/login"]) {
  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}

function getReturnPath(value: FormDataEntryValue | null | undefined, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/")) {
    return fallback;
  }
  return raw;
}

function redirectToReturnPath(
  returnTo: string,
  params: Record<string, string>,
  hash?: string,
) {
  if (!returnTo) {
    return;
  }

  redirect(buildReturnPath(returnTo, params, hash));
}

function buildReturnPath(
  path: string,
  params: Record<string, string>,
  hash?: string,
) {
  const [pathWithoutHash, currentHash] = path.split("#", 2);
  const [pathname, search = ""] = pathWithoutHash.split("?", 2);
  const nextSearch = new URLSearchParams(search);

  for (const [key, value] of Object.entries(params)) {
    nextSearch.set(key, value);
  }

  const query = nextSearch.toString();
  const hashValue = hash ?? currentHash;
  return `${pathname}${query ? `?${query}` : ""}${hashValue ? `#${hashValue}` : ""}`;
}

async function resolveMemberUserId(householdId: string, userId: string) {
  if (!userId) {
    return null;
  }

  const member = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });

  return member?.userId ?? null;
}

function getAccessibleRoomWhere(householdId: string, allowedLocationIds: string[] | null | undefined) {
  return {
    householdId,
    ...(hasLocationRestrictions(allowedLocationIds) ? { locationId: { in: allowedLocationIds! } } : {}),
  };
}

function parseLocationIds(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

async function replaceMemberLocationAccess(householdId: string, userId: string, requestedLocationIds: string[]) {
  const validLocationIds = requestedLocationIds.length === 0
    ? []
    : (await prisma.location.findMany({
        where: {
          householdId,
          active: true,
          id: { in: requestedLocationIds },
        },
        select: { id: true },
      })).map((location) => location.id);

  await prisma.householdMemberLocationAccess.deleteMany({
    where: { householdId, userId },
  });

  if (validLocationIds.length > 0) {
    await prisma.householdMemberLocationAccess.createMany({
      data: validLocationIds.map((locationId) => ({
        householdId,
        userId,
        locationId,
      })),
    });
  }
}

async function resolveAssignableMemberUserId(householdId: string, userId: string, roomId: string) {
  if (!userId) {
    return null;
  }

  const [membership, room] = await Promise.all([
    prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
      select: {
        userId: true,
        role: true,
        locationAccess: {
          select: { locationId: true },
        },
      },
    }),
    prisma.room.findFirst({
      where: { id: roomId, householdId, active: true },
      select: { locationId: true },
    }),
  ]);

  if (!membership || !room) {
    return null;
  }

  if (membership.role === "admin" || membership.locationAccess.length === 0) {
    return membership.userId;
  }

  if (!room.locationId) {
    return null;
  }

  return membership.locationAccess.some((entry) => entry.locationId === room.locationId) ? membership.userId : null;
}

async function moveOpenTaskToPriority(taskId: string, roomId: string, desiredPriority: number | null) {
  const openTasks = await prisma.task.findMany({
    where: {
      active: true,
      roomId,
      captureStage: { not: "done" },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const orderedIds = openTasks.map((task) => task.id).filter((id) => id !== taskId);
  const targetIndex = desiredPriority ? Math.min(Math.max(desiredPriority - 1, 0), orderedIds.length) : orderedIds.length;
  orderedIds.splice(targetIndex, 0, taskId);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { priority: index + 1 },
      }),
    ),
  );
}

function calculateNextDueAt(base: Date, recurrenceType: "daily" | "weekly" | "monthly", interval: number) {
  const next = new Date(base);
  if (recurrenceType === "daily") {
    next.setDate(next.getDate() + interval);
    return next;
  }
  if (recurrenceType === "monthly") {
    next.setMonth(next.getMonth() + interval);
    return next;
  }
  next.setDate(next.getDate() + (interval * 7));
  return next;
}

function isSimpleRecurrenceType(value: string): value is "daily" | "weekly" | "monthly" {
  return value === "daily" || value === "weekly" || value === "monthly";
}

async function upsertSimpleSchedule(
  taskId: string,
  recurrenceType: "daily" | "weekly" | "monthly",
  intervalCount: number,
  nextDueAt: Date,
) {
  await prisma.taskSchedule.upsert({
    where: { taskId },
    create: {
      taskId,
      recurrenceType,
      intervalCount,
      daysOfWeek: [],
      timeOfDay: "09:00",
      nextDueAt,
    },
    update: {
      recurrenceType,
      intervalCount,
      nextDueAt,
      timeOfDay: "09:00",
    },
  });
}

async function upsertPendingOccurrence(taskId: string, dueAt: Date) {
  const pendingOccurrence = await prisma.taskOccurrence.findFirst({
    where: {
      taskId,
      status: { in: ["pending", "overdue", "skipped"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (pendingOccurrence) {
    await prisma.taskOccurrence.update({
      where: { id: pendingOccurrence.id },
      data: {
        dueAt,
        status: "pending",
        completedAt: null,
        completedBy: null,
      },
    });
    return;
  }

  await prisma.taskOccurrence.create({
    data: {
      taskId,
      dueAt,
      status: "pending",
    },
  });
}

async function compactOpenTaskPriorities(roomId: string) {
  const openTasks = await prisma.task.findMany({
    where: {
      active: true,
      roomId,
      captureStage: { not: "done" },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    openTasks.map((task, index) =>
      prisma.task.update({
        where: { id: task.id },
        data: { priority: index + 1 },
      }),
    ),
  );
}

async function requireAdminAction() {
  const context = await requireSessionContext("/admin");
  if (context.role !== "admin") {
    redirect("/");
  }
  return context;
}

async function requireProjectManagerAction() {
  const context = await requireSessionContext("/projects");
  if (!canManageProjectsRole(context.role)) {
    redirect("/");
  }
  return context;
}

async function requireSessionMemberAction(options?: { allowRestrictedChildAudience?: boolean }) {
  const context = await requireSessionContext("/");
  if (!canUseMemberActions(context.role)) {
    redirect("/");
  }
  if (!options?.allowRestrictedChildAudience && !canAccessExtendedViews(context.audienceBand)) {
    redirect("/tasks");
  }
  return context;
}

async function getOrCreateUnsortedRoomId(householdId: string) {
  const existingRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      name: {
        equals: "Unsorted",
        mode: "insensitive",
      },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  if (existingRoom) {
    return existingRoom.id;
  }

  const maxSort = await prisma.room.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  const room = await prisma.room.create({
    data: {
      householdId,
      name: "Unsorted",
      designation: "Tasks recorded without a room",
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });

  return room.id;
}
