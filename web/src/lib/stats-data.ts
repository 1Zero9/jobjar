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

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type StatsFilters = {
  allowedLocationIds?: string[] | null;
  userId?: string;
  period?: "week" | "month" | "all";
  includeRewards?: boolean;
};

export type RecentCompletion = {
  taskTitle: string;
  roomName: string;
  completedAt: string;
  personName: string | null;
};

export type StatsData = {
  householdCompletionsPeriod: number;
  personalCompletionsPeriod: number;
  completionStreak: number;
  openTasks: number;
  dueTodayTasks: number;
  attentionTasks: number;
  rewardSummary: {
    earnedCents: number;
    paidOutCents: number;
  };
  recentCompletions: RecentCompletion[];
};

export async function getStatsData(householdId: string, filters: StatsFilters = {}): Promise<StatsData> {
  const weekStart = startOfThisWeek();
  const monthStart = startOfThisMonth();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const {
    allowedLocationIds,
    userId,
    period = "month",
    includeRewards = true,
  } = filters;

  const restrictedLocationFilter =
    allowedLocationIds && allowedLocationIds.length > 0
      ? { locationId: { in: allowedLocationIds } }
      : {};

  const taskRoomWhere = {
    room: {
      householdId,
      ...restrictedLocationFilter,
    },
  };

  const periodStart = period === "week" ? weekStart : period === "month" ? monthStart : undefined;
  const periodCompletedAtWhere = periodStart ? { completedAt: { gte: periodStart } } : {};

  const [
    householdCompletionsPeriod,
    personalCompletionsPeriod,
    openTasks,
    dueTodayTasks,
    attentionTasks,
    recentDone,
    rewardTasks,
    personalCompletionDays,
  ] = await Promise.all([
    prisma.taskOccurrence.count({
      where: {
        status: "done",
        ...periodCompletedAtWhere,
        task: taskRoomWhere,
      },
    }),
    userId
      ? prisma.taskOccurrence.count({
          where: {
            status: "done",
            completedBy: userId,
            ...periodCompletedAtWhere,
            task: taskRoomWhere,
          },
        })
      : Promise.resolve(0),
    prisma.task.count({
      where: {
        active: true,
        captureStage: { not: "done" },
        ...taskRoomWhere,
      },
    }),
    prisma.task.count({
      where: {
        active: true,
        captureStage: { not: "done" },
        ...taskRoomWhere,
        OR: [
          { schedule: { is: { nextDueAt: { gte: todayStart, lte: todayEnd } } } },
          { occurrences: { some: { status: { not: "done" }, dueAt: { gte: todayStart, lte: todayEnd } } } },
        ],
      },
    }),
    prisma.task.count({
      where: {
        active: true,
        captureStage: { not: "done" },
        ...taskRoomWhere,
        OR: [
          { schedule: { is: { nextDueAt: { lt: todayStart } } } },
          { occurrences: { some: { status: { not: "done" }, dueAt: { lt: todayStart } } } },
        ],
      },
    }),
    prisma.taskOccurrence.findMany({
      where: {
        status: "done",
        ...periodCompletedAtWhere,
        task: taskRoomWhere,
      },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: {
        task: { select: { title: true, room: { select: { name: true } } } },
        completer: { select: { displayName: true } },
      },
    }),
    includeRewards && userId
      ? prisma.task.findMany({
          where: {
            active: true,
            rewardCents: { not: null },
            rewardPaidAt: periodStart ? { gte: periodStart } : { not: null },
            ...taskRoomWhere,
          },
          select: {
            rewardCents: true,
            createdByUserId: true,
            assignments: {
              where: { assignedTo: null },
              orderBy: { assignedFrom: "desc" },
              take: 1,
              select: { userId: true },
            },
          },
        })
      : Promise.resolve([]),
    userId
      ? prisma.taskOccurrence.findMany({
          where: {
            status: "done",
            completedBy: userId,
            completedAt: { gte: daysAgo(90) },
            task: taskRoomWhere,
          },
          orderBy: { completedAt: "desc" },
          take: 120,
          select: { completedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const rewardSummary = includeRewards && userId
    ? rewardTasks.reduce(
        (summary, task) => {
          const rewardCents = task.rewardCents ?? 0;
          const earnerUserId = task.assignments[0]?.userId ?? null;
          if (earnerUserId === userId) {
            summary.earnedCents += rewardCents;
          }
          if (task.createdByUserId === userId) {
            summary.paidOutCents += rewardCents;
          }
          return summary;
        },
        { earnedCents: 0, paidOutCents: 0 },
      )
    : { earnedCents: 0, paidOutCents: 0 };

  const recentCompletions: RecentCompletion[] = recentDone.map((occurrence) => ({
    taskTitle: occurrence.task.title,
    roomName: occurrence.task.room.name,
    completedAt: occurrence.completedAt!.toISOString(),
    personName: occurrence.completer?.displayName ?? null,
  }));

  return {
    householdCompletionsPeriod,
    personalCompletionsPeriod,
    completionStreak: computeCompletionDayStreak(personalCompletionDays.map((entry) => entry.completedAt)),
    openTasks,
    dueTodayTasks,
    attentionTasks,
    rewardSummary,
    recentCompletions,
  };
}

function computeCompletionDayStreak(values: Array<Date | null>) {
  const uniqueDays = new Set(
    values
      .filter((value): value is Date => Boolean(value))
      .map((value) => value.toISOString().slice(0, 10)),
  );

  const today = startOfToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let cursor = uniqueDays.has(today.toISOString().slice(0, 10)) ? today : yesterday;
  let streak = 0;

  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
