import { prisma } from "@/lib/prisma";
import { rooms as demoRooms, tasks as demoTasks } from "@/lib/demo-data";
import { Room, TaskItem, TaskStatus } from "@/lib/types";

type DashboardData = {
  rooms: Room[];
  tasks: TaskItem[];
  source: "database" | "demo";
};

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const households = await prisma.household.findMany({
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
                logs: {
                  where: { action: "started" },
                  orderBy: { atTime: "desc" },
                  take: 1,
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 1,
    });

    const household = households[0];
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
        const dueAt = latestOccurrence?.dueAt ?? new Date();
        const status = mapOccurrenceStatus(latestOccurrence?.status);
        return {
          id: task.id,
          roomId: room.id,
          title: task.title,
          dueAt: dueAt.toISOString(),
          graceHours: task.graceHours,
          estimatedMinutes: task.estimatedMinutes,
          status,
          validationMode: parseValidationMode(task.description),
          minimumMinutes: parseMinimumMinutes(task.description),
          startedAt: task.logs[0]?.atTime.toISOString(),
          lastCompletedAt: latestOccurrence?.completedAt?.toISOString(),
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
