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
  recurrenceType: "daily" | "weekly" | "monthly" | "custom";
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
  const household = await prisma.household.findFirst({
    where: { id: options.householdId },
    include: {
      rooms: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          tasks: {
            where: { active: true },
            include: {
              projectParent: { select: { id: true, title: true } },
              projectChildren: { where: { active: true }, select: { id: true } },
              occurrences: {
                where: { status: { not: "done" } },
                orderBy: { dueAt: "asc" },
                take: 1,
                select: { dueAt: true, status: true },
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
          },
        },
      },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
    },
  });

  if (!household) {
    return { rooms: [], people: [], tasks: [] };
  }

  const rooms: AdminRoom[] = household.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    designation: room.designation,
    taskCount: room.tasks.length,
  }));

  const people: AdminPerson[] = household.members.map((member) => ({
    id: member.user.id,
    displayName: member.user.displayName,
    email: member.user.email,
    role: member.role,
  }));

  const tasks: AdminTask[] = household.rooms.flatMap((room) =>
    room.tasks.map((task) => {
      const pendingOccurrence = task.occurrences[0] ?? null;
      const schedule = task.schedule;
      const assignee = task.assignments[0];
      return {
        id: task.id,
        title: task.title,
        roomId: room.id,
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
        recurrenceType: schedule?.recurrenceType ?? "weekly",
        recurrenceInterval: schedule?.intervalCount ?? 1,
        recurrenceTime: schedule?.timeOfDay ?? "09:00",
        assigneeUserId: assignee?.userId ?? "",
      };
    }),
  );

  return { rooms, people, tasks };
}

