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
  estimatedMinutes: number;
  graceHours: number;
  dueAt: string;
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

export async function getAdminData(): Promise<AdminData> {
  const household = await prisma.household.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      rooms: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          tasks: {
            where: { active: true },
            include: {
              occurrences: {
                orderBy: { dueAt: "desc" },
                take: 1,
              },
              schedule: true,
              assignments: {
                where: { assignedTo: null },
                orderBy: { assignedFrom: "desc" },
                take: 1,
              },
            },
          },
        },
      },
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
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
      const latestOccurrence = task.occurrences[0];
      const schedule = task.schedule;
      const assignee = task.assignments[0];
      return {
        id: task.id,
        title: task.title,
        roomId: room.id,
        estimatedMinutes: task.estimatedMinutes,
        graceHours: task.graceHours,
        dueAt: (latestOccurrence?.dueAt ?? new Date()).toISOString(),
        validationMode: parseValidationMode(task.description),
        minimumMinutes: parseMinimumMinutes(task.description),
        recurrenceType: schedule?.recurrenceType ?? "weekly",
        recurrenceInterval: schedule?.intervalCount ?? 1,
        recurrenceTime: schedule?.timeOfDay ?? "09:00",
        assigneeUserId: assignee?.userId ?? "",
      };
    }),
  );

  return { rooms, people, tasks };
}

function parseValidationMode(description: string | null): "basic" | "strict" {
  if (!description) {
    return "basic";
  }
  return description.includes("validation=strict") ? "strict" : "basic";
}

function parseMinimumMinutes(description: string | null): number {
  if (!description) {
    return 0;
  }
  const match = description.match(/min=(\d+)/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) || 0;
}
