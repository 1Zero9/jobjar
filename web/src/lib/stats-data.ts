import { prisma } from "@/lib/prisma";
import { getProjectTaskWhere } from "@/lib/project-work";

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
  allowedLocationIds?: string[] | null;
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

export type ProjectOverview = {
  totalProjects: number;
  activeProjects: number;
  atRiskProjects: number;
  completeProjects: number;
  plannedBudgetCents: number;
  actualSpendCents: number;
};

export type ProjectSnapshot = {
  id: string;
  title: string;
  roomName: string;
  locationName: string | null;
  status: "planning" | "active" | "complete" | "at_risk";
  targetAt: string | null;
  budgetCents: number | null;
  actualSpendCents: number;
  overdueChildren: number;
  totalChildren: number;
  completedChildren: number;
  totalMaterials: number;
  purchasedMaterials: number;
  totalMilestones: number;
  completedMilestones: number;
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
  projectOverview: ProjectOverview;
  projects: ProjectSnapshot[];
};

export async function getStatsData(householdId: string, filters: StatsFilters = {}): Promise<StatsData> {
  const weekStart = startOfThisWeek();
  const monthStart = startOfThisMonth();
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const { locationId, allowedLocationIds, userId, period = "month" } = filters;
  const restrictedLocationFilter = locationId
    ? { locationId }
    : allowedLocationIds && allowedLocationIds.length > 0
      ? { locationId: { in: allowedLocationIds } }
      : {};

  const periodStart = period === "week" ? weekStart : period === "month" ? monthStart : undefined;

  const roomWhere = {
    householdId,
    ...restrictedLocationFilter,
  };

  const taskRoomWhere = {
    room: {
      householdId,
      ...restrictedLocationFilter,
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
    projectTasks,
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
    prisma.task.findMany({
      where: {
        active: true,
        ...taskRoomWhere,
        ...getProjectTaskWhere(),
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: {
        room: {
          select: {
            name: true,
            location: { select: { name: true } },
          },
        },
        projectChildren: {
          where: { active: true },
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
          select: {
            captureStage: true,
            schedule: { select: { nextDueAt: true } },
            occurrences: {
              orderBy: { dueAt: "desc" },
              take: 5,
              select: { status: true, dueAt: true },
            },
          },
        },
        projectCosts: {
          select: { amountCents: true },
        },
        projectMaterials: {
          select: { purchasedAt: true },
        },
        projectMilestones: {
          select: { targetAt: true, completedAt: true },
        },
      },
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

  const projects = projectTasks.map((task) => {
    const spentCents = task.projectCosts.reduce((sum, cost) => sum + cost.amountCents, 0);
    const totalChildren = task.projectChildren.length;
    const completedChildren = task.projectChildren.filter((child) => getTaskState(child) === "done").length;
    const overdueChildren = task.projectChildren.filter((child) => isOverdueProjectChild(child)).length;
    const totalMaterials = task.projectMaterials.length;
    const purchasedMaterials = task.projectMaterials.filter((material) => material.purchasedAt).length;
    const totalMilestones = task.projectMilestones.length;
    const completedMilestones = task.projectMilestones.filter((milestone) => milestone.completedAt).length;
    const overdueMilestones = task.projectMilestones.filter((milestone) => isOverdueMilestone(milestone)).length;
    const budgetExceeded = task.projectBudgetCents !== null && spentCents > task.projectBudgetCents;
    const complete = totalChildren > 0 ? completedChildren === totalChildren : task.captureStage === "done";
    const planning = totalChildren === 0 && totalMilestones === 0 && task.captureStage !== "done";
    const targetMissed =
      !complete && task.projectTargetAt !== null && new Date(task.projectTargetAt).getTime() < now.getTime();
    const atRisk = !complete && (budgetExceeded || overdueChildren > 0 || overdueMilestones > 0 || targetMissed);

    return {
      id: task.id,
      title: task.title,
      roomName: task.room.name,
      locationName: task.room.location?.name ?? null,
      status: complete ? "complete" : planning ? "planning" : atRisk ? "at_risk" : "active",
      targetAt: task.projectTargetAt?.toISOString() ?? null,
      budgetCents: task.projectBudgetCents,
      actualSpendCents: spentCents,
      overdueChildren,
      totalChildren,
      completedChildren,
      totalMaterials,
      purchasedMaterials,
      totalMilestones,
      completedMilestones,
    } satisfies ProjectSnapshot;
  });

  const projectOverview: ProjectOverview = {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === "active").length,
    atRiskProjects: projects.filter((project) => project.status === "at_risk").length,
    completeProjects: projects.filter((project) => project.status === "complete").length,
    plannedBudgetCents: projects.reduce((sum, project) => sum + (project.budgetCents ?? 0), 0),
    actualSpendCents: projects.reduce((sum, project) => sum + project.actualSpendCents, 0),
  };

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
    projectOverview,
    projects,
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

function getTaskState(task: { captureStage: string; occurrences: Array<{ status: string }> }) {
  if (task.captureStage === "done" || task.occurrences[0]?.status === "done") {
    return "done";
  }
  return "open";
}

function getOpenOccurrence<T extends { status: string; dueAt: Date }>(occurrences: T[]) {
  return occurrences.find((occurrence) => occurrence.status !== "done") ?? null;
}

function isOverdueProjectChild(child: {
  captureStage: string;
  schedule: { nextDueAt: Date | null } | null;
  occurrences: Array<{ status: string; dueAt: Date }>;
}) {
  if (getTaskState(child) === "done") {
    return false;
  }
  const dueAt = child.schedule?.nextDueAt ?? getOpenOccurrence(child.occurrences)?.dueAt ?? null;
  return dueAt ? dueAt.getTime() < Date.now() : false;
}

function isOverdueMilestone(milestone: { targetAt: Date | null; completedAt: Date | null }) {
  if (!milestone.targetAt || milestone.completedAt) {
    return false;
  }
  return milestone.targetAt.getTime() < Date.now();
}
