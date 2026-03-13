import { prisma } from "@/lib/prisma";
import { getPrivateTaskAccessWhere, getProjectTaskWhere } from "@/lib/project-work";

export type TimelineStatus = "all" | "upcoming" | "overdue" | "done";
export type TimelineWindow = "14" | "30" | "90" | "all";
export type TimelineEventKind = "project_target" | "milestone_target" | "milestone_done" | "child_due" | "child_done";
export type TimelineEventState = "upcoming" | "overdue" | "done";

export type ProjectTimelineFilters = {
  householdId: string;
  userId: string;
  role: "admin" | "power_user" | "member" | "viewer";
  locationId?: string;
  status?: TimelineStatus;
  window?: TimelineWindow;
};

export type ProjectTimelineEvent = {
  id: string;
  projectId: string;
  projectTitle: string;
  roomName: string;
  locationName: string | null;
  label: string;
  detail: string;
  assignedTo: string | null;
  when: string;
  kind: TimelineEventKind;
  state: TimelineEventState;
};

export type ProjectTimelineData = {
  events: ProjectTimelineEvent[];
  counts: {
    projects: number;
    overdue: number;
    upcoming: number;
    done: number;
    undatedProjects: number;
  };
};

export async function getProjectTimelineData({
  householdId,
  userId,
  role,
  locationId,
  status = "all",
  window = "30",
}: ProjectTimelineFilters): Promise<ProjectTimelineData> {
  const now = new Date();
  const futureLimit = getRelativeDate(now, window === "all" ? 36500 : Number(window));
  const pastLimit = getRelativeDate(now, window === "all" ? -36500 : -Number(window));
  const privateTaskAccess = role === "admin" ? undefined : getPrivateTaskAccessWhere(userId);

  const projects = await prisma.task.findMany({
    where: {
      active: true,
      room: {
        householdId,
        ...(locationId ? { locationId } : {}),
      },
      AND: [
        ...(privateTaskAccess ? [{ OR: privateTaskAccess }] : []),
        getProjectTaskWhere(),
      ],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      room: {
        select: {
          name: true,
          location: { select: { name: true } },
        },
      },
      assignments: {
        where: { assignedTo: null },
        orderBy: { assignedFrom: "desc" },
        take: 1,
        include: {
          user: { select: { displayName: true } },
        },
      },
      projectMilestones: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          targetAt: true,
          completedAt: true,
        },
      },
      projectChildren: {
        where: {
          active: true,
          ...(privateTaskAccess ? { OR: privateTaskAccess } : {}),
        },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        include: {
          assignments: {
            where: { assignedTo: null },
            orderBy: { assignedFrom: "desc" },
            take: 1,
            include: {
              user: { select: { displayName: true } },
            },
          },
          schedule: {
            select: { nextDueAt: true },
          },
          occurrences: {
            orderBy: { dueAt: "desc" },
            take: 8,
            select: {
              status: true,
              dueAt: true,
              completedAt: true,
            },
          },
        },
      },
    },
  });

  const events = projects.flatMap((project) => {
    const totalChildren = project.projectChildren.length;
    const completedChildren = project.projectChildren.filter((child) => getTaskState(child) === "done").length;
    const complete = totalChildren > 0 ? completedChildren === totalChildren : project.captureStage === "done";

    const projectEvents: ProjectTimelineEvent[] = [];

    if (project.projectTargetAt && !complete) {
      projectEvents.push({
        id: `target-${project.id}`,
        projectId: project.id,
        projectTitle: project.title,
        roomName: project.room.name,
        locationName: project.room.location?.name ?? null,
        label: project.title,
        detail: "Project target date",
        assignedTo: project.assignments[0]?.user?.displayName ?? null,
        when: project.projectTargetAt.toISOString(),
        kind: "project_target",
        state: project.projectTargetAt.getTime() < now.getTime() ? "overdue" : "upcoming",
      });
    }

    for (const milestone of project.projectMilestones) {
      if (milestone.completedAt) {
        projectEvents.push({
          id: `milestone-done-${milestone.id}`,
          projectId: project.id,
          projectTitle: project.title,
          roomName: project.room.name,
          locationName: project.room.location?.name ?? null,
          label: milestone.title,
          detail: "Milestone completed",
          assignedTo: null,
          when: milestone.completedAt.toISOString(),
          kind: "milestone_done",
          state: "done",
        });
        continue;
      }

      if (milestone.targetAt) {
        projectEvents.push({
          id: `milestone-target-${milestone.id}`,
          projectId: project.id,
          projectTitle: project.title,
          roomName: project.room.name,
          locationName: project.room.location?.name ?? null,
          label: milestone.title,
          detail: "Milestone target",
          assignedTo: null,
          when: milestone.targetAt.toISOString(),
          kind: "milestone_target",
          state: milestone.targetAt.getTime() < now.getTime() ? "overdue" : "upcoming",
        });
      }
    }

    for (const child of project.projectChildren) {
      const childAssignee = child.assignments[0]?.user?.displayName ?? null;
      const latestDone = child.occurrences.find((occurrence) => occurrence.status === "done" && occurrence.completedAt);
      const nextDueAt = child.schedule?.nextDueAt ?? getOpenOccurrence(child.occurrences)?.dueAt ?? null;

      if (getTaskState(child) !== "done" && nextDueAt) {
        projectEvents.push({
          id: `child-due-${child.id}`,
          projectId: project.id,
          projectTitle: project.title,
          roomName: project.room.name,
          locationName: project.room.location?.name ?? null,
          label: child.title,
          detail: "Project step due",
          assignedTo: childAssignee,
          when: nextDueAt.toISOString(),
          kind: "child_due",
          state: nextDueAt.getTime() < now.getTime() ? "overdue" : "upcoming",
        });
      }

      if (latestDone?.completedAt) {
        projectEvents.push({
          id: `child-done-${child.id}`,
          projectId: project.id,
          projectTitle: project.title,
          roomName: project.room.name,
          locationName: project.room.location?.name ?? null,
          label: child.title,
          detail: "Project step completed",
          assignedTo: childAssignee,
          when: latestDone.completedAt.toISOString(),
          kind: "child_done",
          state: "done",
        });
      }
    }

    return projectEvents;
  });

  const filteredEvents = events
    .filter((event) => matchesStatus(event, status))
    .filter((event) => matchesWindow(event, { now, futureLimit, pastLimit }))
    .sort((a, b) => {
      const aTime = new Date(a.when).getTime();
      const bTime = new Date(b.when).getTime();
      if (a.state === "done" && b.state === "done") {
        return bTime - aTime;
      }
      return aTime - bTime;
    });

  return {
    events: filteredEvents,
    counts: {
      projects: projects.length,
      overdue: filteredEvents.filter((event) => event.state === "overdue").length,
      upcoming: filteredEvents.filter((event) => event.state === "upcoming").length,
      done: filteredEvents.filter((event) => event.state === "done").length,
      undatedProjects: projects.filter((project) => hasNoDatedWork(project)).length,
    },
  };
}

