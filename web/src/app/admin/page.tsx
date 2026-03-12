import {
  createPersonAction,
  createRoomAction,
  createTaskAction,
  deleteRoomAction,
  logoutAction,
  removePersonAction,
  setPersonPasscodeAction,
  updateRoomAction,
} from "@/app/actions";
import { AdminTasksClient } from "@/app/components/AdminTasksClient";
import { requireAdmin } from "@/lib/auth";
import { getAdminData } from "@/lib/admin-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { householdId } = await requireAdmin("/admin");
  const { rooms, tasks, people } = await getAdminData({ householdId });
  const projectOptions = tasks.filter((task) => task.jobKind === "project" || task.childCount > 0);

  return (
    <div className="workday-gradient min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="board-shell p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Admin</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Admin Workspace</h1>
              <p className="mt-1 text-sm text-muted">Manage people, rooms, and tasks for the household.</p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-[28rem]">
            <Link href="/" className="action-btn subtle text-center">
              Home
            </Link>
            <a href="#section-people" className="action-btn subtle text-center">
              People
            </a>
            <a href="#section-rooms" className="action-btn subtle text-center">
              Rooms
            </a>
            <a href="#section-tasks" className="action-btn subtle text-center sm:col-span-2">
              Tasks
            </a>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:w-[28rem]">
            <ProgressChip label="People" value={String(people.length)} />
            <ProgressChip label="Rooms" value={String(rooms.length)} />
            <ProgressChip label="Tasks" value={String(tasks.length)} />
          </div>
        </header>

        <section id="section-people" className="board-shell admin-step people p-4">
          <h2 className="text-lg font-semibold">People</h2>
          <p className="text-xs text-muted">Add the people who will notice, own, and complete tasks.</p>

          <form action={createPersonAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border-accent-muted bg-accent-soft p-3 md:grid-cols-4">
            <input name="displayName" type="text" required placeholder="Name" className="admin-input px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Email (optional)" className="admin-input px-3 py-2 text-sm" />
            <input name="passcode" type="password" minLength={4} placeholder="Passcode (min 4)" className="admin-input px-3 py-2 text-sm" />
            <button className="action-btn bright">Add person</button>
          </form>

          <div className="mt-3 overflow-x-auto rounded-xl border border-accent-muted bg-accent-soft">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="border-b border-border px-3 py-2">Name</th>
                  <th className="border-b border-border px-3 py-2">Role</th>
                  <th className="border-b border-border px-3 py-2">Email</th>
                  <th className="border-b border-border px-3 py-2">Passcode</th>
                  <th className="border-b border-border px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td className="border-b border-border px-3 py-2 font-semibold text-foreground">{person.displayName}</td>
                    <td className="border-b border-border px-3 py-2 capitalize text-muted">{person.role}</td>
                    <td className="border-b border-border px-3 py-2 text-muted">{person.email}</td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={setPersonPasscodeAction} className="flex gap-2">
                        <input type="hidden" name="userId" value={person.id} />
                        <input name="passcode" type="password" minLength={4} placeholder="Reset" className="admin-input w-28 px-2 py-1.5 text-xs" />
                        <button className="action-btn subtle">Set</button>
                      </form>
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={removePersonAction}>
                        <input type="hidden" name="userId" value={person.id} />
                        <button className="rounded-lg border border-error px-2 py-1 text-xs font-semibold text-error">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="section-rooms" className="board-shell admin-step rooms p-4">
          <h2 className="text-lg font-semibold">Rooms</h2>
          <p className="text-xs text-muted">Define the real-world areas tasks belong to: rooms, garden, attic, car, outside.</p>

          <form action={createRoomAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border-accent-muted bg-accent-soft p-3 md:grid-cols-3">
            <input name="name" type="text" required placeholder="Room name" className="admin-input px-3 py-2 text-sm" />
            <input name="designation" type="text" placeholder="Group e.g. Upstairs / Outside" className="admin-input px-3 py-2 text-sm" />
            <button className="action-btn bright">Add room</button>
          </form>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-xl border border-accent-muted bg-surface p-3">
                <form action={updateRoomAction} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input type="hidden" name="roomId" value={room.id} />
                  <input name="name" type="text" defaultValue={room.name} className="admin-input px-3 py-2 text-sm" />
                  <input name="designation" type="text" defaultValue={room.designation} className="admin-input px-3 py-2 text-sm" />
                  <button className="action-btn subtle">Save</button>
                  <span className="rounded-lg border border-border px-2 py-1 text-xs text-muted">{room.taskCount} tasks</span>
                </form>
                <form action={deleteRoomAction} className="mt-2">
                  <input type="hidden" name="roomId" value={room.id} />
                  <button className="rounded-lg border border-error px-2 py-1 text-xs font-semibold text-error">Archive room</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section id="section-tasks" className="board-shell admin-step tasks p-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-xs text-muted">Give tasks structure: type, stage, location, schedule, and ownership.</p>

          <form action={createTaskAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border-accent-muted bg-accent-soft p-3 md:grid-cols-4">
            <input name="title" type="text" required placeholder="Task title" className="admin-input px-3 py-2 text-sm" />
            <select name="roomId" required className="admin-input px-3 py-2 text-sm">
              <option value="">Pick room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <select name="assigneeUserId" className="admin-input px-3 py-2 text-sm">
              <option value="">Assign later</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
            <input name="dueAt" type="datetime-local" className="admin-input px-3 py-2 text-sm" />
            <select name="jobKind" defaultValue="upkeep" className="admin-input px-3 py-2 text-sm">
              <option value="upkeep">Upkeep</option>
              <option value="issue">Issue</option>
              <option value="project">Project</option>
              <option value="clear_out">Clear-out</option>
              <option value="outdoor">Outdoor</option>
              <option value="planning">Planning</option>
            </select>
            <select name="captureStage" defaultValue="shaped" className="admin-input px-3 py-2 text-sm">
              <option value="captured">Captured</option>
              <option value="shaped">Shaped</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
            </select>
            <input name="locationDetails" type="text" placeholder="Specific location e.g. front garden" className="admin-input px-3 py-2 text-sm md:col-span-2" />
            <input name="detailNotes" type="text" placeholder="Notes, next step, or materials" className="admin-input px-3 py-2 text-sm md:col-span-3" />
            <select name="projectParentId" defaultValue="" className="admin-input px-3 py-2 text-sm">
              <option value="">No parent project</option>
              {projectOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <details className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted md:col-span-4">
              <summary className="cursor-pointer font-semibold">Recurrence &amp; timing</summary>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <label className="admin-field-label">
                  <span>Repeats</span>
                  <select name="recurrenceType" defaultValue="weekly" className="admin-input px-3 py-2 text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="admin-field-label">
                  <span>Every N</span>
                  <input name="recurrenceInterval" type="number" min={1} defaultValue={1} className="admin-input px-3 py-2 text-sm" />
                </label>
                <label className="admin-field-label">
                  <span>Time of day</span>
                  <input name="recurrenceTime" type="time" defaultValue="09:00" className="admin-input px-3 py-2 text-sm" />
                </label>
                <label className="admin-field-label">
                  <span>Est. minutes</span>
                  <input name="estimatedMinutes" type="number" min={1} defaultValue={15} className="admin-input px-3 py-2 text-sm" />
                </label>
                <label className="admin-field-label">
                  <span>Grace hours</span>
                  <input name="graceHours" type="number" min={1} defaultValue={12} className="admin-input px-3 py-2 text-sm" />
                </label>
                <label className="admin-field-label">
                  <span>Min. minutes</span>
                  <input name="minimumMinutes" type="number" min={0} defaultValue={0} className="admin-input px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="mt-2 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted">
                <input type="checkbox" name="strictMode" /> Strict proof mode
              </label>
            </details>
            <button className="action-btn bright md:col-span-4">Add task</button>
          </form>

          <div className="mt-3">
            <AdminTasksClient tasks={tasks} rooms={rooms} people={people} />
          </div>
        </section>
      </main>
    </div>
  );
}

function ProgressChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-accent-muted bg-accent-soft px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-bold leading-none text-foreground">{value}</p>
    </div>
  );
}

