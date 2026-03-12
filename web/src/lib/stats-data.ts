import { prisma } from "@/lib/prisma";

function startOfThisWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type StatsFilters = {
  locationId?: string;
  userId?: string;
  period?: "week" | "month" | "all";
};

export type StatsPerson = {
  name: string;
  period: number;
  week: number;
};

export type StatsRoom = {
  name: string;
  locationName: string | null;
  openCount: number;
  doneThisPeriod: number;
};

export type StatsStreak = {
  taskTitle: string;
  roomName: string;
  streak: number;
};

export type RecentCompletion = {
  taskTitle: string;
  roomName: string;
  completedAt: string;
  personName: string | null;
};

export type StatsData = {
  completionsThisWeek: number;
  completionsThisMonth: number;
  completionsAllTime: number;
  openTasks: number;
  recurringHealth: { onTrack: number; dueToday: number; overdue: number };
  byPerson: StatsPerson[];
  byRoom: StatsRoom[];
  topStreaks: StatsStreak[];
  recentCompletions: RecentCompletion[];
};

export async function getStatsData(householdId: string, filters: StatsFilters = {}): Promise<StatsData> {
  const weekStart = startOfThisWeek();
  const monthStart = startOfThisMonth();
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const { locationId, userId, period = "month" } = filters;

  const periodStart = period === "week" ? weekStart : period === "month" ? monthStart : undefined;

  const roomWhere = {
    householdId,
    ...(locationId ? { locationId } : {}),
  };

  const taskRoomWhere = {
    room: {
      householdId,
      ...(locationId ? { locationId } : {}),
    },
  };

  const completedByFilter = userId ? { completedBy: userId } : {};

  const [
    weekCompletions,
    monthCompletions,
    allCompletions,
    openTasks,
    members,
    roomStats,
    recurringTasks,
    recentDone,
    periodOccurrences,
  ] = await Promise.all([
    prisma.taskOccurrence.count({
      where: { status: "done", completedAt: { gte: weekStart }, ...completedByFilter, task: taskRoomWhere },
    }),
    prisma.taskOccurrence.count({
      where: { status: "done", completedAt: { gte: monthStart }, ...completedByFilter, task: taskRoomWhere },
    }),
    prisma.taskOccurrence.count({
      where: { status: "done", ...completedByFilter, task: taskRoomWhere },
    }),
    prisma.task.count({
      where: { active: true, captureStage: { not: "done" }, ...taskRoomWhere },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.room.findMany({
      where: { ...roomWhere, active: true, name: { not: "Unsorted" } },
      orderBy: { sortOrder: "asc" },
      include: {
        location: { select: { name: true } },
        tasks: {
          where: { active: true },
          include: {
            occurrences: {
              where: {
                status: "done",
                ...(periodStart ? { completedAt: { gte: periodStart } } : {}),
                ...completedByFilter,
              },
              select: { id: true },
            },
          },
        },
      },
    }),
    prisma.task.findMany({
      where: { active: true, captureStage: { not: "done" }, ...taskRoomWhere, schedule: { isNot: null } },
      include: {
        room: { select: { name: true } },
        schedule: { select: { nextDueAt: true } },
        occurrences: {
          orderBy: { dueAt: "desc" },
          take: 10,
          select: { status: true, dueAt: true },
        },
      },
    }),
    prisma.taskOccurrence.findMany({
      where: {
        status: "done",
        ...(periodStart ? { completedAt: { gte: periodStart } } : {}),
        ...completedByFilter,
        task: taskRoomWhere,
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: {
        task: { select: { title: true, room: { select: { name: true } } } },
        completer: { select: { displayName: true } },
      },
    }),
    prisma.taskOccurrence.findMany({
      where: {
        status: "done",
        ...(periodStart ? { completedAt: { gte: periodStart } } : {}),
        ...completedByFilter,
        task: taskRoomWhere,
      },
      select: { completedBy: true, completedAt: true },
    }),
  ]);

  const byPerson: StatsPerson[] = (userId
    ? members.filter((m) => m.user.id === userId)
    : members
  )
    .map((member) => {
      const mine = periodOccurrences.filter((o) => o.completedBy === member.user.id);
      return {
        name: member.user.displayName,
        period: mine.length,
        week: mine.filter((o) => o.completedAt && o.completedAt >= weekStart).length,
      };
    })
    .filter((p) => p.period > 0)
    .sort((a, b) => b.period - a.period);

  const byRoom: StatsRoom[] = roomStats
    .map((room) => ({
      name: room.name,
      locationName: room.location?.name ?? null,
      openCount: room.tasks.filter((t) => t.captureStage !== "done").length,
      doneThisPeriod: room.tasks.reduce((sum, t) => sum + t.occurrences.length, 0),
    }))
    .filter((r) => r.openCount > 0 || r.doneThisPeriod > 0)
    .sort((a, b) => b.openCount - a.openCount);

  let onTrack = 0, dueToday = 0, overdue = 0;
  for (const task of recurringTasks) {
    const nextDue = task.schedule?.nextDueAt;
    if (!nextDue) { onTrack++; continue; }
    const dueTime = new Date(nextDue).getTime();
    if (dueTime < now.getTime()) overdue++;
    else if (dueTime <= todayEnd.getTime()) dueToday++;
    else onTrack++;
  }

  const topStreaks: StatsStreak[] = recurringTasks
    .map((task) => ({
      taskTitle: task.title,
      roomName: task.room.name,
      streak: computeStreak(task.occurrences),
    }))
    .filter((s) => s.streak >= 2)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  const recentCompletions: RecentCompletion[] = recentDone.map((o) => ({
    taskTitle: o.task.title,
    roomName: o.task.room.name,
    completedAt: o.completedAt!.toISOString(),
    personName: o.completer?.displayName ?? null,
  }));

  return {
    completionsThisWeek: weekCompletions,
    completionsThisMonth: monthCompletions,
    completionsAllTime: allCompletions,
    openTasks,
    recurringHealth: { onTrack, dueToday, overdue },
    byPerson,
    byRoom,
    topStreaks,
    recentCompletions,
  };
}

function computeStreak(occurrences: Array<{ status: string }>) {
  let streak = 0;
  for (const occ of occurrences) {
    if (occ.status === "done") streak++;
    else break;
  }
  return streak;
}
