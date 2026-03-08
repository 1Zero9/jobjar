import {
  createPersonAction,
  createRoomAction,
  logoutAction,
  removePersonAction,
  setPersonPasscodeAction,
  updateRoomAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminData } from "@/lib/admin-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { householdId } = await requireAdmin("/settings");
  const { rooms, people, tasks } = await getAdminData({ householdId });

  return (
    <div className="task-shell min-h-screen px-4 py-5 sm:px-5 sm:py-6">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="task-hero">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="task-kicker">Settings</p>
              <h1 className="task-title">Keep the app light.</h1>
              <p className="task-copy">
                Manage people and spaces here. Tasks stay on the main dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="action-btn subtle">
                Back to tasks
              </Link>
              <form action={logoutAction}>
                <button className="action-btn warn">Log out</button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="task-column">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="task-section-label">People</p>
                <h2 className="text-xl font-semibold text-[#15263c]">Household members</h2>
                <p className="mt-1 text-sm text-[#5b6e86]">Anyone who needs to see or complete tasks.</p>
              </div>
              <span className="task-count-pill">{people.length}</span>
            </div>

            <form action={createPersonAction} className="mt-4 grid gap-2 rounded-[1rem] border border-[#d6e3f4] bg-[#f7fbff] p-3">
              <input name="displayName" type="text" required placeholder="Name" className="task-text-input" />
              <input name="email" type="email" placeholder="Email (optional)" className="task-text-input" />
              <div className="flex gap-2">
                <input name="passcode" type="password" minLength={4} placeholder="Passcode" className="task-text-input" />
                <button className="action-btn bright whitespace-nowrap">Add person</button>
              </div>
            </form>

            <div className="mt-4 space-y-3">
              {people.map((person) => (
                <article key={person.id} className="task-card calm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#15263c]">{person.displayName}</p>
                      <p className="mt-1 text-xs text-[#5b6e86]">
                        {person.role} • {person.email}
                      </p>
                    </div>
                    <form action={removePersonAction}>
                      <input type="hidden" name="userId" value={person.id} />
                      <button className="action-btn warn">Remove</button>
                    </form>
                  </div>
                  <form action={setPersonPasscodeAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="userId" value={person.id} />
                    <input name="passcode" type="password" minLength={4} placeholder="Reset passcode" className="task-note-input" />
                    <button className="action-btn subtle whitespace-nowrap">Set passcode</button>
                  </form>
                </article>
              ))}
            </div>
          </article>

          <article className="task-column">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="task-section-label">Spaces</p>
                <h2 className="text-xl font-semibold text-[#15263c]">Rooms and areas</h2>
                <p className="mt-1 text-sm text-[#5b6e86]">Use these to group tasks in a way that makes sense at home.</p>
              </div>
              <span className="task-count-pill">{rooms.length}</span>
            </div>

            <form action={createRoomAction} className="mt-4 grid gap-2 rounded-[1rem] border border-[#d6e3f4] bg-[#f7fbff] p-3">
              <input name="name" type="text" required placeholder="Space name" className="task-text-input" />
              <input name="designation" type="text" placeholder="What belongs here?" className="task-text-input" />
              <button className="action-btn bright">Add space</button>
            </form>

            <div className="mt-4 space-y-3">
              {rooms.map((room) => (
                <article key={room.id} className="task-card calm">
                  <form action={updateRoomAction} className="grid gap-2">
                    <input type="hidden" name="roomId" value={room.id} />
                    <input name="name" type="text" defaultValue={room.name} className="task-text-input" />
                    <div className="flex gap-2">
                      <input name="designation" type="text" defaultValue={room.designation} className="task-text-input" />
                      <button className="action-btn subtle whitespace-nowrap">Save</button>
                    </div>
                  </form>
                  <p className="mt-3 text-xs text-[#5b6e86]">{room.taskCount} tasks in this space</p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="task-column">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="task-section-label">Snapshot</p>
              <h2 className="text-xl font-semibold text-[#15263c]">Current task load</h2>
              <p className="mt-1 text-sm text-[#5b6e86]">Read-only for now. Editing tasks stays on the main screen.</p>
            </div>
            <span className="task-count-pill">{tasks.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {tasks.slice(0, 12).map((task) => (
              <article key={task.id} className="task-card calm">
                <p className="text-sm font-semibold text-[#15263c]">{task.title}</p>
                <p className="mt-1 text-xs text-[#5b6e86]">
                  {rooms.find((room) => room.id === task.roomId)?.name ?? "General"} • {task.assigneeUserId ? "Assigned" : "Unassigned"}
                </p>
              </article>
            ))}
            {tasks.length === 0 ? <p className="task-empty-state">No tasks yet.</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
