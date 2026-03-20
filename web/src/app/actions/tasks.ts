"use server";

import { canManageProjectsRole, isAdminRole, requireSessionContext } from "@/lib/auth";
import { hasLocationRestrictions } from "@/lib/location-access";
import { notifyUser, resolveNotificationRecipientUserId } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  toPositiveInt,
  toPositiveIntOrNull,
  toNonNegativeInt,
  toCurrencyCentsOrNull,
  toDate,
  parseRecurrenceType,
  parseOptionalRecurrenceType,
  parseJobKind,
  parseCaptureStage,
  inferJobKindFromText,
  resolveProjectParentId,
  getOrCreateUnsortedRoomId,
  moveOpenTaskToPriority,
  compactOpenTaskPriorities,
  upsertSimpleSchedule,
  upsertPendingOccurrence,
  calculateNextDueAt,
  isSimpleRecurrenceType,
  resolveMemberUserId,
  resolveAssignableMemberUserId,
  getAccessibleRoomWhere,
  getReturnPath,
  redirectToReturnPath,
  refreshViews,
  requireAdminAction,
  requireSessionMemberAction,
} from "@/app/actions/_utils";

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

  refreshViews(["/", "/log", "/tasks", "/setup/start"]);
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

export async function deleteTaskAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds, role } = await requireSessionContext("/tasks");
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!taskId) {
    return;
  }

  if (!canManageProjectsRole(role)) {
    redirectToReturnPath(returnTo, { error: "task-archive-not-allowed" });
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: {
      id: true,
      roomId: true,
      title: true,
      schedule: {
        select: { id: true },
      },
      occurrences: {
        orderBy: { dueAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
  if (!task) {
    redirectToReturnPath(returnTo, { error: "task-not-found" });
    return;
  }

  const taskIsCompleted = !task.schedule && task.occurrences[0]?.status === "done";
  if (!isAdminRole(role) && !taskIsCompleted) {
    redirectToReturnPath(returnTo, { error: "task-archive-complete-only" }, `task-${task.id}`);
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
  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people", "/setup/start", "/admin"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { archived: "task" });
  }
}
