import {
  createPersonAction,
  logoutAction,
  removePersonAction,
  setPersonPasscodeAction,
} from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireAdmin } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const params = await searchParams;
  const { householdId } = await requireAdmin("/settings/people");

  const people = await prisma.householdMember.findMany({
    where: { householdId },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="settings-shell min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <header className="settings-hero">
          <div>
            <div className="capture-topline">
              <p className="settings-kicker">Setup / People</p>
              <span className="version-chip">{APP_VERSION}</span>
            </div>
            <h1 className="settings-title">Manage people</h1>
            <p className="settings-copy">People setup is separate now, so ownership and room configuration do not compete on the same screen.</p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/settings" className="action-btn subtle quiet">
              Setup home
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

        {params.added === "person" ? <ToastNotice message="Person added." tone="success" /> : null}

        <section className="settings-panel">
          <div className="room-setup-header">
            <div>
              <p className="settings-kicker">People</p>
              <h2 className="recorded-title">Household members</h2>
            </div>
            <span className="recorded-count">{people.length}</span>
          </div>

          <form action={createPersonAction} className="capture-form-simple">
            <input type="hidden" name="returnTo" value="/settings/people" />
            <input name="displayName" type="text" required placeholder="Name" className="capture-main-input" />
            <input name="email" type="email" placeholder="Email (optional)" className="capture-room-select" />
            <select name="role" defaultValue="member" className="capture-room-select">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <input name="passcode" type="password" minLength={4} placeholder="Passcode" className="capture-room-select" />
            <FormActionButton className="capture-submit-btn" pendingLabel="Adding person">
              Add person
            </FormActionButton>
          </form>

          <div className="recorded-list">
            {people.map((person, index) => (
              <details key={person.user.id} className={`recorded-row recorded-row-${rowTone(index)}`}>
                <summary className="recorded-row-summary">
                  <div className="recorded-row-main">
                    <p className="recorded-row-title">{person.user.displayName}</p>
                    <p className="recorded-row-placeholder">{person.user.email}</p>
                  </div>
                  <div className="recorded-row-meta">
                    <span className="recorded-row-room">{person.role}</span>
                    <div className="recorded-row-summary-actions">
                      <span className="recorded-row-edit">Edit</span>
                      <span className="recorded-row-chevron">+</span>
                    </div>
                  </div>
                </summary>
                <div className="recorded-row-detail">
                  <p><span>Name</span><strong>{person.user.displayName}</strong></p>
                  <p><span>Role</span><strong>{person.role}</strong></p>
                  <p><span>Email</span><strong>{person.user.email}</strong></p>
                  <form action={setPersonPasscodeAction} className="recorded-edit-form">
                    <input type="hidden" name="userId" value={person.user.id} />
                    <label className="recorded-field">
                      <span>Reset passcode</span>
                      <input name="passcode" type="password" minLength={4} placeholder="New passcode" className="recorded-edit-input" />
                    </label>
                    <div className="recorded-row-actions between">
                      <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                        Save passcode
                      </FormActionButton>
                    </div>
                  </form>
                  <form action={removePersonAction} className="recorded-row-actions">
                    <input type="hidden" name="userId" value={person.user.id} />
                    <FormActionButton className="action-btn warn quiet" pendingLabel="Removing">
                      Remove person
                    </FormActionButton>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function rowTone(index: number) {
  const tones = ["blue", "green", "amber", "rose"] as const;
  return tones[index % tones.length];
}
