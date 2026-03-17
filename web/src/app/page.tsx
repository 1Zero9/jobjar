import { HomeTaskList, type HomeTaskItem } from "@/app/components/HomeTaskList";
import { HomeQuickCaptureForm } from "@/app/components/HomeQuickCaptureForm";
import { ToastNotice } from "@/app/components/ToastNotice";
import { getTaskFeedbackMessage } from "@/app/components/task-feedback";
import { canAccessReportingViewsRole, canManagePeopleRole, canUseMemberActions, isMemberRole, requireSessionContext } from "@/lib/auth";
import { getLocationScopeLabel, getRoomLocationAccessWhere, hasLocationRestrictions } from "@/lib/location-access";
import {
  canAccessExtendedViews,
  getAudienceAssignedTaskWhere,
  getMemberThemeClassName,
  isChildAudience,
} from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { getMemberVisibleTaskWhere } from "@/lib/project-work";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomeSearchParams = {
  added?: string;
  error?: string;
  taskId?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const { householdId, userId, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext("/");
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const childMode = isChildAudience(audienceBand);
  const peopleManager = canManagePeopleRole(role);
  const canAct = canUseMemberActions(role);
  const canSeeExtended = canAccessExtendedViews(audienceBand);
  const canSeeReports = canAccessReportingViewsRole(role) && canSeeExtended;
  const canQuickCapture = canAct && canSeeExtended && !childMode;
  const memberMode = isMemberRole(role);
  const taskAudienceWhere = getAudienceAssignedTaskWhere(userId, audienceBand);
  const memberVisibleTaskWhere = getMemberVisibleTaskWhere(role, userId);
  const weekStart = startOfThisWeek();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);

  const visibleOpenTaskWhere = {
    active: true,
    captureStage: { not: "done" as const },
    room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
    ...taskAudienceWhere,
    ...(Object.keys(memberVisibleTaskWhere).length > 0 ? memberVisibleTaskWhere : {}),
  };

  const homeTaskSelect = {
    id: true,
    title: true,
    captureStage: true,
    validationMode: true,
    rewardCents: true,
    room: {
      select: {
        name: true,
        location: {
          select: {
            name: true,
          },
        },
      },
    },
    projectParent: {
      select: {
        title: true,
      },
    },
    schedule: {
      select: {
        nextDueAt: true,
      },
    },
    occurrences: {
      where: { status: { not: "done" as const } },
      orderBy: { dueAt: "asc" as const },
      take: 1,
      select: {
        dueAt: true,
      },
    },
    assignments: {
      where: { assignedTo: null },
      orderBy: { assignedFrom: "desc" as const },
      take: 1,
      select: {
        userId: true,
        assignedFrom: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    },
  };

  const [
    currentUser,
    locations,
    quickCaptureRooms,
    openTaskCount,
    setupPeopleCount,
    setupRoomCount,
    setupTaskCount,
    overdueRaw,
    dueTodayRaw,
    assignedRaw,
    completedThisWeek,
    paidThisWeek,
    recentCompletionDays,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    restrictedToLocations
      ? prisma.location.findMany({
          where: { householdId, active: true, id: { in: allowedLocationIds! } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true },
        })
      : Promise.resolve([]),
    canQuickCapture
      ? prisma.room.findMany({
          where: {
            householdId,
            active: true,
            ...getRoomLocationAccessWhere(allowedLocationIds),
            name: { not: "Unsorted" },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.task.count({
      where: visibleOpenTaskWhere,
    }),
    role === "admin"
      ? prisma.householdMember.count({
          where: { householdId },
        })
      : Promise.resolve(0),
    role === "admin"
      ? prisma.room.count({
          where: {
            householdId,
            active: true,
            name: { not: "Unsorted" },
          },
        })
      : Promise.resolve(0),
    role === "admin"
      ? prisma.task.count({
          where: {
            active: true,
            room: { householdId },
          },
        })
      : Promise.resolve(0),
    prisma.task.findMany({
      where: {
        ...visibleOpenTaskWhere,
        OR: [
          { schedule: { is: { nextDueAt: { lt: todayStart } } } },
          { occurrences: { some: { status: { not: "done" }, dueAt: { lt: todayStart } } } },
        ],
      },
      select: homeTaskSelect,
      take: 12,
    }),
    prisma.task.findMany({
      where: {
        ...visibleOpenTaskWhere,
        OR: [
          { schedule: { is: { nextDueAt: { gte: todayStart, lte: todayEnd } } } },
          { occurrences: { some: { status: { not: "done" }, dueAt: { gte: todayStart, lte: todayEnd } } } },
        ],
      },
      select: homeTaskSelect,
      take: 12,
    }),
    prisma.task.findMany({
      where: {
        ...visibleOpenTaskWhere,
        assignments: { some: { userId, assignedTo: null } },
      },
      select: homeTaskSelect,
      take: 12,
    }),
    prisma.taskOccurrence.count({
      where: {
        status: "done",
        completedBy: userId,
        completedAt: { gte: weekStart },
        task: {
          room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        rewardCents: { not: null },
        rewardPaidAt: { gte: weekStart },
        assignments: { some: { userId, assignedTo: null } },
        room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
      },
      select: {
        rewardCents: true,
      },
    }),
    prisma.taskOccurrence.findMany({
      where: {
        status: "done",
        completedBy: userId,
        completedAt: { gte: daysAgo(30) },
        task: {
          room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 90,
      select: { completedAt: true },
    }),
  ]);

  const locationScopeLabel = restrictedToLocations ? getLocationScopeLabel(locations, allowedLocationIds) : null;
  const showQuickCapture = canQuickCapture && (!restrictedToLocations || quickCaptureRooms.length > 0);
  const overdueTasks = dedupeTasks(
    overdueRaw
      .map(mapHomeTask)
      .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
  ).slice(0, childMode ? 8 : 6);
  const dueTodayTasks = dedupeTasks(
    dueTodayRaw
      .map(mapHomeTask)
      .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
  ).slice(0, childMode ? 8 : 6);
  const urgentIds = new Set([...overdueTasks, ...dueTodayTasks].map((task) => task.id));
  const assignedTasks = dedupeTasks(
    assignedRaw
      .map(mapHomeTask)
      .filter((task) => !urgentIds.has(task.id))
      .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
  ).slice(0, 6);
  const childHomeTasks = childMode
    ? dedupeTasks([...overdueTasks, ...dueTodayTasks, ...assignedRaw.map(mapHomeTask)]).slice(0, 6)
    : [];
  const paidThisWeekCents = paidThisWeek.reduce((sum, task) => sum + (task.rewardCents ?? 0), 0);
  const completionStreak = computeCompletionDayStreak(recentCompletionDays.map((entry) => entry.completedAt));
  const greeting = getGreeting(childMode ? "Hey" : "Good");
  const setupReady = setupRoomCount > 0 && setupTaskCount > 0;
  const showSetupGuide = role === "admin" && !setupReady;

  return (
    <div className={`capture-shell ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="today-shell mx-auto flex w-full max-w-[46rem] flex-col gap-5">
        {params.added === "task" ? <ToastNotice message="Job recorded." tone="success" /> : null}
        {params.error ? <ToastNotice message={getTaskFeedbackMessage(params.error)} tone="error" /> : null}
        {params.added === "task" && params.taskId ? (
          <Link href={`/tasks#task-${params.taskId}`} className="view-task-link">
            View the job you just logged
          </Link>
        ) : null}

        <header className={`today-hero ${childMode ? "today-hero-kid" : ""}`.trim()}>
          <div className="today-hero-copy">
            <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
            <h1 className="today-greeting">
              {childMode ? `${greeting} ${currentUser?.displayName ?? "there"}` : `${greeting}, ${currentUser?.displayName ?? "there"}.`}
            </h1>
            <p className="today-copy">
              {childMode
                ? childHomeTasks.length > 0
                  ? `You've got ${childHomeTasks.length} job${childHomeTasks.length === 1 ? "" : "s"} ready today.`
                  : "No jobs waiting right now. Nice work."
                : `See what needs doing now, log something fast, and keep the board moving.`}
            </p>
            {locationScopeLabel ? (
              <p className="landing-scope-note" title={`Current location scope: ${locationScopeLabel}`}>
                <span>Showing</span>
                <strong>{locationScopeLabel}</strong>
              </p>
            ) : null}
          </div>

          <div className="today-metrics">
            <div className="today-metric">
              <span className="today-metric-label">{childMode ? "Today" : "Needs attention"}</span>
              <strong className="today-metric-value">{childMode ? childHomeTasks.length : overdueTasks.length}</strong>
            </div>
            <div className="today-metric">
              <span className="today-metric-label">{childMode ? "This week" : "Due today"}</span>
              <strong className="today-metric-value">{childMode ? completedThisWeek : dueTodayTasks.length}</strong>
            </div>
            <div className="today-metric">
              <span className="today-metric-label">{paidThisWeekCents > 0 ? "Earned" : childMode ? "Streak" : "Done this week"}</span>
              <strong className="today-metric-value">
                {paidThisWeekCents > 0 ? formatMoney(paidThisWeekCents) : childMode ? `${completionStreak} day${completionStreak === 1 ? "" : "s"}` : openTaskCount}
              </strong>
            </div>
          </div>
        </header>

        {showSetupGuide ? (
          <section className="today-section">
            <div className="today-section-head">
              <div>
                <h2 className="today-section-title">Finish setup</h2>
                <p className="today-copy today-copy-section">
                  Start with one room and one job. Add more people now if the board is shared.
                </p>
              </div>
              <Link href="/setup/start" className="recorded-row-edit recorded-row-edit-bright">
                Start here
              </Link>
            </div>
            <div className="today-week-summary">
              <p>
                <strong>{setupPeopleCount}</strong>
                <span>{setupPeopleCount === 1 ? "person" : "people"}</span>
              </p>
              <p>
                <strong>{setupRoomCount}</strong>
                <span>{setupRoomCount === 1 ? "room" : "rooms"}</span>
              </p>
              <p>
                <strong>{setupTaskCount}</strong>
                <span>{setupTaskCount === 1 ? "job" : "jobs"}</span>
              </p>
            </div>
          </section>
        ) : null}

        {showQuickCapture ? (
          <section className="today-section today-capture-section">
            <div className="today-section-head">
              <h2 className="today-section-title">What needs doing?</h2>
              <Link href="/log" className="recorded-row-edit recorded-row-edit-bright">
                Full log
              </Link>
            </div>
            <p className="today-copy today-copy-section">
              Type it, press add, and the app will save it to the room you used last time.
            </p>
            <HomeQuickCaptureForm rooms={quickCaptureRooms} requireRoom={restrictedToLocations} />
          </section>
        ) : null}

        {childMode ? (
          <HomeTaskList
            title="Your jobs"
            emptyMessage="No jobs waiting right now. Nice work."
            tasks={childHomeTasks}
            canAct={canAct}
            childMode
          />
        ) : (
          <>
            <HomeTaskList
              title="Needs attention"
              emptyMessage="Nothing overdue right now."
              tasks={overdueTasks}
              canAct={canAct}
            />

            <HomeTaskList
              title="Due today"
              emptyMessage="Nothing is due today."
              tasks={dueTodayTasks}
              canAct={canAct}
            />

            <HomeTaskList
              title={memberMode ? "Assigned to you" : "Recently assigned to you"}
              emptyMessage={memberMode ? "Nothing extra is assigned to you right now." : "Nothing new is assigned to you right now."}
              tasks={assignedTasks}
              canAct={canAct}
            />
          </>
        )}

        <section className="today-section">
          <div className="today-section-head">
            <h2 className="today-section-title">This week</h2>
          </div>
          <div className="today-week-summary">
            <p>
              <strong>{completedThisWeek}</strong>
              <span>done</span>
            </p>
            <p>
              <strong>{paidThisWeekCents > 0 ? formatMoney(paidThisWeekCents) : "No rewards yet"}</strong>
              <span>{paidThisWeekCents > 0 ? "paid out" : "paid rewards"}</span>
            </p>
            <p>
              <strong>{completionStreak} day{completionStreak === 1 ? "" : "s"}</strong>
              <span>streak</span>
            </p>
          </div>
        </section>

        <section className="today-utility-links">
          <Link href="/tasks" className="today-utility-link">See all jobs</Link>
          {canSeeReports ? <Link href="/stats" className="today-utility-link">Stats</Link> : null}
          {role === "admin" ? (
            <Link href={setupReady ? "/settings" : "/setup/start"} className="today-utility-link">
              {setupReady ? "Setup" : "Start here"}
            </Link>
          ) : peopleManager ? (
            <Link href="/settings/people" className="today-utility-link">People</Link>
          ) : null}
          <Link href="/more" className="today-utility-link">More</Link>
          <Link href="/help" className="today-utility-link">Help</Link>
        </section>
      </main>
    </div>
  );
}

function mapHomeTask(task: {
  id: string;
  title: string;
  captureStage: string;
  validationMode: string;
  rewardCents: number | null;
  room: { name: string; location: { name: string } | null };
  projectParent: { title: string } | null;
  schedule: { nextDueAt: Date | null } | null;
  occurrences: Array<{ dueAt: Date }>;
}) {
  return {
    id: task.id,
    title: task.title,
    captureStage: task.captureStage,
    validationMode: task.validationMode,
    roomName: task.room.name,
    locationName: task.room.location?.name ?? null,
    dueAt: task.occurrences[0]?.dueAt?.toISOString() ?? task.schedule?.nextDueAt?.toISOString() ?? null,
    rewardCents: task.rewardCents,
    projectParentTitle: task.projectParent?.title ?? null,
  } satisfies HomeTaskItem;
}

function dedupeTasks(tasks: HomeTaskItem[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) {
      return false;
    }
    seen.add(task.id);
    return true;
  });
}

function compareDueDates(left: string | null, right: string | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return new Date(left).getTime() - new Date(right).getTime();
}

function startOfThisWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
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

function computeCompletionDayStreak(values: Array<Date | null>) {
  const uniqueDays = new Set(
    values
      .filter((value): value is Date => Boolean(value))
      .map((value) => value.toISOString().slice(0, 10)),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

function getGreeting(prefix: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `${prefix} morning`;
  if (hour < 18) return `${prefix} afternoon`;
  return `${prefix} evening`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
