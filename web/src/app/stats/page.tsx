import { AppPageHeader } from "@/app/components/AppPageHeader";
import { AutoSubmitSelect } from "@/app/components/AutoSubmitSelect";
import { canAccessReportingViewsRole, requireSessionContext } from "@/lib/auth";
import { canAccessExtendedViews, getMemberThemeClassName } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { getStatsData } from "@/lib/stats-data";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = {
  period?: string;
  location?: string;
  person?: string;
};

export default async function StatsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { householdId, userId, allowedLocationIds, audienceBand, profileTheme, role } = await requireSessionContext("/stats");
  if (!canAccessExtendedViews(audienceBand) || !canAccessReportingViewsRole(role)) {
    redirect("/tasks");
  }

  const viewerMode = role === "viewer";
  const params = await searchParams;
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const validPeriods = ["week", "month", "all"] as const;
  type Period = typeof validPeriods[number];
  const selectedPeriod: Period = validPeriods.includes(params.period as Period) ? (params.period as Period) : "week";

  const [locationOptions, peopleOptions] = await Promise.all([
    prisma.location.findMany({
      where: {
        householdId,
        active: true,
        ...(allowedLocationIds && allowedLocationIds.length > 0 ? { id: { in: allowedLocationIds } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
  ]);

  const selectedLocationId = locationOptions.some((location) => location.id === params.location) ? params.location! : "";
  const selectedPersonId = peopleOptions.some((member) => member.user.id === params.person) ? params.person! : "";
  const focusedPerson = peopleOptions.find((member) => member.user.id === selectedPersonId)?.user ?? null;

  const stats = await getStatsData(householdId, {
    allowedLocationIds,
    userId,
    role,
    audienceBand,
    period: selectedPeriod,
    includeRewards: !viewerMode,
    locationId: selectedLocationId || null,
    assignedUserId: selectedPersonId || null,
    focusUserId: viewerMode ? (selectedPersonId || null) : (selectedPersonId || userId),
  });

  const periodLabel = selectedPeriod === "week" ? "this week" : selectedPeriod === "all" ? "all time" : "this month";
  const hasRewards = stats.rewardSummary.earnedCents > 0 || stats.rewardSummary.paidOutCents > 0;
  const focusLabel = focusedPerson?.displayName ?? "You";
  const boardTotal = stats.boardMix.onTrack + stats.boardMix.dueToday + stats.boardMix.attention;
  const boardChartStyle = buildBoardChartStyle(stats.boardMix);
  const trendMax = Math.max(...stats.completionSeries.map((point) => point.count), 1);

  return (
    <div className={`capture-shell page-stats ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title="Stats"
          subtitle={viewerMode ? "A quick look at what is open, due, and getting done." : "A simple weekly check on your jobs and the household board."}
          iconClassName="stats"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="2" y1="20" x2="22" y2="20" />
            </svg>
          }
        />

        <form method="GET" className="stats-filter-bar">
          <label className="stats-filter-field">
            <span className="stats-filter-label">Period</span>
            <AutoSubmitSelect name="period" defaultValue={selectedPeriod} className="stats-filter-select">
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="all">All time</option>
            </AutoSubmitSelect>
          </label>
          {locationOptions.length > 1 ? (
            <label className="stats-filter-field">
              <span className="stats-filter-label">Location</span>
              <AutoSubmitSelect name="location" defaultValue={selectedLocationId} className="stats-filter-select">
                <option value="">All areas</option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}
          {peopleOptions.length > 1 ? (
            <label className="stats-filter-field">
              <span className="stats-filter-label">Person</span>
              <AutoSubmitSelect name="person" defaultValue={selectedPersonId} className="stats-filter-select">
                <option value="">{viewerMode ? "Everyone" : "Your view"}</option>
                {peopleOptions.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.displayName}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}
        </form>

        <section className="stats-summary-grid">
          {viewerMode ? (
            <>
              <div className="stat-card">
                <span className="stat-number">{stats.openTasks}</span>
                <span className="stat-label">Open jobs</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.dueTodayTasks}</span>
                <span className="stat-label">Due today</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.attentionTasks}</span>
                <span className="stat-label">Needs attention</span>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card">
                <span className="stat-number">{stats.personalCompletionsPeriod}</span>
                <span className="stat-label">{focusLabel} {periodLabel}</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.householdCompletionsPeriod}</span>
                <span className="stat-label">Household {periodLabel}</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.completionStreak}</span>
                <span className="stat-label">Day streak</span>
              </div>
            </>
          )}
        </section>

        <section className="stats-panel">
          <p className="settings-kicker">Board right now</p>
          <h2 className="recorded-title">Open work</h2>
          <div className="stats-visual-grid">
            <div className="stats-donut-card">
              <div className="stats-donut" style={boardChartStyle}>
                <div className="stats-donut-center">
                  <strong>{boardTotal}</strong>
                  <span>open</span>
                </div>
              </div>
              <div className="stats-health-row">
                <div className="stats-health-chip on-track">
                  <span className="stats-health-count">{stats.boardMix.onTrack}</span>
                  <span className="stats-health-label">On track</span>
                </div>
                <div className="stats-health-chip due-today">
                  <span className="stats-health-count">{stats.boardMix.dueToday}</span>
                  <span className="stats-health-label">Due today</span>
                </div>
                <div className="stats-health-chip overdue">
                  <span className="stats-health-count">{stats.boardMix.attention}</span>
                  <span className="stats-health-label">Needs attention</span>
                </div>
              </div>
            </div>
            <div className="stats-summary-grid">
              <div className="stat-card">
                <span className="stat-number">{stats.openTasks}</span>
                <span className="stat-label">Open jobs</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.dueTodayTasks}</span>
                <span className="stat-label">Due today</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.attentionTasks}</span>
                <span className="stat-label">Needs attention</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-panel">
          <p className="settings-kicker">Trend</p>
          <h2 className="recorded-title">Completions</h2>
          <div className="stats-trend-chart">
            {stats.completionSeries.map((point) => (
              <div key={point.label} className="stats-trend-bar-wrap" title={`${point.label}: ${point.count}`}>
                <div className="stats-trend-track">
                  <div
                    className="stats-trend-fill"
                    style={{ height: `${Math.max((point.count / trendMax) * 100, point.count > 0 ? 14 : 0)}%` }}
                  />
                </div>
                <span className="stats-trend-value">{point.count}</span>
                <span className="stats-trend-label">{point.shortLabel}</span>
              </div>
            ))}
          </div>
        </section>

        {!viewerMode && hasRewards ? (
          <section className="stats-panel">
            <p className="settings-kicker">Rewards</p>
            <h2 className="recorded-title">Money {periodLabel}</h2>
            <div className="stats-summary-grid mt-4">
              <div className="stat-card">
                <span className="stat-number">{formatMoney(stats.rewardSummary.earnedCents)}</span>
                <span className="stat-label">Earned</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{formatMoney(stats.rewardSummary.paidOutCents)}</span>
                <span className="stat-label">Paid out</span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="stats-panel">
          <p className="settings-kicker">Activity</p>
          <h2 className="recorded-title">Recent completions</h2>
          {stats.recentCompletions.length > 0 ? (
            <div className="stats-activity-list">
              {stats.recentCompletions.map((item, index) => (
                <div key={`${item.taskTitle}-${item.completedAt}-${index}`} className="stats-activity-row">
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
          ) : (
            <div className="recorded-empty-card">
              <p className="recorded-empty">No completions recorded for {periodLabel} yet.</p>
              <div className="recorded-row-actions">
                <Link href="/tasks" className="action-btn subtle quiet">
                  Open jobs
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function buildBoardChartStyle(boardMix: { onTrack: number; dueToday: number; attention: number }) {
  const total = boardMix.onTrack + boardMix.dueToday + boardMix.attention;
  if (total <= 0) {
    return {
      background: "conic-gradient(color-mix(in srgb, var(--border) 72%, white) 0deg 360deg)",
    };
  }

  const onTrackArc = (boardMix.onTrack / total) * 360;
  const dueArc = (boardMix.dueToday / total) * 360;
  const attentionArc = (boardMix.attention / total) * 360;

  return {
    background: `conic-gradient(
      var(--success) 0deg ${onTrackArc}deg,
      var(--warning) ${onTrackArc}deg ${onTrackArc + dueArc}deg,
      var(--error) ${onTrackArc + dueArc}deg ${onTrackArc + dueArc + attentionArc}deg
    )`,
  };
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
