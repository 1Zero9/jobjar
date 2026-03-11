"use server";

import { requireSessionContext, clearSession, getHouseholdPasscode, setSessionUserId } from "@/lib/auth";
import { getOrCreateHouseholdForUser } from "@/lib/household";
import { prisma } from "@/lib/prisma";
import { getUserPasswordHash, setUserPasswordHash } from "@/lib/auth-store";
import { hashPassword, verifyPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!name) {
    return;
  }

  const duplicateRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (duplicateRoom) {
    if (returnTo) {
      redirect(`${returnTo}?duplicate=room`);
    }
    return;
  }

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

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms"]);
  if (returnTo) {
    redirect(`${returnTo}?added=room`);
  }
}

export async function updateRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!roomId || !name) {
    return;
  }

  const duplicateRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      id: { not: roomId },
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (duplicateRoom) {
    if (returnTo) {
      redirect(`${returnTo}?duplicate=room`);
    }
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
  if (!roomId) {
    return;
  }

  const room = await prisma.room.findFirst({
    where: { id: roomId, householdId },
    select: { id: true },
  });
  if (!room) {
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
  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms"]);
}

export async function createTaskAction(formData: FormData) {
  const { householdId, userId } = await requireAdminAction();
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
  const description = buildValidationMeta(validationMode, minimumMinutes);

  const recurrenceType = parseRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const recurrenceTime = String(formData.get("recurrenceTime") ?? "").trim() || "09:00";
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();

  if (!title || !requestedRoomId) {
    return;
  }

  const room = await prisma.room.findFirst({
    where: { id: requestedRoomId, householdId, active: true },
    select: { id: true },
  });
  if (!room) {
    return;
  }

  const projectParentId = await resolveProjectParentId(projectParentIdInput, householdId);

  const task = await prisma.task.create({
    data: {
      title,
      roomId: room.id,
      createdByUserId: userId,
      detailNotes,
      locationDetails,
      jobKind,
      captureStage,
      projectParentId,
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
    const assigneeMembership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: assigneeUserId,
        },
      },
      select: { userId: true },
    });

    if (assigneeMembership) {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: assigneeUserId,
          assignedFrom: new Date(),
        },
      });
    }
  }

  refreshViews(["/", "/log", "/tasks"]);
}

export async function createQuickTaskAction(formData: FormData) {
  const { householdId, userId } = await requireSessionMemberAction();
  const title = String(formData.get("title") ?? "").trim();
  const requestedRoomId = String(formData.get("roomId") ?? "").trim();
  const requestedPriority = toPositiveIntOrNull(formData.get("priority"));
  const detailNotes = String(formData.get("detailNotes") ?? "").trim() || null;
  const recordStatus = String(formData.get("recordStatus") ?? "open").trim();
  const completedByUserId = String(formData.get("completedByUserId") ?? "").trim();
  const resolvedAt = toDate(formData.get("resolvedAt")) ?? new Date();
  const recurrenceType = parseOptionalRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const requestedNextDueAt = toDate(formData.get("nextDueAt"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/log");
  if (!title) {
    return;
  }

  let roomId = await getOrCreateUnsortedRoomId(householdId);
  if (requestedRoomId) {
    const room = await prisma.room.findFirst({
      where: {
        id: requestedRoomId,
        householdId,
        active: true,
      },
      select: { id: true },
    });

    if (room) {
      roomId = room.id;
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      roomId,
      createdByUserId: userId,
      jobKind: "upkeep",
      captureStage: recordStatus === "done" && !recurrenceType ? "done" : "captured",
      detailNotes,
      priority: recordStatus === "done" && !recurrenceType ? 999 : 1,
    },
    select: { id: true },
  });

  if (recordStatus !== "done" || recurrenceType) {
    await moveOpenTaskToPriority(task.id, roomId, requestedPriority);
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
  redirect(`${returnTo}?added=${recordStatus === "done" ? "done" : "task"}#recorded`);
}

export async function luckyDipAction(formData?: FormData) {
  const { householdId } = await requireSessionMemberAction();
  const returnTo = getReturnPath(formData?.get("returnTo"), "/tasks");

  const tasks = await prisma.task.findMany({
    where: {
      active: true,
      captureStage: { not: "done" },
      room: { householdId },
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
  const { householdId } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const requestedRoomId = String(formData.get("roomId") ?? "").trim();
  const requestedPriority = toPositiveIntOrNull(formData.get("priority"));
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const detailNotes = String(formData.get("detailNotes") ?? "").trim() || null;
  const recordStatus = String(formData.get("recordStatus") ?? "open").trim();
  const completedByUserId = String(formData.get("completedByUserId") ?? "").trim();
  const resolvedAt = toDate(formData.get("resolvedAt")) ?? new Date();
  const recurrenceType = parseOptionalRecurrenceType(formData.get("recurrenceType"));
  const recurrenceInterval = toPositiveInt(formData.get("recurrenceInterval"), 1);
  const requestedNextDueAt = toDate(formData.get("nextDueAt"));
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");

  if (!taskId || !title) {
    return;
  }

  const existingTask = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: { householdId },
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
    return;
  }

  let roomId = existingTask.roomId;
  if (requestedRoomId) {
    const room = await prisma.room.findFirst({
      where: {
        id: requestedRoomId,
        householdId,
        active: true,
      },
      select: { id: true },
    });
    if (room) {
      roomId = room.id;
    }
  } else {
    roomId = await getOrCreateUnsortedRoomId(householdId);
  }

  await prisma.task.update({
    where: { id: existingTask.id },
    data: {
      title,
      roomId,
      detailNotes,
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
    const member = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: assigneeUserId,
        },
      },
      select: { userId: true },
    });

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

      await prisma.taskLog.create({
        data: {
          taskId: existingTask.id,
          occurrenceId: occurrence.id,
          action: "completed",
          atTime: resolvedAt,
          note: detailNotes,
        },
      });
    }
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

export async function updateTaskAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
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
    return;
  }

  const title = String(formData.get("title") ?? existing.title).trim() || existing.title;
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

  const currentValidationMode = parseValidationMode(existing.description);
  const currentMinimum = parseMinimumMinutes(existing.description);
  const validationMode = formData.has("strictMode")
    ? formData.get("strictMode") === "on"
      ? "strict"
      : "basic"
    : formData.has("strictModeMarker")
      ? "basic"
      : currentValidationMode;
  const minimumMinutes = toNonNegativeInt(formData.get("minimumMinutes"), currentMinimum);
  const dueAtRaw = formData.get("dueAt");
  const dueAt = toDate(dueAtRaw);
  const dueWasSupplied = dueAtRaw !== null;
  const description = buildValidationMeta(validationMode, minimumMinutes);

  let roomId = existing.roomId;
  if (requestedRoomId !== existing.roomId) {
    const targetRoom = await prisma.room.findFirst({
      where: { id: requestedRoomId, householdId, active: true },
      select: { id: true },
    });
    if (targetRoom) {
      roomId = targetRoom.id;
    }
  }

  const recurrenceType = formData.get("recurrenceType")
    ? parseRecurrenceType(formData.get("recurrenceType"))
    : (existing.schedule?.recurrenceType ?? "weekly");
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
    const assigneeMembership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: assigneeUserId,
        },
      },
      select: { userId: true },
    });

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
}

