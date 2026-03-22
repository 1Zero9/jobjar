import type { MemberAudience, MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVisibleTaskWhere } from "@/lib/project-work";

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
  role?: MemberRole;
  audienceBand?: MemberAudience;
  period?: "week" | "month" | "all";
  includeRewards?: boolean;
  locationId?: string | null;
  assignedUserId?: string | null;
  focusUserId?: string | null;
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
  boardMix: {
    onTrack: number;
    dueToday: number;
    attention: number;
  };
  rewardSummary: {
    earnedCents: number;
    paidOutCents: number;
  };
  completionSeries: Array<{
    label: string;
    shortLabel: string;
    count: number;
  }>;
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
    role,
    audienceBand,
    period = "month",
    includeRewards = true,
    locationId,
    assignedUserId,
    focusUserId,
  } = filters;

  const locationFilter = locationId
    ? { locationId }
    : allowedLocationIds && allowedLocationIds.length > 0
      ? { locationId: { in: allowedLocationIds } }
      : {};

  const assignmentFilter = assignedUserId
    ? {
        assignments: {
          some: {
            userId: assignedUserId,
            assignedTo: null,
          },
        },
      }
    : {};

  const completionUserId = focusUserId ?? userId ?? null;
  const visibleTaskWhere = userId && role && audienceBand
    ? getVisibleTaskWhere({
        householdId,
        userId,
        role,
        audienceBand,
        allowedLocationIds,
      })
    : {
        room: {
          householdId,
          ...locationFilter,
        },
      };

  const taskRoomWhere = {
    ...visibleTaskWhere,
    room: {
      householdId,
      ...locationFilter,
    },
  };

  const periodStart = period === "week" ? weekStart : period === "month" ? monthStart : undefined;
  const periodCompletedAtWhere = periodStart ? { completedAt: { gte: periodStart } } : {};
  const seriesRange = getCompletionSeriesRange(period);
  const seriesCompletedAtWhere = { completedAt: { gte: seriesRange.start } };

  const [
    householdCompletionsPeriod,
    personalCompletionsPeriod,
    openTasks,
    dueTodayTasks,
    attentionTasks,
    recentDone,
    rewardTasks,
    personalCompletionDays,
    seriesCompletions,
  ] = await Promise.all([
    prisma.taskOccurrence.count({
      where: {
        status: "done",
        ...periodCompletedAtWhere,
        task: taskRoomWhere,
      },
    }),
    completionUserId
      ? prisma.taskOccurrence.count({
          where: {
            status: "done",
            completedBy: completionUserId,
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
        ...assignmentFilter,
      },
    }),
    prisma.task.count({
      where: {
        active: true,
        captureStage: { not: "done" },
        ...taskRoomWhere,
        ...assignmentFilter,
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
        ...assignmentFilter,
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
    completionUserId
      ? prisma.taskOccurrence.findMany({
          where: {
            status: "done",
            completedBy: completionUserId,
            completedAt: { gte: daysAgo(90) },
            task: taskRoomWhere,
          },
          orderBy: { completedAt: "desc" },
          take: 120,
          select: { completedAt: true },
        })
      : Promise.resolve([]),
    prisma.taskOccurrence.findMany({
      where: {
        status: "done",
        ...seriesCompletedAtWhere,
        ...(completionUserId ? { completedBy: completionUserId } : {}),
        task: taskRoomWhere,
      },
      orderBy: { completedAt: "asc" },
      select: { completedAt: true },
    }),
  ]);

  const rewardSummary = includeRewards && completionUserId
    ? rewardTasks.reduce(
        (summary, task) => {
          const rewardCents = task.rewardCents ?? 0;
          const earnerUserId = task.assignments[0]?.userId ?? null;
          if (earnerUserId === completionUserId) {
            summary.earnedCents += rewardCents;
          }
          if (task.createdByUserId === completionUserId) {
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
    boardMix: {
      onTrack: Math.max(openTasks - dueTodayTasks - attentionTasks, 0),
      dueToday: dueTodayTasks,
      attention: attentionTasks,
    },
    rewardSummary,
    completionSeries: buildCompletionSeries(period, seriesCompletions.map((entry) => entry.completedAt)),
    recentCompletions,
  };
}

function getCompletionSeriesRange(period: "week" | "month" | "all") {
  if (period === "week") {
    return { start: daysAgo(6) };
  }
  if (period === "month") {
    return { start: daysAgo(27) };
  }
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1) };
}

function buildCompletionSeries(period: "week" | "month" | "all", values: Array<Date | null>) {
  const validValues = values.filter((value): value is Date => Boolean(value));

  if (period === "week") {
    const days = Array.from({ length: 7 }, (_, offset) => daysAgo(6 - offset));
    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const count = validValues.filter((value) => value.toISOString().slice(0, 10) === key).length;
      return {
        label: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(day),
        shortLabel: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(day),
        count,
      };
    });
  }

  if (period === "month") {
    const today = startOfToday();
    return Array.from({ length: 4 }, (_, index) => {
      const start = new Date(today);
      start.setDate(start.getDate() - ((3 - index) * 7) - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const count = validValues.filter((value) => value >= start && value <= end).length;
      return {
        label: `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(start)} to ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(end)}`,
        shortLabel: `W${index + 1}`,
        count,
      };
    });
  }

  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const count = validValues.filter((value) => {
      const valueKey = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
      return valueKey === monthKey;
    }).length;
    return {
      label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month),
      shortLabel: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(month),
      count,
    };
  });
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
