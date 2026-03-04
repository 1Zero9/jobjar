import { prisma } from "@/lib/prisma";
import { rooms as demoRooms, tasks as demoTasks } from "@/lib/demo-data";
import { Room, TaskItem, TaskStatus } from "@/lib/types";

type DashboardData = {
  rooms: Room[];
  tasks: TaskItem[];
  source: "database" | "demo";
};

export async function getDashboardData(options: { householdId?: string } = {}): Promise<DashboardData> {
  try {
    const household = await prisma.household.findFirst({
      ...(options.householdId ? { where: { id: options.householdId } } : {}),
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
                  take: 5,
                },
                logs: {
                  where: { action: "started" },
                  orderBy: { atTime: "desc" },
                  take: 1,
                },
                assignments: {
                  where: { assignedTo: null },
                  orderBy: { assignedFrom: "desc" },
                  take: 1,
                  include: { user: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      ...(options.householdId ? {} : { orderBy: { createdAt: "asc" } }),
    });

    if (!household) {
      return { rooms: demoRooms, tasks: demoTasks, source: "demo" };
    }

    const rooms: Room[] = household.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      designation: room.designation,
    }));

    const tasks: TaskItem[] = household.rooms.flatMap((room) =>
      room.tasks.map((task) => {
        const latestOccurrence = task.occurrences[0];
        const pendingOccurrence = task.occurrences.find((entry) => entry.status !== "done");
        const statusSource = pendingOccurrence ?? latestOccurrence;
        const lastDone = task.occurrences.find((entry) => entry.status === "done");
        const status = mapOccurrenceStatus(statusSource?.status);
        return {
          id: task.id,
          roomId: room.id,
          title: task.title,
          dueAt: pendingOccurrence?.dueAt?.toISOString() ?? null,
          graceHours: task.graceHours,
          estimatedMinutes: task.estimatedMinutes,
          assigneeUserId: task.assignments[0]?.userId,
          assigneeName: task.assignments[0]?.user?.displayName,
          status,
          validationMode: parseValidationMode(task.description),
          minimumMinutes: parseMinimumMinutes(task.description),
          startedAt: task.logs[0]?.atTime.toISOString(),
          lastCompletedAt: lastDone?.completedAt?.toISOString(),
        };
      }),
    );

    return { rooms, tasks, source: "database" };
  } catch {
    return { rooms: demoRooms, tasks: demoTasks, source: "demo" };
  }
}

function mapOccurrenceStatus(status: string | undefined): TaskStatus {
  if (status === "done") {
    return "done";
  }
  if (status === "skipped") {
    return "skipped";
  }
  return "pending";
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
