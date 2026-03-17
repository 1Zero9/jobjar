import { updateNotificationSettingsAction } from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { FormActionButton } from "@/app/components/FormActionButton";
import { InstallPromptButton } from "@/app/components/InstallPromptButton";
import { PushPermissionButton } from "@/app/components/PushPermissionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { canManagePeopleRole, canUseMemberActions, isMemberRole, requireSessionContext } from "@/lib/auth";
import { canAccessExtendedViews, getMemberThemeClassName } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const GUIDE_SECTIONS = [
  {
    id: "standard",
    title: "Standard users",
    subtitle: "For adults, teens, admins, power users, and members who work from the main household flow.",
    points: [
      "Use /log to capture work quickly.",
      "Use /tasks to search, tidy, and finish work.",
      "Turn a job into a parent job when bigger work needs subtasks.",
      "Use /stats for a quick weekly check, not a deep dashboard.",
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
    id: "viewers",
    title: "Viewers",
    subtitle: "For read-only family members who mainly want to see what is happening.",
    points: [
      "Viewer is the best role for read-only access.",
      "Open home, jobs, and stats to keep up.",
      "This setup avoids edit controls completely.",
      "Use recent completions and open jobs as the main check-in points.",
    ],
  },
] as const;

const UPDATE_TIMELINE = [
  {
    date: "17 Mar 2026",
    title: "v2 simplification pass",
    points: [
      "Stats now shows a quick weekly check instead of a long dashboard.",
      "Standard users now share one cleaner jobs flow, location setup is pushed further into optional advanced screens, and the old planning timeline has dropped out of the everyday app flow.",
    ],
  },
  {
    date: "17 Mar 2026",
    title: "Faster routes and lighter views",
    points: [
      "Home, jobs, log, setup, stats, and admin now show loading states instead of blank waits during route changes.",
      "Viewer and simpler role paths now load less data and show fewer unnecessary controls.",
    ],
  },
  {
    date: "17 Mar 2026",
    title: "Home, jobs, and log simplified further",
    points: [
      "The home screen now behaves more like a today view, and the jobs board carries less metadata noise.",
      "The main jobs flow no longer pulls legacy planning extras by default, and quick logging is slimmer for ordinary members.",
    ],
  },
  {
    date: "16 Mar 2026",
    title: "Parent jobs simplified",
    points: [
      "Parent jobs now behave more like normal jobs with subtasks.",
      "Budgets, shopping, milestones, and timeline planning are no longer pushed as the default path.",
    ],
  },
  {
    date: "16 Mar 2026",
    title: "Validation feedback tightened",
    points: [
      "Setup, admin, tasks, and parent jobs now explain blocked or invalid actions instead of failing silently.",
      "Strict jobs now say whether a note, a start action, or more tracked time is missing.",
    ],
  },
  {
    date: "13 Mar 2026",
    title: "Help and role guidance added",
    points: [
      "In-app help was added so the household can learn the app without leaving it.",
      "Role guides now cover standard users, kids, and viewers.",
    ],
  },
  {
    date: "13 Mar 2026",
    title: "Audience and access controls improved",
    points: [
      "Audience bands now mainly split the app into standard and under-12 experiences.",
      "Location access is still available, but it now sits as an optional advanced control.",
    ],
  },
] as const;

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { userId, role, audienceBand, profileTheme } = await requireSessionContext("/help");
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const canAct = canUseMemberActions(role);
  const canSeeExtended = canAccessExtendedViews(audienceBand);
  const canSeeUpdatesTimeline = canManagePeopleRole(role);
  const canManageOwnNotifications = audienceBand !== "under_12";
  const memberMode = isMemberRole(role);
  const recommendedGuideId =
    role === "viewer"
      ? "viewers"
      : audienceBand === "under_12"
        ? "kids"
        : "standard";
  const recommendedGuide = GUIDE_SECTIONS.find((section) => section.id === recommendedGuideId) ?? GUIDE_SECTIONS[0];
  const currentUser = canManageOwnNotifications
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          notifyVia: true,
          phone: true,
        },
      })
    : null;

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
        />

        {params.updated === "notifications" ? <ToastNotice message="Notification settings updated." tone="success" /> : null}
        {params.error ? <ToastNotice message={getHelpErrorMessage(params.error)} tone="error" /> : null}

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
                  : "view the household without changing jobs"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-foreground">Best first screen</p>
              <p className="mt-2 text-sm text-muted">
                {audienceBand === "under_12"
                  ? "Home, then My jobs."
                  : role === "viewer"
                    ? "Home, then Jobs."
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

        <section className="stats-panel">
          <p className="settings-kicker">Install app</p>
          <h2 className="recorded-title">Put JobJar on this device</h2>
          <div className="help-pwa-stack">
            <p className="recorded-empty">
              Installing JobJar gives you a full-screen app feel and is required for iPhone push notifications.
            </p>
            <InstallPromptButton />
          </div>
        </section>

        {canManageOwnNotifications ? (
          <section className="stats-panel">
            <p className="settings-kicker">Notifications</p>
            <h2 className="recorded-title">This account</h2>
            <form action={updateNotificationSettingsAction} className="recorded-edit-form">
              <input type="hidden" name="returnTo" value="/help" />
              <label className="recorded-field">
                <span>Notify me by</span>
                <select name="notifyVia" defaultValue={currentUser?.notifyVia ?? "none"} className="recorded-edit-input">
                  <option value="none">None</option>
                  <option value="push">Push notification</option>
                  <option value="sms">SMS fallback</option>
                </select>
              </label>
              <label className="recorded-field">
                <span>Phone number for SMS fallback</span>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={currentUser?.phone ?? ""}
                  placeholder="+353 87 123 4567"
                  className="recorded-edit-input"
                />
              </label>
              <div className="recorded-row-actions between">
                <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                  Save notification settings
                </FormActionButton>
              </div>
            </form>
            <div className="help-pwa-stack">
              <p className="recorded-row-placeholder">
                Push notifications are device-specific. Turn them on here after installing the app.
              </p>
              <PushPermissionButton />
            </div>
          </section>
        ) : null}

        {canSeeUpdatesTimeline ? (
          <section className="stats-panel">
            <p className="settings-kicker">Recent updates</p>
            <h2 className="recorded-title">Updates timeline</h2>
            <p className="recorded-empty">Use this when you are helping the household adjust to recent changes in the app.</p>
            <div className="help-timeline">
              {UPDATE_TIMELINE.map((item) => (
                <article key={`${item.date}-${item.title}`} className="help-timeline-item">
                  <div className="help-timeline-top">
                    <p className="help-timeline-date">{item.date}</p>
                    <h3 className="help-timeline-title">{item.title}</h3>
                  </div>
                  <div className="help-checklist">
                    {item.points.map((point) => (
                      <p key={point} className="help-checklist-item">{point}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {memberMode ? (
          <>
            <section className="stats-panel">
              <p className="settings-kicker">What you will use</p>
              <h2 className="recorded-title">Keep it simple</h2>
              <div className="help-checklist">
                <p className="help-checklist-item">Open <strong>Jobs</strong> to see work added by you, assigned to you, or private jobs involving you.</p>
                <p className="help-checklist-item">Use search, room, state, and assignee to narrow the jobs list when it feels busy.</p>
                <p className="help-checklist-item">If a job looks wrong or needs extra setup, ask an admin or power user to shape it further.</p>
              </div>
            </section>

            <section className="stats-panel">
              <p className="settings-kicker">Need more access?</p>
              <h2 className="recorded-title">Ask for the right role</h2>
              <div className="help-checklist">
                <p className="help-checklist-item">Ask for <strong>power user</strong> if you need parent jobs, subtasks, or people setup.</p>
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
              <p className="help-checklist-item">Only use location access when the household really needs separate properties or areas.</p>
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

function getHelpErrorMessage(error?: string) {
  if (error === "notification-phone-invalid") {
    return "Enter a phone number in full international format, for example +353871234567.";
  }
  if (error === "notification-phone-required") {
    return "Add a phone number before choosing SMS notifications.";
  }
  return "We could not save those notification settings.";
}
