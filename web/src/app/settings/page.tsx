import { AppPageHeader } from "@/app/components/AppPageHeader";
import { LogoutIconButton } from "@/app/components/LogoutIconButton";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { householdId } = await requireAdmin("/settings");

  const [roomCount, peopleCount, locationCount] = await Promise.all([
    prisma.room.count({
      where: {
        householdId,
        active: true,
        name: { not: "Unsorted" },
      },
    }),
    prisma.householdMember.count({
      where: { householdId },
    }),
    prisma.location.count({
      where: { householdId, active: true },
    }),
  ]);

  return (
    <div className="settings-shell page-settings min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title="Setup"
          subtitle="Rooms and people now live in their own setup sections so the flow stays clearer."
          iconClassName="settings"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
          cornerAction={<LogoutIconButton />}
          scopeLabel="All locations"
          actions={
            <>
              <Link href="/" className="action-btn subtle quiet home-action">
                Home
              </Link>
              <Link href="/tasks" className="action-btn subtle quiet">
                View jobs
              </Link>
              <Link href="/projects" className="action-btn subtle quiet">
                Projects
              </Link>
            </>
          }
        />

        <section className="landing-panel">
          <div className="landing-grid">
            <Link href="/settings/locations" className="landing-action-card">
              <span className="landing-action-kicker">Locations</span>
              <strong>Manage locations</strong>
              <span>{locationCount} {locationCount === 1 ? "property" : "properties"} set up.</span>
            </Link>

            <Link href="/settings/rooms" className="landing-action-card">
              <span className="landing-action-kicker">Rooms</span>
              <strong>Manage rooms</strong>
              <span>{roomCount} active rooms and spaces.</span>
            </Link>

            <Link href="/settings/people" className="landing-action-card">
              <span className="landing-action-kicker">People</span>
              <strong>Manage people</strong>
              <span>{peopleCount} household people across all roles.</span>
            </Link>

            <Link href="/admin" className="landing-action-card">
              <span className="landing-action-kicker">View jobs</span>
              <strong>Shape jobs</strong>
              <span>Type, stage, schedule, and assign jobs.</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
