"use server";

import { prisma } from "@/lib/prisma";
import {
  toPositiveInt,
  toCurrencyCentsOrNull,
  toDate,
  inferJobKindFromText,
  resolveProjectParentId,
  resolveAssignableMemberUserId,
  getAccessibleRoomWhere,
  getReturnPath,
  redirectToReturnPath,
  refreshViews,
  requireProjectManagerAction,
} from "@/app/actions/_utils";

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

export async function closeJobWithStepsAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) return;

  const task = await prisma.task.findFirst({
    where: { id: taskId, active: true, room: getAccessibleRoomWhere(householdId, allowedLocationIds) },
    select: {
      id: true,
      captureStage: true,
      schedule: { select: { recurrenceType: true } },
      projectChildren: { where: { active: true }, select: { id: true, captureStage: true } },
    },
  });
  if (!task || task.schedule) return;

  const now = new Date();

  // Close all open children
  const openChildren = task.projectChildren.filter((c) => c.captureStage !== "done");
  for (const child of openChildren) {
    await prisma.task.update({ where: { id: child.id }, data: { captureStage: "done" } });
    const existingOcc = await prisma.taskOccurrence.findFirst({ where: { taskId: child.id, status: { not: "done" } }, select: { id: true } });
    if (existingOcc) {
      await prisma.taskOccurrence.update({ where: { id: existingOcc.id }, data: { status: "done", completedAt: now, completedBy: actorUserId } });
    } else {
      await prisma.taskOccurrence.create({ data: { taskId: child.id, dueAt: now, status: "done", completedAt: now, completedBy: actorUserId } });
    }
    await prisma.taskLog.create({ data: { taskId: child.id, action: "completed", actorUserId, atTime: now, note: "Closed with parent job" } });
  }

  // Close the parent
  if (task.captureStage !== "done") {
    await prisma.task.update({ where: { id: task.id }, data: { captureStage: "done" } });
    const existingOcc = await prisma.taskOccurrence.findFirst({ where: { taskId: task.id, status: { not: "done" } }, select: { id: true } });
    if (existingOcc) {
      await prisma.taskOccurrence.update({ where: { id: existingOcc.id }, data: { status: "done", completedAt: now, completedBy: actorUserId } });
    } else {
      await prisma.taskOccurrence.create({ data: { taskId: task.id, dueAt: now, status: "done", completedAt: now, completedBy: actorUserId } });
    }
    await prisma.taskLog.create({ data: { taskId: task.id, action: "completed", actorUserId, atTime: now, note: "Closed all steps" } });
  }

  refreshViews(["/", "/tasks", "/stats"]);
  redirectToReturnPath(returnTo, { updated: "job-closed" });
}

export async function removeStepsAction(formData: FormData) {
  const { householdId, userId: actorUserId, allowedLocationIds } = await requireProjectManagerAction();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/tasks");
  if (!taskId) return;

  const task = await prisma.task.findFirst({
    where: { id: taskId, active: true, room: getAccessibleRoomWhere(householdId, allowedLocationIds) },
    select: { id: true },
  });
  if (!task) return;

  // Archive all child steps and reset parent to a plain job
  await prisma.task.updateMany({ where: { projectParentId: task.id, active: true }, data: { active: false } });
  await prisma.task.update({ where: { id: task.id }, data: { jobKind: "upkeep" } });
  await prisma.taskLog.create({ data: { taskId: task.id, action: "task_updated", actorUserId, note: "Removed steps — back to single job" } });

  refreshViews(["/", "/tasks", "/stats"]);
  redirectToReturnPath(returnTo, { updated: "steps-removed" }, `task-${task.id}`);
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
