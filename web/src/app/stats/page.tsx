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

  const [locationOptions, peopleOptions, lifetimeCompletions] = await Promise.all([
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
    viewerMode ? Promise.resolve(0) : prisma.taskOccurrence.count({
      where: { status: "done", completedBy: userId },
    }),
  ]);

  const selectedLocationId = locationOptions.some((location) => location.id === params.location) ? params.location! : "";
  const selectedPersonId = peopleOptions.some((member) => member.user.id === params.person) ? params.person! : "";

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
  const boardTotal = stats.boardMix.onTrack + stats.boardMix.dueToday + stats.boardMix.attention;
  const boardChartStyle = buildBoardChartStyle(stats.boardMix);
  const trendMax = Math.max(...stats.completionSeries.map((point) => point.count), 1);

  const XP_PER_JOB = 10;
  const lifetimeXP  = lifetimeCompletions * XP_PER_JOB;
  const levelInfo   = computeLevel(lifetimeXP);

  return (
    <div className={`capture-shell page-stats ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        {/* Page header */}
        <AppPageHeader
          title="Stats"
          subtitle="Your running score. Keep it moving."
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

        {/* Filter bar */}
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
                  <option key={location.id} value={location.id}>{location.name}</option>
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
                  <option key={member.user.id} value={member.user.id}>{member.user.displayName}</option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}
        </form>

        {/* XP / Level card — shown for non-viewers */}
        {!viewerMode ? (
          <section className="stats-level-card">
            <div className="stats-level-header">
              <div className="stats-level-badge">
                <span className="stats-level-num">{levelInfo.level}</span>
              </div>
              <div className="stats-level-info">
                <h2 className="stats-level-title">{levelInfo.title}</h2>
                <p className="stats-level-xp-line">{lifetimeXP.toLocaleString()} XP · {lifetimeCompletions} jobs all time</p>
              </div>
              {levelInfo.next ? (
                <div className="stats-level-next">
                  <span className="stats-level-next-label">Next up</span>
                  <span className="stats-level-next-title">{levelInfo.next.title}</span>
                  <span className="stats-level-next-gap">{levelInfo.xpToNext} XP to go</span>
                </div>
              ) : (
                <div className="stats-level-next">
                  <span className="stats-level-next-title">Max level</span>
                </div>
              )}
            </div>
            <div className="stats-level-track">
              <div className="stats-level-fill" style={{ width: `${levelInfo.pct}%` }} />
            </div>
          </section>
        ) : null}

        {/* Personal stats — token chips */}
        <div className="today-token-bar">
          {viewerMode ? (
            <>
              <div className="today-token today-token-rose">
                <span className="today-token-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="8" cy="11.5" r="1.2" fill="currentColor"/><path d="M8 1L15 14H1L8 1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                </span>
                <div className="today-token-body"><strong>{stats.attentionTasks}</strong><span>overdue</span></div>
              </div>
              <div className="today-token today-token-amber">
                <span className="today-token-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <div className="today-token-body"><strong>{stats.dueTodayTasks}</strong><span>today</span></div>
              </div>
              <div className="today-token today-token-blue">
                <span className="today-token-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="4" width="10" height="1.8" rx="0.9" fill="currentColor" opacity="0.5"/><rect x="3" y="7.1" width="10" height="1.8" rx="0.9" fill="currentColor"/><rect x="3" y="10.2" width="7" height="1.8" rx="0.9" fill="currentColor" opacity="0.7"/></svg>
                </span>
                <div className="today-token-body"><strong>{stats.openTasks}</strong><span>open</span></div>
              </div>
            </>
          ) : (
            <>
              <div className="today-token today-token-blue today-token-active">
                <span className="today-token-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9 2L4 9h5l-2 5 7-8H9l1-4z" fill="currentColor" strokeWidth="0.5" strokeLinejoin="round"/></svg>
                </span>
                <div className="today-token-body"><strong>{stats.personalCompletionsPeriod}</strong><span>{periodLabel}</span></div>
              </div>
              <div className="today-token today-token-amber">
                <span className="today-token-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="8" cy="11.5" r="1.2" fill="currentColor"/><path d="M8 1L15 14H1L8 1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                </span>
                <div className="today-token-body"><strong>{stats.completionStreak}</strong><span>streak</span></div>
              </div>
              <div className="today-token today-token-rose">
                <span className="today-token-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </span>
                <div className="today-token-body"><strong>{stats.householdCompletionsPeriod}</strong><span>household</span></div>
              </div>
            </>
          )}
        </div>

        {/* Board status */}
        <section className="stats-panel">
          <p className="settings-kicker">Right now</p>
          <h2 className="recorded-title">What's on the board</h2>
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
                <span className="stats-health-label">Overdue</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trend */}
        <section className="stats-panel">
          <p className="settings-kicker">Trend</p>
          <h2 className="recorded-title">Jobs crushed</h2>
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

        {/* Rewards */}
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

        {/* Recent wins */}
        <section className="stats-panel">
          <p className="settings-kicker">Activity</p>
          <h2 className="recorded-title">Recent wins</h2>
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
                    <span className="stats-xp-pip">+{XP_PER_JOB} XP</span>
                    <span className="stats-activity-date">{formatDate(item.completedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="recorded-empty-card">
              <p className="recorded-empty">No completions yet for {periodLabel}.</p>
              <div className="recorded-row-actions">
                <Link href="/tasks" className="action-btn subtle quiet">Open jobs</Link>
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

const LEVELS = [
  { level: 1, title: "Rookie",     min: 0    },
  { level: 2, title: "Apprentice", min: 100  },
  { level: 3, title: "Regular",    min: 300  },
  { level: 4, title: "Reliable",   min: 700  },
  { level: 5, title: "Pro",        min: 1500 },
  { level: 6, title: "Expert",     min: 3000 },
  { level: 7, title: "Legend",     min: 6000 },
] as const;

function computeLevel(xp: number) {
  let current: typeof LEVELS[number] = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) current = l;
    else break;
  }
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = LEVELS[nextIdx] ?? null;
  const floorXP = current.min;
  const ceilXP  = next?.min ?? floorXP;
  const pct     = next ? Math.round(((xp - floorXP) / (ceilXP - floorXP)) * 100) : 100;
  return { ...current, next, pct, xpToNext: next ? next.min - xp : 0 };
}
