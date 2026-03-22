type DailyGoalsPanelProps = {
  completedToday: number;
  overdueCount: number;
  streak: number;
};

type GoalDef = {
  label: string;
  sublabel: string;
  current: number;
  target: number;
  iconVariant: "tasks" | "checkin" | "overdue";
};

export function DailyGoalsPanel({ completedToday, overdueCount, streak }: DailyGoalsPanelProps) {
  const goals: GoalDef[] = [
    {
      iconVariant: "tasks",
      label: "Complete 3 jobs today",
      sublabel: completedToday >= 3 ? "Great work" : `${completedToday} of 3 done`,
      current: completedToday,
      target: 3,
    },
    {
      iconVariant: "checkin",
      label: "Check in today",
      sublabel: completedToday > 0 ? "You showed up" : "Complete at least one job",
      current: completedToday > 0 ? 1 : 0,
      target: 1,
    },
    {
      iconVariant: "overdue",
      label: overdueCount === 0 ? "Nothing overdue" : `${overdueCount} overdue job${overdueCount === 1 ? "" : "s"}`,
      sublabel: overdueCount === 0 ? "All clear" : "Tackle these first",
      current: overdueCount === 0 ? 1 : 0,
      target: 1,
    },
  ];

  const doneCount = goals.filter((g) => g.current >= g.target).length;
  const allDone = doneCount === goals.length;
  const hoursUntilMidnight = computeHoursUntilMidnight();

  // Ring progress values
  const ringRadius = 18;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringPct = doneCount / goals.length;
  const ringOffset = ringCirc * (1 - ringPct);

  return (
    <section className={`today-section daily-goals-section ${allDone ? "daily-goals-all-done" : ""}`.trim()}>
      <div className="daily-goals-header">
        <div className="daily-goals-ring-wrap">
          <svg className="daily-goals-ring" width="48" height="48" viewBox="0 0 48 48">
            <circle
              cx="24" cy="24" r={ringRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="daily-goals-ring-track"
            />
            <circle
              cx="24" cy="24" r={ringRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringOffset}
              className="daily-goals-ring-fill"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            <text x="24" y="28" textAnchor="middle" className="daily-goals-ring-text">
              {doneCount}/{goals.length}
            </text>
          </svg>
        </div>
        <div className="daily-goals-header-copy">
          <h2 className="today-section-title">Daily goals</h2>
          {streak > 1 ? (
            <span className="daily-goals-streak-chip">{streak}-day streak</span>
          ) : (
            <p className="daily-goals-subhead">Resets in {hoursUntilMidnight}h</p>
          )}
        </div>
      </div>

      <div className="daily-goals-list">
        {goals.map((goal, i) => {
          const done = goal.current >= goal.target;
          const pct = Math.min(goal.current / goal.target, 1);
          return (
            <div key={i} className={`daily-goal-row ${done ? "daily-goal-done" : ""}`.trim()}>
              <div className={`daily-goal-icon daily-goal-icon-${goal.iconVariant} ${done ? "daily-goal-icon-done" : ""}`.trim()}>
                <GoalIcon variant={done ? "check" : goal.iconVariant} />
              </div>
              <div className="daily-goal-body">
                <div className="daily-goal-text">
                  <span className="daily-goal-label">{goal.label}</span>
                  <span className="daily-goal-sublabel">{goal.sublabel}</span>
                </div>
                <div className="daily-goal-track">
                  <div className="daily-goal-fill" style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {streak > 1 ? (
        <p className="daily-goals-reset">Resets in {hoursUntilMidnight}h</p>
      ) : null}
    </section>
  );
}

function GoalIcon({ variant }: { variant: "tasks" | "checkin" | "overdue" | "check" }) {
  if (variant === "check") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "tasks") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="5" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
        <rect x="2" y="7" width="12" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="11" width="9" height="1.5" rx="0.75" fill="currentColor" opacity="0.7" />
        <path d="M9 3.75l1.2 1.2 2.3-2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "checkin") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  // overdue
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function computeHoursUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60)));
}
