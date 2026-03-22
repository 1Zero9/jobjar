type DailyGoalsPanelProps = {
  completedToday: number;
  overdueCount: number;
  streak: number;
};

const GOALS = [
  { key: "tasks",   label: "Complete 3 jobs today", xp: 50 },
  { key: "checkin", label: "Check in today",         xp: 25 },
  { key: "clear",   label: "Nothing overdue",        xp: 25 },
] as const;

type GoalKey = typeof GOALS[number]["key"];

function getProgress(key: GoalKey, completedToday: number, overdueCount: number) {
  if (key === "tasks")   return { current: completedToday, target: 3 };
  if (key === "checkin") return { current: completedToday > 0 ? 1 : 0, target: 1 };
  return { current: overdueCount === 0 ? 1 : 0, target: 1 };
}

export function DailyGoalsPanel({ completedToday, overdueCount, streak }: DailyGoalsPanelProps) {
  const goals = GOALS.map((g) => {
    const { current, target } = getProgress(g.key, completedToday, overdueCount);
    const done = current >= target;
    const pct  = Math.min(current / target, 1);
    return { ...g, current, target, done, pct };
  });

  const doneCount  = goals.filter((g) => g.done).length;
  const earnedXP   = goals.reduce((s, g) => s + (g.done ? g.xp : Math.floor(g.pct * g.xp)), 0);
  const totalXP    = goals.reduce((s, g) => s + g.xp, 0);
  const hoursLeft  = hoursUntilMidnight();

  // Ring
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - doneCount / goals.length);

  return (
    <section className="dg-section">

      {/* ── Header ── */}
      <div className="dg-header">
        <div className="dg-header-left">
          <svg className="dg-ring" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r={r} fill="none" strokeWidth="4.5" className="dg-ring-track" />
            <circle
              cx="26" cy="26" r={r} fill="none" strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              className="dg-ring-fill"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            <text x="26" y="30.5" textAnchor="middle" className="dg-ring-text">
              {doneCount}/{goals.length}
            </text>
          </svg>
          <div className="dg-header-copy">
            <h2 className="dg-title">Daily Goals</h2>
            {streak > 1
              ? <span className="dg-streak-chip">{streak}-day streak</span>
              : <span className="dg-reset-note">Resets in {hoursLeft}h</span>}
          </div>
        </div>
        <div className="dg-xp-total">
          <strong className="dg-xp-total-val">{earnedXP}</strong>
          <span className="dg-xp-total-cap">/{totalXP} XP</span>
        </div>
      </div>

      {/* ── Quest cards ── */}
      <div className="dg-cards">
        {goals.map((goal) => (
          <div key={goal.key} className={`dg-card dg-card-${goal.key} ${goal.done ? "dg-card-done" : ""}`.trim()}>
            <div className={`dg-icon dg-icon-${goal.key} ${goal.done ? "dg-icon-done" : ""}`.trim()}>
              <GoalIcon variant={goal.done ? "check" : goal.key} />
            </div>
            <div className="dg-body">
              <div className="dg-top-row">
                <span className="dg-label">{goal.label}</span>
                <span className={`dg-xp-badge ${goal.done ? "dg-xp-badge-done" : ""}`.trim()}>
                  +{goal.xp} XP
                </span>
              </div>
              {goal.done ? (
                <span className="dg-complete-badge">COMPLETE</span>
              ) : (
                <div className="dg-progress-row">
                  <div className="dg-track">
                    <div className="dg-fill" style={{ width: `${goal.pct * 100}%` }} />
                  </div>
                  <span className="dg-fraction">{goal.current}/{goal.target}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      {streak > 1 && (
        <p className="dg-footer-note">Resets in {hoursLeft}h</p>
      )}
    </section>
  );
}

function GoalIcon({ variant }: { variant: GoalKey | "check" }) {
  if (variant === "check") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 10.5l4.5 4.5 7.5-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "tasks") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="14" height="2" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor" />
        <rect x="3" y="14" width="9" height="2" rx="1" fill="currentColor" opacity="0.65" />
        <circle cx="16" cy="5" r="2.5" fill="currentColor" />
        <path d="M15 5l.8.8 1.7-1.7" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "checkin") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v2.5M10 14.5V17M3 10h2.5M14.5 10H17M5.636 5.636l1.768 1.768M12.596 12.596l1.768 1.768M14.364 5.636l-1.768 1.768M7.404 12.596l-1.768 1.768" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  // clear / overdue
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M10 6.5v4l2.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function hoursUntilMidnight() {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, Math.round((next.getTime() - now.getTime()) / 3_600_000));
}
