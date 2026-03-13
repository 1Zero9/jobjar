import { luckyDipAction, logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { requireSessionContext } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";
import { getProjectTaskWhere } from "@/lib/project-work";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { householdId, userId, role } = await requireSessionContext("/");

  const [currentUser, taskCount, projectCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.task.count({
      where: { active: true, room: { householdId } },
    }),
    prisma.task.count({
      where: {
        active: true,
        room: { householdId },
        ...getProjectTaskWhere(),
      },
    }),
  ]);

  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="landing-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <header className="landing-hero">
          <div className="hero-corner-toggle">
            <ThemeToggle compact />
          </div>
          <div className="landing-brand-row">
            <div className="page-hero-icon home">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
            </div>
            <h1 className="landing-title">Jobjar</h1>
          </div>
          <div className="landing-meta-row">
            <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
            <span className="version-chip">{APP_VERSION}</span>
          </div>
        </header>

        <section className="landing-panel">
          <div className="landing-stat-row">
            <span className="landing-stat-label">Open tasks</span>
            <span className="landing-stat-value">{taskCount}</span>
          </div>

          <div className="landing-grid">
            <Link href="/log" className="landing-action-card log">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <strong>Log task</strong>
            </Link>

            <Link href="/tasks" prefetch className="landing-action-card view">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <polyline points="3 6 4 7 6 4"/>
                <polyline points="3 12 4 13 6 10"/>
                <polyline points="3 18 4 19 6 16"/>
              </svg>
              <strong>Tasks</strong>
            </Link>

            <Link href="/projects" className="landing-action-card setup">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4A2.5 2.5 0 0 1 12 7.5v1A2.5 2.5 0 0 1 9.5 11h-4A2.5 2.5 0 0 1 3 8.5z"/>
                <path d="M12 15.5A2.5 2.5 0 0 1 14.5 13h4a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5h-4a2.5 2.5 0 0 1-2.5-2.5z"/>
                <path d="M8 11v2a2 2 0 0 0 2 2h2"/>
              </svg>
              <strong>Projects</strong>
              <span>{projectCount} tracked</span>
            </Link>

            <form action={luckyDipAction} className="landing-action-form">
              <input type="hidden" name="returnTo" value="/tasks" />
              <FormActionButton className="landing-action-card lucky landing-action-button" pendingLabel="Picking…">
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16 3 21 3 21 8"/>
                    <line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21 16 21 21 16 21"/>
                    <line x1="15" y1="15" x2="21" y2="21"/>
                    <line x1="4" y1="4" x2="9" y2="9"/>
                  </svg>
                  <strong>Lucky dip</strong>
                </>
              </FormActionButton>
            </form>

            <Link href="/stats" className="landing-action-card stats">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
                <line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
              <strong>Stats</strong>
            </Link>

            <Link href="/projects/timeline" className="landing-action-card timeline">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 3"/>
              </svg>
              <strong>Timeline</strong>
              <span>Dates and checkpoints</span>
            </Link>

            {role === "admin" ? (
              <Link href="/settings" className="landing-action-card setup">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <strong>Setup</strong>
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
