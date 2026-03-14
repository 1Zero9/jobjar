import { logoutAction } from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { FormActionButton } from "@/app/components/FormActionButton";
import { canAccessProjectViewsRole, canAccessReportingViewsRole, canManagePeopleRole, canUseMemberActions, isMemberRole, requireSessionContext } from "@/lib/auth";
import { canAccessExtendedViews, getMemberThemeClassName } from "@/lib/member-audience";
import Link from "next/link";

export const dynamic = "force-dynamic";

const GUIDE_SECTIONS = [
  {
    id: "adults",
    title: "Adults",
    subtitle: "For admins, power users, and members who help run the household board.",
    points: [
      "Use /log to capture work quickly.",
      "Use /tasks to assign, tidy, and finish work.",
      "Use /projects when a task becomes multi-step.",
      "Use /stats and /projects/timeline for review.",
    ],
  },
  {
    id: "teens",
    title: "Teens",
    subtitle: "For 12 to 18 users who work from the jobs board with simpler wording.",
    points: [
      "Open Jobs from home.",
      "Start one job, then finish it before moving on.",
      "Use notes when something needs explaining.",
      "Projects are there when bigger work has several steps.",
    ],
  },
  {
    id: "kids",
    title: "Kids",
    subtitle: "For under-12 users who only see jobs picked for them.",
    points: [
      "Open My jobs.",
      "Tap Start job.",
      "Tap I finished this when done.",
      "Only a small, friendly set of screens is shown on purpose.",
    ],
  },
  {
    id: "grandparents",
    title: "Grandparents",
    subtitle: "For read-only family members who mainly want to see what is happening.",
    points: [
      "Viewer is the best role for read-only access.",
      "Open home, tasks, projects, and stats to keep up.",
      "This setup avoids edit controls completely.",
      "Location access can limit what part of the household is visible.",
    ],
  },
] as const;

export default async function HelpPage() {
  const { role, audienceBand, profileTheme } = await requireSessionContext("/help");
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const canAct = canUseMemberActions(role);
  const canSeeExtended = canAccessExtendedViews(audienceBand);
  const memberMode = isMemberRole(role);
  const canSeeProjects = canAccessProjectViewsRole(role) && canSeeExtended;
  const canSeeReports = canAccessReportingViewsRole(role) && canSeeExtended;
  const recommendedGuideId =
    role === "viewer"
      ? "grandparents"
      : audienceBand === "under_12"
        ? "kids"
        : audienceBand === "teen_12_18"
          ? "teens"
          : "adults";
  const recommendedGuide = GUIDE_SECTIONS.find((section) => section.id === recommendedGuideId) ?? GUIDE_SECTIONS[0];

  return (
    <div className={`capture-shell page-help ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="mx-auto flex w-full max-w-[34rem] flex-col gap-6">
        <AppPageHeader
          title="Help"
          subtitle={memberMode ? "A simple guide to your jobs and what each screen is for." : "Quick guidance for this account, plus simple guides for the rest of the household."}
          iconClassName="help"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
              <path d="M12 17h.01" />
            </svg>
          }
          cornerAction={
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet compact" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
          }
          actions={
            <>
              <Link href="/" className="action-btn subtle quiet">Home</Link>
              <Link href="/tasks" className="action-btn subtle quiet">Jobs</Link>
              {canSeeProjects ? <Link href="/projects" className="action-btn subtle quiet">Projects</Link> : null}
              {canSeeReports ? <Link href="/stats" className="action-btn subtle quiet">Stats</Link> : null}
            </>
          }
        />

        <section className="stats-panel help-hero-panel">
          <p className="settings-kicker">Start here</p>
          <h2 className="recorded-title">{memberMode ? "Your jobs guide" : `${recommendedGuide.title} guide`}</h2>
          <p className="page-hero-subtitle">{memberMode ? "JobJar is set up to keep your view smaller and easier to follow." : recommendedGuide.subtitle}</p>
          <div className="help-summary-grid">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-foreground">This account can</p>
              <p className="mt-2 text-sm text-muted">
                {canAct
                  ? canSeeExtended
                    ? memberMode
                      ? "view and work from your own jobs flow"
                      : "view, capture, and work from the full household flow"
                    : "work from the simplified jobs view"
                  : "view the household without changing jobs or projects"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-foreground">Best first screen</p>
              <p className="mt-2 text-sm text-muted">
                {audienceBand === "under_12"
                  ? "Home, then My jobs."
                  : role === "viewer"
                    ? "Home, then Jobs or Projects."
                    : memberMode
                      ? "Home, then Jobs."
                      : "Home, then Jobs."}
              </p>
            </div>
          </div>
          <div className="help-checklist">
            {recommendedGuide.points.map((point) => (
              <p key={point} className="help-checklist-item">{point}</p>
            ))}
          </div>
        </section>

        {memberMode ? (
          <>
            <section className="stats-panel">
              <p className="settings-kicker">What you will use</p>
              <h2 className="recorded-title">Keep it simple</h2>
              <div className="help-checklist">
                <p className="help-checklist-item">Open <strong>Jobs</strong> to see work added by you, assigned to you, or private jobs involving you.</p>
                <p className="help-checklist-item">Use the filter section if you want to narrow the list to assigned jobs, logged jobs, or private jobs.</p>
                <p className="help-checklist-item">If a job looks wrong or needs extra setup, ask an admin or power user to shape it further.</p>
              </div>
            </section>

            <section className="stats-panel">
              <p className="settings-kicker">Need more access?</p>
              <h2 className="recorded-title">Ask for the right role</h2>
              <div className="help-checklist">
                <p className="help-checklist-item">Ask for <strong>power user</strong> if you need projects, planning, or people setup.</p>
                <p className="help-checklist-item">Ask for <strong>admin</strong> if you need full household setup and control.</p>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="stats-panel">
              <p className="settings-kicker">Guide picker</p>
              <h2 className="recorded-title">Choose the right guide</h2>
              <div className="help-guide-grid">
                {GUIDE_SECTIONS.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="help-guide-card">
                    <strong>{section.title}</strong>
                    <span>{section.subtitle}</span>
                  </a>
                ))}
              </div>
            </section>

            {GUIDE_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="stats-panel">
                <p className="settings-kicker">Guide</p>
                <h2 className="recorded-title">{section.title}</h2>
                <p className="recorded-empty">{section.subtitle}</p>
                <div className="help-checklist">
                  {section.points.map((point) => (
                    <p key={point} className="help-checklist-item">{point}</p>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {(canManagePeopleRole(role) || role === "viewer") ? (
          <section className="stats-panel">
            <p className="settings-kicker">Household setup</p>
            <h2 className="recorded-title">Matching the account to the person</h2>
            <div className="help-checklist">
              <p className="help-checklist-item">Use `viewer` when someone should only look, not change.</p>
              <p className="help-checklist-item">Use `under 12` when someone should only see jobs picked for them.</p>
              <p className="help-checklist-item">Use location access when a person should only see one property or area.</p>
              {canManagePeopleRole(role) ? (
                <p className="help-checklist-item">
                  Open <Link href="/settings/people" className="recorded-row-edit">People</Link> to manage role, age group, theme, and location access.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
