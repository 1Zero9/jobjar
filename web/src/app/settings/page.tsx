import { logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { requireAdmin } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
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
        <header className="settings-hero">
          <div>
            <div className="capture-topline">
              <p className="settings-kicker">Setup</p>
              <span className="version-chip">{APP_VERSION}</span>
            </div>
            <h1 className="settings-title">Manage the app setup</h1>
            <p className="settings-copy">Rooms and people now live in their own setup sections so the flow stays clearer.</p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/" className="action-btn subtle quiet">
              Home
            </Link>
            <Link href="/tasks" className="action-btn subtle quiet">
              Tasks
            </Link>
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
          </div>
        </header>

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
              <span>{peopleCount} household members and admins.</span>
            </Link>

            <Link href="/admin" className="landing-action-card">
              <span className="landing-action-kicker">Tasks</span>
              <strong>Shape tasks</strong>
              <span>Type, stage, schedule, and assign tasks.</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
