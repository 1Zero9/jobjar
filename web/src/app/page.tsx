import { HomeTaskList, type HomeTaskItem } from "@/app/components/HomeTaskList";
import { HomeQuickCaptureForm } from "@/app/components/HomeQuickCaptureForm";
import { DailyGoalsPanel } from "@/app/components/DailyGoalsPanel";
import { PageBrandStrip } from "@/app/components/PageBrandStrip";
import { ToastNotice } from "@/app/components/ToastNotice";
import { getTaskFeedbackMessage } from "@/app/components/task-feedback";
import { canAccessReportingViewsRole, canManagePeopleRole, canUseMemberActions, isMemberRole, requireSessionContext } from "@/lib/auth";
import { getLocationScopeLabel, getRoomLocationAccessWhere, hasLocationRestrictions } from "@/lib/location-access";
import {
  canAccessExtendedViews,
  getMemberThemeClassName,
  isChildAudience,
} from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { getVisibleTaskWhere } from "@/lib/project-work";
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
  const { householdId, userId, displayName, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext("/");
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const childMode = isChildAudience(audienceBand);
  const viewerMode = role === "viewer";
  const peopleManager = canManagePeopleRole(role);
  const canAct = canUseMemberActions(role);
  const canSeeExtended = canAccessExtendedViews(audienceBand);
  const canSeeReports = canAccessReportingViewsRole(role) && canSeeExtended;
  const canQuickCapture = canAct && canSeeExtended && !childMode;
  const memberMode = isMemberRole(role);
  const weekStart = startOfThisWeek();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);
  const visibleTaskWhere = getVisibleTaskWhere({
    householdId,
    userId,
    role,
    audienceBand,
    allowedLocationIds,
  });

  const visibleOpenTaskWhere = {
    ...visibleTaskWhere,
    active: true,
    captureStage: { not: "done" as const },
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
    projectMilestones: {
      select: { id: true, completedAt: true },
    },
  };

  const [
    locations,
    quickCaptureRooms,
    openTaskCount,
    setupPeopleCount,
    setupRoomCount,
    setupTaskCount,
    homeFeedRaw,
    completedThisWeek,
    completedToday,
    paidThisWeek,
    recentCompletionDays,
  ] = await Promise.all([
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
      where: visibleOpenTaskWhere,
      select: homeTaskSelect,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: viewerMode ? 24 : childMode ? 30 : 36,
    }),
    viewerMode
      ? Promise.resolve(0)
      : prisma.taskOccurrence.count({
          where: {
            status: "done",
            completedBy: userId,
            completedAt: { gte: weekStart },
            task: visibleTaskWhere,
          },
        }),
    viewerMode
      ? Promise.resolve(0)
      : prisma.taskOccurrence.count({
          where: {
            status: "done",
            completedBy: userId,
            completedAt: { gte: todayStart },
            task: visibleTaskWhere,
          },
        }),
    viewerMode
      ? Promise.resolve([])
      : prisma.task.findMany({
          where: {
            ...visibleTaskWhere,
            rewardCents: { not: null },
            rewardPaidAt: { gte: weekStart },
            assignments: { some: { userId, assignedTo: null } },
            active: true,
          },
          select: {
            rewardCents: true,
          },
        }),
    viewerMode
      ? Promise.resolve([])
      : prisma.taskOccurrence.findMany({
          where: {
            status: "done",
            completedBy: userId,
            completedAt: { gte: daysAgo(30) },
            task: visibleTaskWhere,
          },
          orderBy: { completedAt: "desc" },
          take: 90,
          select: { completedAt: true },
        }),
  ]);

  const locationScopeLabel = restrictedToLocations ? getLocationScopeLabel(locations, allowedLocationIds) : null;
  const showQuickCapture = canQuickCapture && (!restrictedToLocations || quickCaptureRooms.length > 0);
  const homeFeed = homeFeedRaw.map((task) => ({
    task,
    dueAt: task.occurrences[0]?.dueAt ?? task.schedule?.nextDueAt ?? null,
    assignedUserId: task.assignments[0]?.userId ?? null,
  }));
  const overdueTasks = dedupeTasks(
    homeFeed
      .filter((entry) => isHomeTaskOverdue(entry.dueAt, todayStart))
      .map((entry) => mapHomeTask(entry.task))
      .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
  ).slice(0, childMode ? 8 : 6);
  const dueTodayTasks = dedupeTasks(
    homeFeed
      .filter((entry) => isHomeTaskDueToday(entry.dueAt, todayStart, todayEnd))
      .map((entry) => mapHomeTask(entry.task))
      .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
  ).slice(0, childMode ? 8 : 6);
  const urgentIds = new Set([...overdueTasks, ...dueTodayTasks].map((task) => task.id));
  const assignedTasks = viewerMode
    ? []
    : dedupeTasks(
        homeFeed
          .filter((entry) => entry.assignedUserId === userId)
          .map((entry) => mapHomeTask(entry.task))
          .filter((task) => !urgentIds.has(task.id))
          .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
      ).slice(0, 6);
  const viewerOpenTasks = viewerMode
    ? dedupeTasks(
        homeFeed
          .map((entry) => mapHomeTask(entry.task))
          .filter((task) => !urgentIds.has(task.id))
          .sort((left, right) => compareDueDates(left.dueAt, right.dueAt)),
      ).slice(0, 6)
    : [];
  const childHomeTasks = childMode
    ? dedupeTasks([
        ...overdueTasks,
        ...dueTodayTasks,
        ...homeFeed
          .filter((entry) => entry.assignedUserId === userId)
          .map((entry) => mapHomeTask(entry.task)),
      ]).slice(0, 6)
    : [];
  const paidThisWeekCents = viewerMode ? 0 : paidThisWeek.reduce((sum, task) => sum + (task.rewardCents ?? 0), 0);
  const completionStreak = viewerMode ? 0 : computeCompletionDayStreak(recentCompletionDays.map((entry) => entry.completedAt));
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
            <PageBrandStrip
              className="today-brand-strip"
              trailing={<span className="session-chip">{displayName ?? "You"}</span>}
            />
            <h1 className="today-greeting">
              {childMode ? `${greeting} ${displayName ?? "there"}` : `${greeting}, ${displayName ?? "there"}.`}
            </h1>
            <p className="today-copy">
              {childMode
                ? childHomeTasks.length > 0
                  ? `You've got ${childHomeTasks.length} job${childHomeTasks.length === 1 ? "" : "s"} ready today.`
                  : "No jobs waiting right now. Nice work."
                : viewerMode
                  ? "See what needs attention and keep up with the household board."
                  : `See what needs doing now, log something fast, and keep the board moving.`}
            </p>
            {locationScopeLabel ? (
              <p className="landing-scope-note" title={`Current location scope: ${locationScopeLabel}`}>
                <span>Showing</span>
                <strong>{locationScopeLabel}</strong>
              </p>
            ) : null}
          </div>

          <div className="today-token-bar">
            <div className="today-token today-token-rose">
              <span className="today-token-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  <circle cx="8" cy="11.5" r="1.2" fill="currentColor"/>
                  <path d="M8 1L15 14H1L8 1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="today-token-body">
                <strong>{childMode ? childHomeTasks.length : overdueTasks.length}</strong>
                <span>{childMode ? "today" : "overdue"}</span>
              </div>
            </div>
            <div className="today-token today-token-amber">
              <span className="today-token-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="today-token-body">
                <strong>{childMode ? completedThisWeek : dueTodayTasks.length}</strong>
                <span>{childMode ? "this week" : "today"}</span>
              </div>
            </div>
            <div className={`today-token ${!viewerMode && completionStreak > 1 ? "today-token-blue today-token-active" : "today-token-blue"}`.trim()}>
              <span className="today-token-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M9 2L4 9h5l-2 5 7-8H9l1-4z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="today-token-body">
                <strong>{viewerMode ? openTaskCount : completionStreak}</strong>
                <span>{viewerMode ? "open" : "streak"}</span>
              </div>
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

        {!childMode && !viewerMode ? (
          <DailyGoalsPanel
            completedToday={completedToday}
            overdueCount={overdueTasks.length}
            streak={completionStreak}
          />
        ) : null}

        {showQuickCapture ? (
          <section className="today-section today-capture-section">
            <div className="today-section-head">
              <h2 className="today-section-title">What needs doing?</h2>
              <Link href="/log" className="recorded-row-edit recorded-row-edit-bright">
                Open full log
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
            emptyActionHref="/more"
            emptyActionLabel="Open more"
          />
        ) : (
          <>
            <HomeTaskList
              title="Needs attention"
              emptyMessage="Nothing overdue right now."
              tasks={overdueTasks}
              canAct={canAct}
              emptyActionHref="/tasks"
              emptyActionLabel="Open jobs"
            />

            <HomeTaskList
              title="Due today"
              emptyMessage="Nothing is due today."
              tasks={dueTodayTasks}
              canAct={canAct}
              emptyActionHref="/tasks"
              emptyActionLabel="Open jobs"
            />

            <HomeTaskList
              title={viewerMode ? "Open jobs" : memberMode ? "Assigned to you" : "Recently assigned to you"}
              emptyMessage={viewerMode ? "No open jobs right now." : memberMode ? "Nothing extra is assigned to you right now." : "Nothing new is assigned to you right now."}
              tasks={viewerMode ? viewerOpenTasks : assignedTasks}
              canAct={canAct}
              emptyActionHref={viewerMode ? "/help" : "/tasks"}
              emptyActionLabel={viewerMode ? "Open help" : "Open jobs"}
            />
          </>
        )}

        <section className="today-section">
          <div className="today-section-head">
            <h2 className="today-section-title">{viewerMode ? "Board snapshot" : "This week"}</h2>
          </div>
          <div className="today-week-summary">
            {viewerMode ? (
              <>
                <p>
                  <strong>{openTaskCount}</strong>
                  <span>open jobs</span>
                </p>
                <p>
                  <strong>{overdueTasks.length}</strong>
                  <span>need attention</span>
                </p>
                <p>
                  <strong>{dueTodayTasks.length}</strong>
                  <span>due today</span>
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        <section className="today-utility-links">
          <Link href="/tasks" className="today-utility-link">Open jobs</Link>
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
  projectMilestones: Array<{ id: string; completedAt: Date | null }>;
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
    milestoneTotal: task.projectMilestones.length,
    milestoneDone: task.projectMilestones.filter((m) => m.completedAt !== null).length,
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

function isHomeTaskOverdue(dueAt: Date | null, todayStart: Date) {
  return Boolean(dueAt && dueAt.getTime() < todayStart.getTime());
}

function isHomeTaskDueToday(dueAt: Date | null, todayStart: Date, todayEnd: Date) {
  return Boolean(dueAt && dueAt.getTime() >= todayStart.getTime() && dueAt.getTime() <= todayEnd.getTime());
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
