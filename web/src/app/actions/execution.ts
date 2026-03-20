"use server";

import { isAdminRole } from "@/lib/auth";
import { getAudienceAssignedTaskWhere } from "@/lib/member-audience";
import { notifyUser, resolveNotificationRecipientUserId } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  formatCurrency,
  upsertSimpleSchedule,
  upsertPendingOccurrence,
  calculateNextDueAt,
  isSimpleRecurrenceType,
  getAccessibleRoomWhere,
  getReturnPath,
  redirectToReturnPath,
  refreshViews,
  requireSessionMemberAction,
} from "@/app/actions/_utils";

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
