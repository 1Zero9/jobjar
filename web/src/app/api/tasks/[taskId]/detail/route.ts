import { getSessionContext, isAdminRole } from "@/lib/auth";
import { hasLocationRestrictions } from "@/lib/location-access";
import { canAccessExtendedViews, getAudienceAssignedTaskWhere } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { getMemberVisibleTaskWhere, getPrivateTaskAccessWhere } from "@/lib/project-work";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  const privateTaskAccess = isAdminRole(session.role) ? undefined : getPrivateTaskAccessWhere(session.userId);
  const memberVisibleTaskWhere = getMemberVisibleTaskWhere(session.role, session.userId);
  const taskAudienceWhere = getAudienceAssignedTaskWhere(session.userId, session.audienceBand);

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      active: true,
      room: {
        householdId: session.householdId,
        ...(hasLocationRestrictions(session.allowedLocationIds) ? { locationId: { in: session.allowedLocationIds! } } : {}),
      },
      ...taskAudienceWhere,
      ...(Object.keys(memberVisibleTaskWhere).length > 0 ? memberVisibleTaskWhere : {}),
      ...(privateTaskAccess ? { OR: privateTaskAccess } : {}),
    },
    select: {
      detailNotes: true,
      priority: true,
      isPrivate: true,
      logger: {
        select: {
          displayName: true,
        },
      },
      schedule: {
        select: {
          recurrenceType: true,
          intervalCount: true,
          nextDueAt: true,
        },
      },
      occurrences: {
        orderBy: { dueAt: "desc" },
        take: canAccessExtendedViews(session.audienceBand) ? 10 : 4,
        select: {
          status: true,
          dueAt: true,
          completedAt: true,
          completedBy: true,
          completer: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    detail: {
      detailNotes: task.detailNotes ?? null,
      loggerName: task.logger?.displayName ?? null,
      priority: task.priority,
      isPrivate: task.isPrivate,
      schedule: task.schedule
        ? {
            recurrenceType: task.schedule.recurrenceType,
            intervalCount: task.schedule.intervalCount,
            nextDueAt: task.schedule.nextDueAt?.toISOString() ?? null,
          }
        : null,
      occurrences: task.occurrences.map((occurrence) => ({
        status: occurrence.status,
        dueAt: occurrence.dueAt.toISOString(),
        completedAt: occurrence.completedAt?.toISOString() ?? null,
        completedBy: occurrence.completedBy ?? null,
        completerName: occurrence.completer?.displayName ?? null,
      })),
    },
  });
}