function getRelativeDate(from: Date, deltaDays: number) {
  const next = new Date(from);
  next.setDate(next.getDate() + deltaDays);
  return next;
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

function matchesStatus(event: ProjectTimelineEvent, status: TimelineStatus) {
  if (status === "all") {
    return true;
  }
  return event.state === status;
}

function matchesWindow(
  event: ProjectTimelineEvent,
  limits: { now: Date; futureLimit: Date; pastLimit: Date },
) {
  const when = new Date(event.when).getTime();
  if (event.state === "overdue") {
    return when >= limits.pastLimit.getTime();
  }
  if (event.state === "done") {
    return when >= limits.pastLimit.getTime();
  }
  return when <= limits.futureLimit.getTime();
}

function hasNoDatedWork(project: {
  projectTargetAt: Date | null;
  projectMilestones: Array<{ targetAt: Date | null; completedAt: Date | null }>;
  projectChildren: Array<{
    schedule: { nextDueAt: Date | null } | null;
    occurrences: Array<{ status: string; dueAt: Date; completedAt: Date | null }>;
  }>;
}) {
  if (project.projectTargetAt) {
    return false;
  }
  if (project.projectMilestones.some((milestone) => milestone.targetAt || milestone.completedAt)) {
    return false;
  }
  return !project.projectChildren.some((child) => {
    const nextDueAt = child.schedule?.nextDueAt ?? getOpenOccurrence(child.occurrences)?.dueAt ?? null;
    const latestDone = child.occurrences.find((occurrence) => occurrence.status === "done" && occurrence.completedAt);
    return Boolean(nextDueAt || latestDone?.completedAt);
  });
}
