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
  await requireAdmin("/admin");
  const { rooms, tasks, people } = await getAdminData();
  const peopleById = new Map(people.map((person) => [person.id, person.displayName]));

  return (
    <div className="admin-shell min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="admin-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#587690]">Admin Workspace</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Household Setup Board</h1>
              <p className="mt-1 text-sm text-[#48637a]">Simple setup flow: add people, create rooms, then add tasks and assignments.</p>
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
              Step 2: Rooms
            </a>
            <a href="#step-tasks" className="action-btn subtle text-center sm:col-span-2">
              Step 3: Tasks
            </a>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <ProgressChip label="People" value={String(people.length)} />
            <ProgressChip label="Rooms" value={String(rooms.length)} />
            <ProgressChip label="Tasks" value={String(tasks.length)} />
          </div>
        </header>

        <section id="step-people" className="admin-panel p-4">
          <h2 className="text-lg font-semibold">Step 1: People</h2>
          <p className="text-xs text-[#587690]">Add each family member and set their personal login passcode.</p>

          <form action={createPersonAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3 md:grid-cols-4">
            <input name="displayName" type="text" required placeholder="Name" className="admin-input px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Email (optional)" className="admin-input px-3 py-2 text-sm" />
            <input name="passcode" type="password" minLength={4} placeholder="Passcode (min 4)" className="admin-input px-3 py-2 text-sm" />
            <button className="rounded-lg bg-[#3c9bd8] px-3 py-2 text-sm font-semibold text-white">Add person</button>
          </form>

          <div className="mt-3 overflow-x-auto rounded-xl border border-[#b7cada] bg-white">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#f2f8fd]">
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
                    <td className="border-b border-[#edf3f8] px-3 py-2 font-semibold">{person.displayName}</td>
                    <td className="border-b border-[#edf3f8] px-3 py-2 capitalize">{person.role}</td>
                    <td className="border-b border-[#edf3f8] px-3 py-2 text-[#587690]">{person.email}</td>
                    <td className="border-b border-[#edf3f8] px-3 py-2">
                      <form action={setPersonPasscodeAction} className="flex gap-2">
                        <input type="hidden" name="userId" value={person.id} />
                        <input name="passcode" type="password" minLength={4} placeholder="Reset" className="admin-input w-28 px-2 py-1.5 text-xs" />
                        <button className="rounded-lg border border-[#8ca9bf] px-2 py-1 text-xs font-semibold">Set</button>
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

        <section id="step-rooms" className="admin-panel p-4">
          <h2 className="text-lg font-semibold">Step 2: Rooms / Areas</h2>
          <p className="text-xs text-[#587690]">Define the spaces in the house where tasks happen.</p>

          <form action={createRoomAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3 md:grid-cols-3">
            <input name="name" type="text" required placeholder="Room name" className="admin-input px-3 py-2 text-sm" />
            <input name="designation" type="text" placeholder="Purpose" className="admin-input px-3 py-2 text-sm" />
            <button className="rounded-lg bg-[#45b06f] px-3 py-2 text-sm font-semibold text-white">Add room</button>
          </form>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-xl border border-[#b7cada] bg-white p-3">
                <form action={updateRoomAction} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input type="hidden" name="roomId" value={room.id} />
                  <input name="name" type="text" defaultValue={room.name} className="admin-input px-3 py-2 text-sm" />
                  <input name="designation" type="text" defaultValue={room.designation} className="admin-input px-3 py-2 text-sm" />
                  <button className="rounded-lg border border-[#8ca9bf] px-2 py-1 text-xs font-semibold">Save</button>
                  <span className="rounded-lg border border-[#d3e2ee] px-2 py-1 text-xs text-[#587690]">{room.taskCount} tasks</span>
                </form>
                <form action={deleteRoomAction} className="mt-2">
                  <input type="hidden" name="roomId" value={room.id} />
                  <button className="rounded-lg border border-[#d35d5d] px-2 py-1 text-xs font-semibold text-[#b63f3f]">Archive room</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section id="step-tasks" className="admin-panel p-4">
          <h2 className="text-lg font-semibold">Step 3: Tasks</h2>
          <p className="text-xs text-[#587690]">Add tasks with frequency and assignment. Fine-tune in the workbench below.</p>

          <form action={createTaskAction} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3 md:grid-cols-4">
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
            <label className="flex items-center gap-2 rounded-lg border border-[#b7cada] px-3 py-2 text-xs text-[#48637a]">
              <input type="checkbox" name="strictMode" /> Strict proof mode
            </label>
            <button className="rounded-lg bg-[#f2b13f] px-3 py-2 text-sm font-semibold text-[#4b3209] md:col-span-4">Add task</button>
          </form>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {rooms.map((room) => {
              const roomTasks = tasks.filter((task) => task.roomId === room.id);
              return (
                <article key={room.id} className="rounded-xl border border-[#b7cada] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{room.name}</h3>
                    <span className="rounded-lg border border-[#d3e2ee] px-2 py-0.5 text-xs">{roomTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {roomTasks.length === 0 ? <p className="text-xs text-[#587690]">No tasks in this room yet.</p> : null}
                    {roomTasks.map((task) => (
                      <article key={task.id} className="rounded-lg border border-[#d3e2ee] bg-[#f9fcff] p-2">
                        <form action={updateTaskAction} className="space-y-2">
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="strictModeMarker" value="1" />
                          <input name="title" type="text" defaultValue={task.title} className="admin-input w-full px-2 py-1.5 text-xs" />

                          <div className="grid grid-cols-2 gap-2">
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
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <select name="recurrenceType" defaultValue={task.recurrenceType} className="admin-input px-2 py-1.5 text-xs">
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="custom">Custom</option>
                            </select>
                            <input name="recurrenceInterval" type="number" min={1} defaultValue={task.recurrenceInterval} className="admin-input px-2 py-1.5 text-xs" />
                            <input name="recurrenceTime" type="time" defaultValue={task.recurrenceTime} className="admin-input px-2 py-1.5 text-xs" />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <input name="estimatedMinutes" type="number" min={1} defaultValue={task.estimatedMinutes} className="admin-input px-2 py-1.5 text-xs" />
                            <input name="graceHours" type="number" min={1} defaultValue={task.graceHours} className="admin-input px-2 py-1.5 text-xs" />
                            <input name="minimumMinutes" type="number" min={0} defaultValue={task.minimumMinutes} className="admin-input px-2 py-1.5 text-xs" />
                          </div>

                          <label className="flex items-center gap-1 rounded-lg border border-[#b7cada] px-2 py-1.5 text-xs text-[#48637a]">
                            <input type="checkbox" name="strictMode" defaultChecked={task.validationMode === "strict"} /> Strict mode
                          </label>

                          <input name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(task.dueAt)} className="admin-input w-full px-2 py-1.5 text-xs" />

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[#587690]">Assigned: {peopleById.get(task.assigneeUserId) ?? "Unassigned"}</span>
                            <button className="rounded-lg border border-[#8ca9bf] px-2 py-1 text-xs font-semibold">Save</button>
                          </div>
                        </form>
                        <form action={deleteTaskAction} className="mt-2">
                          <input type="hidden" name="taskId" value={task.id} />
                          <button className="w-full rounded-lg border border-[#d35d5d] px-2 py-1 text-xs font-semibold text-[#b63f3f]">Archive task</button>
                        </form>
                      </article>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProgressChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#c8d9e8] bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#587690]">{label}</p>
      <p className="text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function toDateTimeLocal(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
