import { logoutAction } from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { AutoSubmitSelect } from "@/app/components/AutoSubmitSelect";
import { FormActionButton } from "@/app/components/FormActionButton";
import { isAdminRole, requireSessionContext } from "@/lib/auth";
import { hasLocationRestrictions } from "@/lib/location-access";
import { canAccessExtendedViews, getMemberThemeClassName } from "@/lib/member-audience";
import {
  getProjectTimelineData,
  type ProjectTimelineEvent,
  type TimelineStatus,
  type TimelineWindow,
} from "@/lib/project-timeline";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = {
  location?: string;
  status?: string;
  window?: string;
};

export default async function ProjectsTimelinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { householdId, userId, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext("/projects/timeline");
  if (!canAccessExtendedViews(audienceBand)) {
    redirect("/tasks");
  }
  const params = await searchParams;
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);

  const [currentUser, locations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.location.findMany({
      where: { householdId, active: true, ...(restrictedToLocations ? { id: { in: allowedLocationIds! } } : {}) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const selectedLocationId = locations.some((location) => location.id === params.location) ? params.location ?? "" : "";
  const selectedStatus: TimelineStatus =
    params.status === "upcoming" || params.status === "overdue" || params.status === "done"
      ? params.status
      : "all";
  const selectedWindow: TimelineWindow =
    params.window === "14" || params.window === "90" || params.window === "all"
      ? params.window
      : "30";

  const timeline = await getProjectTimelineData({
    householdId,
    userId,
    role,
    locationId: selectedLocationId || undefined,
    allowedLocationIds,
    status: selectedStatus,
    window: selectedWindow,
  });

  const overdueEvents = timeline.events.filter((event) => event.state === "overdue");
  const upcomingEvents = timeline.events.filter((event) => event.state === "upcoming");
  const doneEvents = timeline.events.filter((event) => event.state === "done");

  return (
    <div className={`capture-shell page-timeline ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="mx-auto flex w-full max-w-[34rem] flex-col gap-6">
        <AppPageHeader
          title="Project timeline"
          subtitle="See overdue dates, upcoming checkpoints, and recent completions across project work."
          iconClassName="timeline"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          }
          actions={
            <>
              <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
              <Link href="/" className="action-btn subtle quiet">
                Home
              </Link>
              <Link href="/projects" className="action-btn subtle quiet">
                Board
              </Link>
              <Link href="/stats" className="action-btn subtle quiet">
                Stats
              </Link>
              {isAdminRole(role) ? (
                <Link href="/settings" className="action-btn subtle quiet">
                  Setup
                </Link>
              ) : null}
              <form action={logoutAction}>
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                  Log out
                </FormActionButton>
              </form>
            </>
          }
        />

        <form method="GET" className="stats-filter-bar">
          {locations.length > 1 ? (
            <label className="stats-filter-field">
              <span className="stats-filter-label">Location</span>
              <AutoSubmitSelect name="location" defaultValue={selectedLocationId} className="stats-filter-select">
                <option value="">All locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}

          <label className="stats-filter-field">
            <span className="stats-filter-label">Status</span>
            <AutoSubmitSelect name="status" defaultValue={selectedStatus} className="stats-filter-select">
              <option value="all">Everything</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
              <option value="done">Recently done</option>
            </AutoSubmitSelect>
          </label>

          <label className="stats-filter-field">
            <span className="stats-filter-label">Window</span>
            <AutoSubmitSelect name="window" defaultValue={selectedWindow} className="stats-filter-select">
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="all">All dates</option>
            </AutoSubmitSelect>
          </label>
        </form>

        <section className="stats-summary-grid">
          <div className="stat-card">
            <span className="stat-number">{timeline.counts.projects}</span>
            <span className="stat-label">Projects</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{timeline.counts.overdue}</span>
            <span className="stat-label">Overdue items</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{timeline.counts.upcoming}</span>
            <span className="stat-label">Upcoming items</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{timeline.counts.undatedProjects}</span>
            <span className="stat-label">Undated projects</span>
          </div>
        </section>

        {timeline.events.length === 0 ? (
          <section className="stats-panel">
            <p className="settings-kicker">Timeline</p>
            <h2 className="recorded-title">Nothing scheduled yet</h2>
            <p className="recorded-empty">
              Add target dates, milestone dates, or project step due dates from the project board to build the timeline.
            </p>
          </section>
        ) : (
          <>
            <TimelineSection
              title="Overdue now"
              kicker="Needs attention"
              emptyText="No overdue project dates in this window."
              events={overdueEvents}
            />
            <TimelineSection
              title="Coming up"
              kicker="Upcoming"
              emptyText="No upcoming project dates in this window."
              events={upcomingEvents}
            />
            <TimelineSection
              title="Recently done"
              kicker="Completed"
              emptyText="No recent completions in this window."
              events={doneEvents}
            />
          </>
        )}
      </main>
    </div>
  );
}

function TimelineSection({
  title,
  kicker,
  emptyText,
  events,
}: {
  title: string;
  kicker: string;
  emptyText: string;
  events: ProjectTimelineEvent[];
}) {
  if (events.length === 0) {
    return (
      <section className="stats-panel">
        <p className="settings-kicker">{kicker}</p>
        <h2 className="recorded-title">{title}</h2>
        <p className="recorded-empty">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="stats-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="settings-kicker">{kicker}</p>
          <h2 className="recorded-title">{title}</h2>
        </div>
        <span className="recorded-count">{events.length}</span>
      </div>

      <div className="timeline-list">
        {events.map((event) => (
          <Link key={event.id} href={`/projects#task-${event.projectId}`} className="timeline-item">
            <div className="timeline-date-badge">
              <span>{formatDay(event.when)}</span>
              <strong>{formatMonth(event.when)}</strong>
            </div>
            <div className="timeline-card">
              <div className="timeline-card-header">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="timeline-title">{event.label}</h3>
                    <span className={`task-chip ${event.state === "overdue" ? "task-chip-lapsed" : event.state === "done" ? "task-chip-done" : "task-chip-due"}`}>
                      {formatState(event.state)}
                    </span>
                    <span className="task-chip">{formatKind(event.kind)}</span>
                  </div>
                  <p className="timeline-detail">{event.projectTitle}</p>
                </div>
                <span className="timeline-time">{formatTime(event.when)}</span>
              </div>

              <div className="timeline-meta">
                <span>{event.detail}</span>
                <span>{event.roomName}</span>
                {event.locationName ? <span>{event.locationName}</span> : null}
                {event.assignedTo ? <span>{event.assignedTo}</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatKind(kind: ProjectTimelineEvent["kind"]) {
  if (kind === "project_target") return "Project target";
  if (kind === "milestone_target") return "Milestone";
  if (kind === "milestone_done") return "Milestone done";
  if (kind === "child_done") return "Child done";
  return "Child due";
}

function formatState(state: ProjectTimelineEvent["state"]) {
  if (state === "overdue") return "Overdue";
  if (state === "done") return "Done";
  return "Upcoming";
}
