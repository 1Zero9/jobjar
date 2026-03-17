export function HomeRouteLoading() {
  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="today-shell mx-auto flex w-full max-w-[46rem] flex-col gap-5">
        <section className="today-hero animate-pulse">
          <div className="today-hero-copy">
            <span className="session-chip h-10 w-28 rounded-full bg-surface text-transparent">Loading</span>
            <div className="h-12 w-56 rounded-3xl bg-surface" />
            <div className="h-4 w-full max-w-xl rounded-full bg-surface" />
          </div>
          <div className="today-metrics">
            <div className="today-metric">
              <span className="today-metric-label">Needs attention</span>
              <strong className="today-metric-value text-transparent">0</strong>
            </div>
            <div className="today-metric">
              <span className="today-metric-label">Due today</span>
              <strong className="today-metric-value text-transparent">0</strong>
            </div>
            <div className="today-metric">
              <span className="today-metric-label">Open jobs</span>
              <strong className="today-metric-value text-transparent">0</strong>
            </div>
          </div>
        </section>

        <section className="today-section animate-pulse">
          <div className="today-section-head">
            <div className="h-7 w-40 rounded-2xl bg-surface" />
            <div className="h-6 w-16 rounded-full bg-surface" />
          </div>
          <div className="today-task-list">
            <div className="today-task-card h-20 rounded-3xl bg-surface" />
            <div className="today-task-card h-20 rounded-3xl bg-surface" />
            <div className="today-task-card h-20 rounded-3xl bg-surface" />
          </div>
        </section>

        <section className="today-section animate-pulse">
          <div className="today-section-head">
            <div className="h-7 w-32 rounded-2xl bg-surface" />
          </div>
          <div className="today-week-summary">
            <p><strong className="text-transparent">0</strong><span>done</span></p>
            <p><strong className="text-transparent">0</strong><span>paid rewards</span></p>
            <p><strong className="text-transparent">0</strong><span>streak</span></p>
          </div>
        </section>
      </main>
    </div>
  );
}
