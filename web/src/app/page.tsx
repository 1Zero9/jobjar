import { luckyDipAction, logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { requireSessionContext } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { householdId, userId, role } = await requireSessionContext("/");

  const [currentUser, taskCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.task.count({
      where: {
        active: true,
        room: { householdId },
      },
    }),
  ]);

  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="landing-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <header className="landing-hero">
          <div>
            <div className="capture-topline">
              <p className="capture-kicker">Task Jar</p>
              <span className="version-chip">{APP_VERSION}</span>
            </div>
            <h1 className="landing-title">Choose what you want to do.</h1>
            <p className="landing-copy">
              Keep the main actions obvious: log a task, view what is recorded, pull a lucky dip, or manage the setup.
            </p>
          </div>
          <div className="capture-topbar-actions">
            <span className="landing-user-chip">
              Signed in as <span className="session-user">{currentUser?.displayName ?? "You"}</span>
            </span>
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
          </div>
        </header>

        <section className="landing-panel">
          <div className="landing-stat-row">
            <span className="landing-stat-label">Open tasks</span>
            <span className="landing-stat-value">{taskCount}</span>
          </div>

          <div className="landing-grid">
            <Link href="/log" className="landing-action-card">
              <span className="landing-action-kicker">Log</span>
              <strong>Record a task</strong>
              <span>Quick capture for a room and task.</span>
            </Link>

            <Link href="/tasks" className="landing-action-card">
              <span className="landing-action-kicker">View</span>
              <strong>View tasks</strong>
              <span>Browse, filter, edit, and tidy up.</span>
            </Link>

            <form action={luckyDipAction} className="landing-action-form">
              <input type="hidden" name="returnTo" value="/tasks" />
              <FormActionButton className="landing-action-card landing-action-button" pendingLabel="Picking task">
                <>
                  <span className="landing-action-kicker">Lucky</span>
                  <strong>Lucky dip</strong>
                  <span>Pick something at random and get moving.</span>
                </>
              </FormActionButton>
            </form>

            {role === "admin" ? (
              <Link href="/settings" className="landing-action-card">
                <span className="landing-action-kicker">Setup</span>
                <strong>Setup</strong>
                <span>Rooms, people, and household setup.</span>
              </Link>
            ) : (
              <div className="landing-action-card muted disabled" aria-disabled="true">
                <span className="landing-action-kicker">Setup</span>
                <strong>Admin only</strong>
                <span>Rooms and people can only be managed by an admin account.</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
