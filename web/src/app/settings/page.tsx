import { AppPageHeader } from "@/app/components/AppPageHeader";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { householdId } = await requireAdmin("/settings");

  const [roomCount, peopleCount, locationCount, taskCount] = await Promise.all([
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
    prisma.task.count({
      where: {
        active: true,
        room: { householdId },
      },
    }),
  ]);
  const setupReady = roomCount > 0 && taskCount > 0;

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
          scopeLabel="All locations"
        />

        <section className="landing-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="settings-kicker">Guided setup</p>
              <h2 className="recorded-title">{setupReady ? "Setup is ready" : "Start here"}</h2>
              <p className="recorded-empty">
                {setupReady
                  ? "Use the guided path when you want to review the basics or help someone new set the board up."
                  : "Take the short route: people, rooms, then the first job."}
              </p>
            </div>
            <Link href="/setup/start" className="recorded-row-edit recorded-row-edit-bright">
              {setupReady ? "Review" : "Open guide"}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-border bg-surface px-3 py-4">
              <p className="text-2xl font-bold text-foreground">{peopleCount}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">People</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-3 py-4">
              <p className="text-2xl font-bold text-foreground">{roomCount}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Rooms</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-3 py-4">
              <p className="text-2xl font-bold text-foreground">{taskCount}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Jobs</p>
            </div>
          </div>
        </section>

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
