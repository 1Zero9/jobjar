import { AppPageHeader } from "@/app/components/AppPageHeader";
import { LogoutIconButton } from "@/app/components/LogoutIconButton";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { APP_VERSION } from "@/lib/app-version";
import { canAccessReportingViewsRole, canManagePeopleRole, requireSessionContext } from "@/lib/auth";
import { HelpIcon, PeopleIcon, SettingsIcon, StatsIcon, TasksIcon } from "@/lib/icons";
import { canAccessExtendedViews, getMemberThemeClassName, isChildAudience } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const { userId, role, audienceBand, profileTheme } = await requireSessionContext("/more");
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const childMode = isChildAudience(audienceBand);
  const viewerMode = role === "viewer";
  const canSeeExtended = canAccessExtendedViews(audienceBand);
  const canSeeReports = canAccessReportingViewsRole(role) && canSeeExtended;
  const canManagePeople = canManagePeopleRole(role);

  return (
    <div className={`capture-shell page-more ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title="More"
          subtitle={childMode ? "A short list of the extra things you might need." : viewerMode ? "A simple list of the extra places you can look." : "The smaller set of extra places in the app."}
          iconClassName="help"
          icon={<SettingsIcon width="36" height="36" />}
        />

        <section className="stats-panel more-profile-panel">
          <p className="settings-kicker">Account</p>
          <div className="more-profile-row">
            <div>
              <h2 className="recorded-title">{currentUser?.displayName ?? "You"}</h2>
              <p className="recorded-empty">{childMode ? "Child mode stays small on purpose." : viewerMode ? "Use this page for the extra places you can check in on." : "Use this page for the rest of the app."}</p>
            </div>
            <span className="version-chip">{APP_VERSION}</span>
          </div>
          <div className="more-tools-row">
            <div className="more-tool-card">
              <span className="more-tool-label">Theme</span>
              <ThemeToggle />
            </div>
            <div className="more-tool-card">
              <span className="more-tool-label">Sign out</span>
              <LogoutIconButton />
            </div>
          </div>
        </section>

        <section className="landing-panel more-links-panel">
          <div className="landing-grid more-links-grid">
            <Link href="/tasks" className="landing-action-card">
              <span className="landing-action-kicker">Jobs</span>
              <strong>Open jobs</strong>
              <span>See what needs attention, is due today, or is already done.</span>
              <span className="more-link-icon"><TasksIcon width="20" height="20" /></span>
            </Link>

            <Link href="/help" className="landing-action-card">
              <span className="landing-action-kicker">Help</span>
              <strong>Simple guides</strong>
              <span>Short guidance for this account and the rest of the household.</span>
              <span className="more-link-icon"><HelpIcon width="20" height="20" /></span>
            </Link>

            {canSeeReports ? (
              <Link href="/stats" className="landing-action-card">
                <span className="landing-action-kicker">Stats</span>
                <strong>Check progress</strong>
                <span>See a quick weekly check and recent completions.</span>
                <span className="more-link-icon"><StatsIcon width="20" height="20" /></span>
              </Link>
            ) : null}

            {role === "admin" ? (
              <Link href="/settings" className="landing-action-card">
                <span className="landing-action-kicker">Setup</span>
                <strong>Rooms and people</strong>
                <span>Manage the household structure and access.</span>
                <span className="more-link-icon"><SettingsIcon width="20" height="20" /></span>
              </Link>
            ) : canManagePeople ? (
              <Link href="/settings/people" className="landing-action-card">
                <span className="landing-action-kicker">People</span>
                <strong>Manage people</strong>
                <span>Keep names, ages, and profiles current.</span>
                <span className="more-link-icon"><PeopleIcon width="20" height="20" /></span>
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
