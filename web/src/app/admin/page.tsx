import {
  createPersonAction,
  createRoomAction,
  createTaskAction,
  deleteRoomAction,
  deleteTaskAction,
  logoutAction,
  removePersonAction,
  setPersonPasscodeAction,
  updateRoomAction,
  updateTaskAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminData } from "@/lib/admin-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { householdId } = await requireAdmin("/admin");
  const { rooms, tasks, people } = await getAdminData({ householdId });
  const peopleById = new Map(people.map((person) => [person.id, person.displayName]));
  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));

  return (
    <div className="workday-gradient min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="board-shell p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526071]">Admin Workspace</p>
              <h1 className="mt-1 text-2xl font-bold text-[#111f33] sm:text-3xl">Shape The Household Work</h1>
              <p className="mt-1 text-sm text-[#5e6e80]">Turn raw captures into owned, roomed, scheduled household jobs.</p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-[28rem]">
            <Link href="/" className="action-btn subtle text-center">
              Daily View
            </Link>
            <Link href="/tv" className="action-btn subtle text-center">
              TV Dashboard
            </Link>
            <a href="#step-people" className="action-btn subtle text-center">
              Step 1: People
            </a>
            <a href="#step-rooms" className="action-btn subtle text-center">
              Step 2: Spaces
            </a>
            <a href="#step-tasks" className="action-btn subtle text-center sm:col-span-2">
              Step 3: Jobs
            </a>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:w-[28rem]">
            <ProgressChip label="People" value={String(people.length)} />
            <ProgressChip label="Rooms" value={String(rooms.length)} />
            <ProgressChip label="Tasks" value={String(tasks.length)} />
          </div>
        </header>

        <section id="step-people" className="board-shell admin-step people p-4">
          <h2 className="text-lg font-semibold">Step 1: People</h2>
          <p className="text-xs text-[#5e6e80]">Add the people who will notice, own, and complete jobs.</p>

          <form action={createPersonAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] p-3 md:grid-cols-4">
            <input name="displayName" type="text" required placeholder="Name" className="admin-input px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Email (optional)" className="admin-input px-3 py-2 text-sm" />
            <input name="passcode" type="password" minLength={4} placeholder="Passcode (min 4)" className="admin-input px-3 py-2 text-sm" />
            <button className="action-btn bright">Add person</button>
          </form>

          <div className="mt-3 overflow-x-auto rounded-xl border border-[#d7e3f4] bg-[#f4f9ff]">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#f7f9ff] text-[#5e6e80]">
                <tr>
                  <th className="border-b border-[#d3e2ee] px-3 py-2">Name</th>
                  <th className="border-b border-[#d3e2ee] px-3 py-2">Role</th>
                  <th className="border-b border-[#d3e2ee] px-3 py-2">Email</th>
                  <th className="border-b border-[#d3e2ee] px-3 py-2">Passcode</th>
                  <th className="border-b border-[#d3e2ee] px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td className="border-b border-[#edf3f8] px-3 py-2 font-semibold text-[#17263a]">{person.displayName}</td>
                    <td className="border-b border-[#edf3f8] px-3 py-2 capitalize text-[#41546a]">{person.role}</td>
                    <td className="border-b border-[#edf3f8] px-3 py-2 text-[#5e6e80]">{person.email}</td>
                    <td className="border-b border-[#edf3f8] px-3 py-2">
                      <form action={setPersonPasscodeAction} className="flex gap-2">
                        <input type="hidden" name="userId" value={person.id} />
                        <input name="passcode" type="password" minLength={4} placeholder="Reset" className="admin-input w-28 px-2 py-1.5 text-xs" />
                        <button className="action-btn subtle">Set</button>
                      </form>
                    </td>
                    <td className="border-b border-[#edf3f8] px-3 py-2">
                      <form action={removePersonAction}>
                        <input type="hidden" name="userId" value={person.id} />
                        <button className="rounded-lg border border-[#d35d5d] px-2 py-1 text-xs font-semibold text-[#b63f3f]">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="step-rooms" className="board-shell admin-step rooms p-4">
          <h2 className="text-lg font-semibold">Step 2: Spaces / Areas</h2>
          <p className="text-xs text-[#5e6e80]">Define the real-world spaces jobs belong to: rooms, garden zones, attic, car, outside.</p>

          <form action={createRoomAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] p-3 md:grid-cols-3">
            <input name="name" type="text" required placeholder="Space name" className="admin-input px-3 py-2 text-sm" />
            <input name="designation" type="text" placeholder="What kind of work happens here?" className="admin-input px-3 py-2 text-sm" />
            <button className="action-btn bright">Add space</button>
          </form>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-xl border border-[#d7e3f4] bg-[#f7fbff] p-3">
                <form action={updateRoomAction} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input type="hidden" name="roomId" value={room.id} />
                  <input name="name" type="text" defaultValue={room.name} className="admin-input px-3 py-2 text-sm" />
                  <input name="designation" type="text" defaultValue={room.designation} className="admin-input px-3 py-2 text-sm" />
                  <button className="action-btn subtle">Save</button>
                  <span className="rounded-lg border border-[#d3e2ee] px-2 py-1 text-xs text-[#5e6e80]">{room.taskCount} tasks</span>
                </form>
                <form action={deleteRoomAction} className="mt-2">
                  <input type="hidden" name="roomId" value={room.id} />
                  <button className="rounded-lg border border-[#d35d5d] px-2 py-1 text-xs font-semibold text-[#b63f3f]">Archive room</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section id="step-tasks" className="board-shell admin-step tasks p-4">
          <h2 className="text-lg font-semibold">Step 3: Jobs</h2>
          <p className="text-xs text-[#5e6e80]">Take captured jobs and give them structure. Quick add first. Open Advanced when the work needs rules or recurrence.</p>

          <form action={createTaskAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] p-3 md:grid-cols-4">
            <input name="title" type="text" required placeholder="Job title" className="admin-input px-3 py-2 text-sm" />
            <select name="roomId" required className="admin-input px-3 py-2 text-sm">
              <option value="">Pick space</option>
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
            <details className="rounded-lg border border-[#d3e2ee] bg-[#f8fbff] px-3 py-2 text-sm text-[#48637a] md:col-span-4">
              <summary className="cursor-pointer font-semibold">Advanced options</summary>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <select name="recurrenceType" defaultValue="weekly" className="admin-input px-3 py-2 text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
                <input name="recurrenceInterval" type="number" min={1} defaultValue={1} className="admin-input px-3 py-2 text-sm" />
                <input name="recurrenceTime" type="time" defaultValue="09:00" className="admin-input px-3 py-2 text-sm" />
                <input name="estimatedMinutes" type="number" min={1} defaultValue={15} className="admin-input px-3 py-2 text-sm" />
                <input name="graceHours" type="number" min={1} defaultValue={12} className="admin-input px-3 py-2 text-sm" />
                <input name="minimumMinutes" type="number" min={0} defaultValue={0} className="admin-input px-3 py-2 text-sm" />
              </div>
              <label className="mt-2 flex items-center gap-2 rounded-lg border border-[#b7cada] px-3 py-2 text-xs text-[#48637a]">
                <input type="checkbox" name="strictMode" /> Strict proof mode
              </label>
            </details>
              <button className="action-btn bright md:col-span-4">Add job</button>
          </form>

          <div className="mt-3 overflow-hidden rounded-xl border border-[#d7e3f4] bg-[#f4f9ff]">
            <div className="admin-grid-header hidden px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#5e6e80] md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:gap-2">
              <p>Job</p>
              <p>Space</p>
              <p>Owner</p>
              <p>Due</p>
              <p>Actions</p>
            </div>
            <div className="space-y-2 p-2">
              {tasks.length === 0 ? <p className="rounded-lg bg-[#f7f9ff] p-3 text-sm text-[#5e6e80]">No jobs yet. Start shaping the captures above.</p> : null}
              {tasks.map((task) => (
                <article key={task.id} className="rounded-lg border border-[#e3ebf8] bg-[#fbfdff] p-2">
                  <form action={updateTaskAction} className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="strictModeMarker" value="1" />
                    <input name="title" type="text" defaultValue={task.title} className="admin-input px-2 py-1.5 text-xs" />
                    <select name="roomId" defaultValue={task.roomId} className="admin-input px-2 py-1.5 text-xs">
                      {rooms.map((roomOption) => (
                        <option key={roomOption.id} value={roomOption.id}>
                          {roomOption.name}
                        </option>
                      ))}
                    </select>
                    <select name="assigneeUserId" defaultValue={task.assigneeUserId} className="admin-input px-2 py-1.5 text-xs">
                      <option value="">Unassigned</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.displayName}
                        </option>
                      ))}
                    </select>
                    <input name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(task.dueAt)} className="admin-input px-2 py-1.5 text-xs" />
                    <div className="flex items-center gap-2">
                      <button className="action-btn subtle">Save</button>
                    </div>
                  </form>
                  <form action={deleteTaskAction} className="mt-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <button className="action-btn warn">Archive</button>
                  </form>
                  <div className="mt-2">
                    <p className="text-[11px] text-[#5e6e80]">
                      Room: {roomNameById.get(task.roomId) ?? "Unknown"} • Assigned: {peopleById.get(task.assigneeUserId) ?? "Unassigned"}
                    </p>
                  </div>
                  <details className="mt-2 rounded-lg border border-[#d3e2ee] bg-[#f8fbff] px-2 py-1.5 text-xs text-[#48637a]">
                    <summary className="cursor-pointer font-semibold">Advanced</summary>
                    <form action={updateTaskAction} className="mt-2 space-y-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="title" value={task.title} />
                      <input type="hidden" name="roomId" value={task.roomId} />
                      <input type="hidden" name="assigneeUserId" value={task.assigneeUserId} />
                      <input type="hidden" name="dueAt" value={toDateTimeLocal(task.dueAt)} />
                      <input type="hidden" name="strictModeMarker" value="1" />
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <select name="recurrenceType" defaultValue={task.recurrenceType} className="admin-input px-2 py-1.5 text-xs">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom</option>
                        </select>
                        <input name="recurrenceInterval" type="number" min={1} defaultValue={task.recurrenceInterval} className="admin-input px-2 py-1.5 text-xs" />
                        <input name="recurrenceTime" type="time" defaultValue={task.recurrenceTime} className="admin-input px-2 py-1.5 text-xs" />
                        <input name="estimatedMinutes" type="number" min={1} defaultValue={task.estimatedMinutes} className="admin-input px-2 py-1.5 text-xs" />
                        <input name="graceHours" type="number" min={1} defaultValue={task.graceHours} className="admin-input px-2 py-1.5 text-xs" />
                        <input name="minimumMinutes" type="number" min={0} defaultValue={task.minimumMinutes} className="admin-input px-2 py-1.5 text-xs" />
                      </div>
                      <label className="flex items-center gap-1 rounded-lg border border-[#b7cada] px-2 py-1.5 text-xs text-[#48637a]">
                        <input type="checkbox" name="strictMode" defaultChecked={task.validationMode === "strict"} /> Strict mode
                      </label>
                      <button className="action-btn subtle">Save advanced</button>
                    </form>
                  </details>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProgressChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d7e3f4] bg-[#eef4ff] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#5e6e80]">{label}</p>
      <p className="text-lg font-bold leading-none text-[#17263a]">{value}</p>
    </div>
  );
}

function toDateTimeLocal(dateIso: string | null) {
  if (!dateIso) {
    return "";
  }
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
