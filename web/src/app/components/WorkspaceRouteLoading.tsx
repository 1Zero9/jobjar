type Props = {
  title: string;
};

export function WorkspaceRouteLoading({ title }: Props) {
  return (
    <div className="capture-shell page-tasks min-h-screen px-4 py-5">
      <main className="capture-app-shell mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <section className="page-hero-card animate-pulse">
          <div className="hero-corner-tools">
            <span className="block h-10 w-10 rounded-full border border-border bg-surface" />
            <span className="block h-10 w-10 rounded-full border border-border bg-surface" />
          </div>
          <div className="page-hero-topline">
            <div className="page-hero-icon tasks" />
            <div className="page-hero-brand-row">
              <span className="h-6 w-24 rounded-full bg-surface" />
              <span className="h-5 w-14 rounded-full bg-surface" />
            </div>
          </div>
          <div className="page-hero-copy">
            <div className="h-10 w-40 rounded-2xl bg-surface" />
            <div className="h-4 w-full max-w-md rounded-full bg-surface" />
          </div>
        </section>

        <section className="settings-panel animate-pulse">
          <div className="h-10 rounded-2xl bg-surface" />
          <div className="mt-4 grid gap-3">
            <div className="h-24 rounded-2xl bg-surface" />
            <div className="h-24 rounded-2xl bg-surface" />
            <div className="h-24 rounded-2xl bg-surface" />
          </div>
        </section>

        <p className="text-sm text-muted">{`Loading ${title.toLowerCase()}...`}</p>
      </main>
    </div>
  );
}
