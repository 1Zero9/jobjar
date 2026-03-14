import { luckyDipAction, logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ResetViewButton } from "@/app/components/ResetViewButton";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { canManagePeopleRole, canUseMemberActions, requireSessionContext } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { getRoomLocationAccessWhere } from "@/lib/location-access";
import {
  canAccessExtendedViews,
  getAudienceAssignedTaskWhere,
  getMemberThemeClassName,
  isChildAudience,
  isTeenAudience,
} from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { getProjectTaskWhere } from "@/lib/project-work";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { householdId, userId, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext("/");
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const childMode = isChildAudience(audienceBand);
  const teenMode = isTeenAudience(audienceBand);
  const peopleManager = canManagePeopleRole(role);
  const canAct = canUseMemberActions(role);
  const taskAudienceWhere = getAudienceAssignedTaskWhere(userId, audienceBand);
  const weekStart = startOfThisWeek();

  const [currentUser, taskCount, projectCount, completedThisWeek] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.task.count({
      where: {
        active: true,
        captureStage: { not: "done" },
        room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
        ...taskAudienceWhere,
      },
    }),
    prisma.task.count({
      where: {
        active: true,
        room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
        ...taskAudienceWhere,
        ...getProjectTaskWhere(),
      },
    }),
    prisma.taskOccurrence.count({
      where: {
        status: "done",
        completedBy: userId,
        completedAt: { gte: weekStart },
        task: {
          room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
        },
      },
    }),
  ]);

  return (
    <div className={`capture-shell ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="landing-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <header className={`landing-hero ${childMode ? "landing-hero-kid" : teenMode ? "landing-hero-teen" : ""}`.trim()}>
          <div className="hero-corner-tools">
            <ResetViewButton />
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

        <section className={`landing-panel ${childMode ? "landing-panel-kid" : teenMode ? "landing-panel-teen" : ""}`.trim()}>
          <div className="landing-stat-row">
            <span className="landing-stat-label">{childMode ? "My jobs" : teenMode ? "Open jobs" : "Open tasks"}</span>
            <span className="landing-stat-value">{taskCount}</span>
          </div>

          {childMode ? (
            <p className="landing-panel-copy">
              Jump into your jobs, tick them off, and keep your streak going.
            </p>
          ) : !canAct ? (
            <p className="landing-panel-copy">
              This view is read-only, so you can keep up with what is happening without changing anything.
            </p>
          ) : teenMode ? (
            <p className="landing-panel-copy">
              Keep your board moving. Focus on what is assigned, due, or ready to finish.
            </p>
          ) : null}

          <div className="landing-grid">
            <Link href="/tasks" prefetch className={`landing-action-card ${childMode ? "lucky" : "view"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <polyline points="3 6 4 7 6 4"/>
                <polyline points="3 12 4 13 6 10"/>
                <polyline points="3 18 4 19 6 16"/>
              </svg>
              <strong>{childMode ? "My jobs" : teenMode ? "Task board" : "Tasks"}</strong>
              {childMode ? <span>{taskCount > 0 ? `${taskCount} ready to do` : "Nothing waiting right now"}</span> : null}
            </Link>

            {childMode ? (
              <div className="landing-action-card stats landing-action-card-static">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v4" />
                  <path d="m16.24 7.76 2.83-2.83" />
                  <path d="M18 12h4" />
                  <path d="m16.24 16.24 2.83 2.83" />
                  <path d="M12 18v4" />
                  <path d="m4.93 19.07 2.83-2.83" />
                  <path d="M2 12h4" />
                  <path d="m4.93 4.93 2.83 2.83" />
                </svg>
                <strong>Wins this week</strong>
                <span>{completedThisWeek}</span>
              </div>
            ) : canAct ? (
              <>
                <Link href="/log" className="landing-action-card log">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <strong>{teenMode ? "Log a job" : "Log task"}</strong>
                </Link>

                <Link href="/projects" className="landing-action-card setup">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4A2.5 2.5 0 0 1 12 7.5v1A2.5 2.5 0 0 1 9.5 11h-4A2.5 2.5 0 0 1 3 8.5z"/>
                    <path d="M12 15.5A2.5 2.5 0 0 1 14.5 13h4a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5h-4a2.5 2.5 0 0 1-2.5-2.5z"/>
                    <path d="M8 11v2a2 2 0 0 0 2 2h2"/>
                  </svg>
                  <strong>{teenMode ? "Projects" : "Projects"}</strong>
                  <span>{projectCount} tracked</span>
                </Link>
              </>
            ) : (
              <Link href="/projects" className="landing-action-card setup">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4A2.5 2.5 0 0 1 12 7.5v1A2.5 2.5 0 0 1 9.5 11h-4A2.5 2.5 0 0 1 3 8.5z"/>
                  <path d="M12 15.5A2.5 2.5 0 0 1 14.5 13h4a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5h-4a2.5 2.5 0 0 1-2.5-2.5z"/>
                  <path d="M8 11v2a2 2 0 0 0 2 2h2"/>
                </svg>
                <strong>Projects</strong>
                <span>{projectCount} tracked</span>
              </Link>
            )}

            {canAccessExtendedViews(audienceBand) ? (
              <>
                {canAct ? (
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
                        <strong>{teenMode ? "Pick one" : "Lucky dip"}</strong>
                      </>
                    </FormActionButton>
                  </form>
                ) : null}

                <Link href="/stats" className="landing-action-card stats">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                    <line x1="2" y1="20" x2="22" y2="20"/>
                  </svg>
                  <strong>{teenMode ? "Progress" : "Stats"}</strong>
                </Link>

                <Link href="/projects/timeline" className="landing-action-card timeline">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 3"/>
                  </svg>
                  <strong>{teenMode ? "Timeline" : "Timeline"}</strong>
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
                ) : peopleManager ? (
                  <Link href="/settings/people" className="landing-action-card setup">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                      <circle cx="9.5" cy="7" r="3" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <strong>People</strong>
                    <span>Profiles and access</span>
                  </Link>
                ) : null}
              </>
            ) : null}

            <Link href="/help" className="landing-action-card view">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
                <path d="M12 17h.01" />
              </svg>
              <strong>Help</strong>
              <span>{canAct ? "Quick guides and tips" : "How this view works"}</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function startOfThisWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