export async function deleteTaskAction(formData: FormData) {
  const { householdId } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: { householdId },
    },
    select: { id: true, roomId: true },
  });
  if (!task) {
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { active: false },
  });
  await compactOpenTaskPriorities(task.roomId);
  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
}

export async function createPersonAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();
  const passcodeInput = String(formData.get("passcode") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!displayName) {
    return;
  }

  const role = requestedRole === "admin" ? "admin" : "member";

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
    update: { role },
    create: {
      householdId,
      userId: user.id,
      role,
    },
  });

  if (passcodeInput.length >= 4) {
    await setUserPasswordHash(user.id, hashPassword(passcodeInput));
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
  if (returnTo) {
    redirect(`${returnTo}?added=person`);
  }
}

export async function removePersonAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    return;
  }

  if (userId === currentUserId) {
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
}

export async function setPersonPasscodeAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "").trim();
  if (!userId || passcode.length < 4) {
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

  await setUserPasswordHash(userId, hashPassword(passcode));
  refreshViews();
}

export async function startTaskAction(formData: FormData) {
  const { householdId } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: { householdId },
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
      atTime: new Date(),
    },
  });

  refreshViews();
}

export async function completeTaskAction(formData: FormData) {
  const { userId: currentUserId, householdId } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!taskId) {
    return;
  }

  const now = new Date();
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: { householdId },
    },
    select: {
      id: true,
      description: true,
      captureStage: true,
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
  await prisma.task.update({
    where: { id: task.id },
    data: { captureStage: "done" },
  });
  if (lastOccurrenceId) {
    await prisma.taskOccurrence.update({
      where: { id: lastOccurrenceId },
      data: {
        status: "done",
        completedAt: now,
        completedBy: currentUserId,
      },
    });
  } else {
    await prisma.taskOccurrence.create({
      data: {
        taskId: task.id,
        dueAt: now,
        status: "done",
        completedAt: now,
        completedBy: currentUserId,
      },
    });
  }

  const durationSeconds = lastStart ? Math.max(0, Math.floor((now.getTime() - lastStart.getTime()) / 1000)) : null;
  await prisma.taskLog.create({
    data: {
      taskId: task.id,
      action: "completed",
      atTime: now,
      note: note || null,
      durationSeconds,
    },
  });

  refreshViews();
}

export async function reopenTaskAction(formData: FormData) {
  const { householdId } = await requireSessionMemberAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) {
    return;
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      room: { householdId },
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

  if (passcode.length < 4) {
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
  const passcodeValid = storedHash ? verifyPassword(passcode, storedHash) : passcode === getHouseholdPasscode();
  if (!passcodeValid) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const householdId = await getOrCreateHouseholdForUser(user.id);
  await setSessionUserId(user.id, householdId);
  redirect(nextPath.startsWith("/") ? nextPath : "/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
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

function buildValidationMeta(mode: "basic" | "strict", minimumMinutes: number) {
  if (mode === "strict") {
    return `validation=strict;min=${minimumMinutes}`;
  }
  return `validation=basic;min=${minimumMinutes}`;
}

async function resolveProjectParentId(projectParentId: string, householdId: string, currentTaskId?: string) {
  if (!projectParentId || projectParentId === currentTaskId) {
    return null;
  }

  const parent = await prisma.task.findFirst({
    where: {
      id: projectParentId,
      active: true,
      room: { householdId },
    },
    select: { id: true },
  });

  return parent?.id ?? null;
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

function refreshViews(paths = ["/", "/log", "/tasks", "/admin", "/settings", "/settings/rooms", "/settings/people", "/tv", "/login"]) {
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

async function requireSessionMemberAction() {
  const context = await requireSessionContext("/");
  if (context.role === "viewer") {
    redirect("/");
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
