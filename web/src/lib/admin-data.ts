import { prisma } from "@/lib/prisma";

export type AdminRoom = {
  id: string;
  name: string;
  designation: string;
  taskCount: number;
};

export type AdminPerson = {
  id: string;
  displayName: string;
  email: string;
  role: string;
};

export type AdminTask = {
  id: string;
  title: string;
  roomId: string;
  detailNotes: string;
  locationDetails: string;
  jobKind: "upkeep" | "issue" | "project" | "clear_out" | "outdoor" | "planning";
  captureStage: "captured" | "shaped" | "active" | "done";
  projectParentId: string;
  projectParentTitle: string;
  childCount: number;
  estimatedMinutes: number;
  graceHours: number;
  dueAt: string | null;
  validationMode: "basic" | "strict";
  minimumMinutes: number;
  recurrenceType: "daily" | "weekly" | "monthly" | "custom" | "none";
  recurrenceInterval: number;
  recurrenceTime: string;
  assigneeUserId: string;
};

export type AdminData = {
  rooms: AdminRoom[];
  people: AdminPerson[];
  tasks: AdminTask[];
};

export async function getAdminData(options: { householdId: string }): Promise<AdminData> {
  const [roomsRaw, membersRaw, tasksRaw] = await Promise.all([
    prisma.room.findMany({
      where: { householdId: options.householdId, active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        designation: true,
        _count: {
          select: {
            tasks: {
              where: { active: true },
            },
          },
        },
      },
    }),
    prisma.householdMember.findMany({
      where: { householdId: options.householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        role: true,
        user: { select: { id: true, displayName: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId: options.householdId, active: true },
      },
      orderBy: [{ room: { sortOrder: "asc" } }, { priority: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        roomId: true,
        detailNotes: true,
        locationDetails: true,
        jobKind: true,
        captureStage: true,
        projectParentId: true,
        estimatedMinutes: true,
        graceHours: true,
        validationMode: true,
        minimumMinutes: true,
        projectParent: { select: { title: true } },
        projectChildren: { where: { active: true }, select: { id: true } },
        occurrences: {
          where: { status: { not: "done" } },
          orderBy: { dueAt: "asc" },
          take: 1,
          select: { dueAt: true },
        },
        schedule: {
          select: { recurrenceType: true, intervalCount: true, timeOfDay: true, nextDueAt: true },
        },
        assignments: {
          where: { assignedTo: null },
          orderBy: { assignedFrom: "desc" },
          take: 1,
          select: { userId: true },
        },
      },
    }),
  ]);

  const rooms: AdminRoom[] = roomsRaw.map((room) => ({
    id: room.id,
    name: room.name,
    designation: room.designation,
    taskCount: room._count.tasks,
  }));

  const people: AdminPerson[] = membersRaw.map((member) => ({
    id: member.user.id,
    displayName: member.user.displayName,
    email: member.user.email,
    role: member.role,
  }));

  const tasks: AdminTask[] = tasksRaw.map((task) => {
    const pendingOccurrence = task.occurrences[0] ?? null;
    const schedule = task.schedule;
    const assignee = task.assignments[0];
    return {
      id: task.id,
      title: task.title,
      roomId: task.roomId,
      detailNotes: task.detailNotes ?? "",
      locationDetails: task.locationDetails ?? "",
      jobKind: task.jobKind,
      captureStage: task.captureStage,
      projectParentId: task.projectParentId ?? "",
      projectParentTitle: task.projectParent?.title ?? "",
      childCount: task.projectChildren.length,
      estimatedMinutes: task.estimatedMinutes,
      graceHours: task.graceHours,
      dueAt: pendingOccurrence?.dueAt?.toISOString() ?? schedule?.nextDueAt?.toISOString() ?? null,
      validationMode: task.validationMode as "basic" | "strict",
      minimumMinutes: task.minimumMinutes,
      recurrenceType: schedule?.recurrenceType ?? "none",
      recurrenceInterval: schedule?.intervalCount ?? 1,
      recurrenceTime: schedule?.timeOfDay ?? "09:00",
      assigneeUserId: assignee?.userId ?? "",
    };
  });

  return { rooms, people, tasks };
}
