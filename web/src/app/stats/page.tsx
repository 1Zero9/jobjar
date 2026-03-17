import { AppPageHeader } from "@/app/components/AppPageHeader";
import { AutoSubmitSelect } from "@/app/components/AutoSubmitSelect";
import { canAccessReportingViewsRole, requireSessionContext } from "@/lib/auth";
import { canAccessExtendedViews, getMemberThemeClassName } from "@/lib/member-audience";
import { getStatsData } from "@/lib/stats-data";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = {
  period?: string;
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

  const stats = await getStatsData(householdId, {
    allowedLocationIds,
    userId,
    period: selectedPeriod,
    includeRewards: !viewerMode,
  });

  const periodLabel = selectedPeriod === "week" ? "this week" : selectedPeriod === "all" ? "all time" : "this month";
  const hasRewards = stats.rewardSummary.earnedCents > 0 || stats.rewardSummary.paidOutCents > 0;

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
                <span className="stat-label">You {periodLabel}</span>
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
          <div className="stats-summary-grid mt-4">
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
