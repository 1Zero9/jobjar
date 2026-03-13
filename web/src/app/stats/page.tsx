import { logoutAction } from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { AutoSubmitSelect } from "@/app/components/AutoSubmitSelect";
import { FormActionButton } from "@/app/components/FormActionButton";
import { requireSessionContext } from "@/lib/auth";
import { hasLocationRestrictions } from "@/lib/location-access";
import { getStatsData } from "@/lib/stats-data";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = {
  location?: string;
  person?: string;
  period?: string;
};

export default async function StatsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { householdId, allowedLocationIds } = await requireSessionContext("/stats");
  const params = await searchParams;
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);

  const [locations, members] = await Promise.all([
    prisma.location.findMany({
      where: { householdId, active: true, ...(restrictedToLocations ? { id: { in: allowedLocationIds! } } : {}) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: { user: { select: { id: true, displayName: true } } },
    }),
  ]);

  const validPeriods = ["week", "month", "all"] as const;
  type Period = typeof validPeriods[number];

  const selectedLocationId = locations.some((l) => l.id === params.location) ? params.location : "";
  const selectedUserId = members.some((m) => m.user.id === params.person) ? params.person : "";
  const selectedPeriod: Period = validPeriods.includes(params.period as Period) ? (params.period as Period) : "month";

  const stats = await getStatsData(householdId, {
    locationId: selectedLocationId || undefined,
    allowedLocationIds,
    userId: selectedUserId || undefined,
    period: selectedPeriod,
  });

  const periodLabel = selectedPeriod === "week" ? "this week" : selectedPeriod === "all" ? "all time" : "this month";
  const maxPersonPeriod = Math.max(...stats.byPerson.map((p) => p.period), 1);
  return (
    <div className="capture-shell page-stats min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title="Stats"
          subtitle="How the household is getting on."
          iconClassName="stats"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="2" y1="20" x2="22" y2="20" />
            </svg>
          }
          actions={
            <>
              <Link href="/" className="action-btn subtle quiet">Home</Link>
              <Link href="/tasks" prefetch className="action-btn subtle quiet">Tasks</Link>
              <Link href="/projects" prefetch className="action-btn subtle quiet">Projects</Link>
              <Link href="/projects/timeline" className="action-btn subtle quiet">Timeline</Link>
              <form action={logoutAction}>
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                  Log out
                </FormActionButton>
              </form>
            </>
          }
        />

        {/* Filters */}
        <form method="GET" className="stats-filter-bar">
          {locations.length > 1 ? (
            <label className="stats-filter-field">
              <span className="stats-filter-label">Location</span>
              <AutoSubmitSelect name="location" defaultValue={selectedLocationId ?? ""} className="stats-filter-select">
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}

          {members.length > 1 ? (
            <label className="stats-filter-field">
              <span className="stats-filter-label">Person</span>
              <AutoSubmitSelect name="person" defaultValue={selectedUserId ?? ""} className="stats-filter-select">
                <option value="">Everyone</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.displayName}</option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}

          <label className="stats-filter-field">
            <span className="stats-filter-label">Period</span>
            <AutoSubmitSelect name="period" defaultValue={selectedPeriod} className="stats-filter-select">
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="all">All time</option>
            </AutoSubmitSelect>
          </label>
        </form>

        {/* Headline numbers */}
        <section className="stats-summary-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.completionsThisWeek}</span>
            <span className="stat-label">Done this week</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.completionsThisMonth}</span>
            <span className="stat-label">Done this month</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.openTasks}</span>
            <span className="stat-label">Open tasks</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.completionsAllTime}</span>
            <span className="stat-label">All time</span>
          </div>
        </section>

        {stats.projectOverview.totalProjects > 0 ? (
          <section className="stats-panel">
            <p className="settings-kicker">Projects</p>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="recorded-title">Project health</h2>
                <p className="text-sm text-muted">
                  Budget, milestones, and overdue project steps across the current project board.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/projects" className="action-btn subtle quiet">
                  Open board
                </Link>
                <Link href="/projects/timeline" className="action-btn subtle quiet">
                  Timeline
                </Link>
              </div>
            </div>

            <div className="stats-summary-grid mt-4">
              <div className="stat-card">
                <span className="stat-number">{stats.projectOverview.totalProjects}</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.projectOverview.activeProjects}</span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.projectOverview.atRiskProjects}</span>
                <span className="stat-label">At risk</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.projectOverview.completeProjects}</span>
                <span className="stat-label">Complete</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-foreground">Planned budget</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
                  {formatMoney(stats.projectOverview.plannedBudgetCents)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-foreground">Actual spend</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
                  {formatMoney(stats.projectOverview.actualSpendCents)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {stats.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects#task-${project.id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 transition hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-foreground">{project.title}</h3>
                        <span className={`task-chip ${project.status === "at_risk" ? "task-chip-lapsed" : project.status === "complete" ? "task-chip-done" : project.status === "planning" ? "" : "task-chip-due"}`}>
                          {formatProjectStatus(project.status)}
                        </span>
                        {project.locationName ? <span className="task-chip">{project.locationName}</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{project.roomName}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {project.totalChildren > 0 ? `${project.completedChildren}/${project.totalChildren} steps` : "No project steps"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-foreground">Spend</span>{" "}
                      {project.budgetCents !== null
                        ? `${formatMoney(project.actualSpendCents)} / ${formatMoney(project.budgetCents)}`
                        : `${formatMoney(project.actualSpendCents)} spent`}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Milestones</span>{" "}
                      {project.totalMilestones > 0 ? `${project.completedMilestones}/${project.totalMilestones}` : "None"}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Shopping</span>{" "}
                      {project.totalMaterials > 0 ? `${project.purchasedMaterials}/${project.totalMaterials} bought` : "No materials"}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Overdue project steps</span> {project.overdueChildren}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Target</span>{" "}
                      {project.targetAt ? formatDate(project.targetAt) : "Not set"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Recurring health */}
        <section className="stats-panel">
          <p className="settings-kicker">Recurring tasks</p>
          <h2 className="recorded-title">Schedule health</h2>
          <div className="stats-health-row">
            <div className="stats-health-chip on-track">
              <span className="stats-health-count">{stats.recurringHealth.onTrack}</span>
              <span className="stats-health-label">On track</span>
            </div>
            <div className="stats-health-chip due-today">
              <span className="stats-health-count">{stats.recurringHealth.dueToday}</span>
              <span className="stats-health-label">Due today</span>
            </div>
            <div className="stats-health-chip overdue">
              <span className="stats-health-count">{stats.recurringHealth.overdue}</span>
              <span className="stats-health-label">Overdue</span>
            </div>
          </div>
        </section>

        {/* Streaks */}
        {stats.topStreaks.length > 0 ? (
          <section className="stats-panel">
            <p className="settings-kicker">Consistency</p>
            <h2 className="recorded-title">Top streaks</h2>
            <div className="stats-streak-list">
              {stats.topStreaks.map((s, i) => (
                <div key={i} className="stats-streak-row">
                  <div className="stats-streak-info">
                    <span className="stats-streak-title">{s.taskTitle}</span>
                    <span className="recorded-row-room">{s.roomName}</span>
                  </div>
                  <span className="stats-streak-badge">{s.streak} in a row</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* By person */}
        {stats.byPerson.length > 0 ? (
          <section className="stats-panel">
            <p className="settings-kicker">People</p>
            <h2 className="recorded-title">Completions {periodLabel}</h2>
            <div className="stats-person-list">
              {stats.byPerson.map((person) => (
                <div key={person.name} className="stats-person-row">
                  <div className="stats-person-meta">
                    <span className="stats-person-name">{person.name}</span>
                    <span className="stats-person-count">{person.period}</span>
                  </div>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{ width: `${Math.round((person.period / maxPersonPeriod) * 100)}%` }}
                    />
                  </div>
                  {selectedPeriod !== "week" && person.week > 0 ? (
                    <span className="stats-person-week">{person.week} this week</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* By room */}
        {stats.byRoom.length > 0 ? (
          <section className="stats-panel">
            <p className="settings-kicker">Rooms</p>
            <h2 className="recorded-title">Task breakdown</h2>
            <div className="stats-room-list">
              {stats.byRoom.map((room) => (
                <div key={room.name} className="stats-room-row">
                  <div className="stats-room-info">
                    <span className="stats-room-name">{room.name}</span>
                    {room.locationName ? <span className="task-chip">{room.locationName}</span> : null}
                  </div>
                  <div className="stats-room-counts">
                    <span className="stats-room-open">{room.openCount} open</span>
                    {room.doneThisPeriod > 0 ? (
                      <span className="stats-room-done">{room.doneThisPeriod} done</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Recent completions */}
        {stats.recentCompletions.length > 0 ? (
          <section className="stats-panel">
            <p className="settings-kicker">Activity</p>
            <h2 className="recorded-title">Recent completions</h2>
            <div className="stats-activity-list">
              {stats.recentCompletions.map((item, i) => (
                <div key={i} className="stats-activity-row">
                  <div className="stats-activity-info">
                    <span className="stats-activity-title">{item.taskTitle}</span>
                    <span className="recorded-row-room">{item.roomName}</span>
                  </div>
                  <div className="stats-activity-meta">
                    {item.personName ? <span className="stats-activity-person">{item.personName}</span> : null}
                    <span className="stats-activity-date">{formatDate(item.completedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatProjectStatus(status: "planning" | "active" | "complete" | "at_risk") {
  if (status === "at_risk") return "At risk";
  if (status === "complete") return "Complete";
  if (status === "planning") return "Planning";
  return "Active";
}
