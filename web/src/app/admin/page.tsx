import {
  createPersonAction,
  createRoomAction,
  createTaskAction,
  deleteRoomAction,
  deleteTaskAction,
  logoutAction,
  removePersonAction,
  updateRoomAction,
  updateTaskAction,
} from "@/app/actions";
import { requireSessionUserId } from "@/lib/auth";
import { getAdminData } from "@/lib/admin-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireSessionUserId("/admin");
  const { rooms, tasks, people } = await getAdminData();
  const peopleById = new Map(people.map((person) => [person.id, person.displayName]));

  return (
    <div className="admin-shell min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="admin-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#587690]">Admin Workspace</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Household Planning Board</h1>
              <p className="mt-1 text-sm text-[#48637a]">
                Set up rooms, add people, and tune tasks. Think of this as the family control center.
              </p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-80">
            <Link href="/" className="action-btn subtle text-center">
              Daily View
            </Link>
            <Link href="/tv" className="action-btn subtle text-center">
              TV Dashboard
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="admin-panel p-4">
            <h2 className="text-lg font-semibold">Rooms / Areas</h2>
            <p className="text-xs text-[#587690]">Create household areas and keep their purpose clear.</p>
            <form action={createRoomAction} className="mt-3 space-y-2 rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3">
              <input name="name" type="text" required placeholder="Room name" className="admin-input w-full px-3 py-2 text-sm" />
              <input name="designation" type="text" placeholder="Purpose" className="admin-input w-full px-3 py-2 text-sm" />
              <button className="w-full rounded-lg bg-[#45b06f] px-3 py-2 text-sm font-semibold text-white">Add room</button>
            </form>

            <div className="mt-3 space-y-2">
              {rooms.map((room) => (
                <article key={room.id} className="rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3">
                  <form action={updateRoomAction} className="space-y-2">
                    <input type="hidden" name="roomId" value={room.id} />
                    <input name="name" type="text" defaultValue={room.name} className="admin-input w-full px-3 py-2 text-sm" />
                    <input name="designation" type="text" defaultValue={room.designation} className="admin-input w-full px-3 py-2 text-sm" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#587690]">{room.taskCount} tasks</span>
                      <button className="rounded-lg border border-[#8ca9bf] px-2 py-1 text-xs font-semibold">Save</button>
                    </div>
                  </form>
                  <form action={deleteRoomAction} className="mt-2">
                    <input type="hidden" name="roomId" value={room.id} />
                    <button className="w-full rounded-lg border border-[#d35d5d] px-2 py-1 text-xs font-semibold text-[#b63f3f]">Archive room</button>
                  </form>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-panel p-4">
            <h2 className="text-lg font-semibold">People</h2>
            <p className="text-xs text-[#587690]">Add family members so tasks can be assigned clearly.</p>
            <form action={createPersonAction} className="mt-3 space-y-2 rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3">
              <input name="displayName" type="text" required placeholder="Name" className="admin-input w-full px-3 py-2 text-sm" />
              <input name="email" type="email" placeholder="Email (optional)" className="admin-input w-full px-3 py-2 text-sm" />
              <button className="w-full rounded-lg bg-[#3c9bd8] px-3 py-2 text-sm font-semibold text-white">Add person</button>
            </form>
            <div className="mt-3 space-y-2">
              {people.map((person) => (
                <article key={person.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#b7cada] bg-[#f7fbff] px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{person.displayName}</p>
                    <p className="text-xs text-[#587690]">{person.role} • {person.email}</p>
                  </div>
                  <form action={removePersonAction}>
                    <input type="hidden" name="userId" value={person.id} />
                    <button className="rounded-lg border border-[#d35d5d] px-2 py-1 text-xs font-semibold text-[#b63f3f]">Remove</button>
                  </form>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-panel p-4">
            <h2 className="text-lg font-semibold">Quick Task Capture</h2>
            <p className="text-xs text-[#587690]">Walk into a room, add jobs, set frequency and owner.</p>
            <form action={createTaskAction} className="mt-3 space-y-2 rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3">
              <input name="title" type="text" required placeholder="Job title" className="admin-input w-full px-3 py-2 text-sm" />
              <select name="roomId" required className="admin-input w-full px-3 py-2 text-sm">
                <option value="">Pick room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <select name="assigneeUserId" className="admin-input w-full px-3 py-2 text-sm">
                <option value="">Assign later</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <select name="recurrenceType" defaultValue="weekly" className="admin-input px-2 py-2 text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
                <input name="recurrenceInterval" type="number" min={1} defaultValue={1} className="admin-input px-2 py-2 text-sm" />
                <input name="recurrenceTime" type="time" defaultValue="09:00" className="admin-input px-2 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="estimatedMinutes" type="number" min={1} defaultValue={15} className="admin-input px-2 py-2 text-sm" />
                <input name="graceHours" type="number" min={1} defaultValue={12} className="admin-input px-2 py-2 text-sm" />
              </div>
              <input name="dueAt" type="datetime-local" className="admin-input w-full px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 rounded-lg border border-[#b7cada] px-2 py-2 text-xs text-[#48637a]">
                <input type="checkbox" name="strictMode" /> Strict proof mode
              </label>
              <input
                name="minimumMinutes"
                type="number"
                min={0}
                defaultValue={0}
                placeholder="Minimum minutes for strict mode"
                className="admin-input w-full px-3 py-2 text-sm"
              />
              <button className="w-full rounded-lg bg-[#f2b13f] px-3 py-2 text-sm font-semibold text-[#4b3209]">Add task</button>
            </form>
          </article>
        </section>

        <section className="admin-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Task Workbench</h2>
              <p className="text-xs text-[#587690]">DevOps-style board by room. Edit and archive in place.</p>
            </div>
            <span className="rounded-lg border border-[#8ca9bf] px-2 py-1 text-xs font-semibold">{tasks.length} tasks</span>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            {rooms.map((room) => {
              const roomTasks = tasks.filter((task) => task.roomId === room.id);
              return (
                <article key={room.id} className="rounded-xl border border-[#b7cada] bg-[#f7fbff] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{room.name}</h3>
                    <span className="rounded-lg border border-[#8ca9bf] px-2 py-0.5 text-xs">{roomTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {roomTasks.length === 0 ? <p className="text-xs text-[#587690]">No tasks in this room yet.</p> : null}
                    {roomTasks.map((task) => (
                      <article key={task.id} className="rounded-lg border border-[#b7cada] bg-white p-2">
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
                            <input
                              name="recurrenceInterval"
                              type="number"
                              min={1}
                              defaultValue={task.recurrenceInterval}
                              className="admin-input px-2 py-1.5 text-xs"
                            />
                            <input name="recurrenceTime" type="time" defaultValue={task.recurrenceTime} className="admin-input px-2 py-1.5 text-xs" />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <input
                              name="estimatedMinutes"
                              type="number"
                              min={1}
                              defaultValue={task.estimatedMinutes}
                              className="admin-input px-2 py-1.5 text-xs"
                            />
                            <input
                              name="graceHours"
                              type="number"
                              min={1}
                              defaultValue={task.graceHours}
                              className="admin-input px-2 py-1.5 text-xs"
                            />
                            <input
                              name="minimumMinutes"
                              type="number"
                              min={0}
                              defaultValue={task.minimumMinutes}
                              className="admin-input px-2 py-1.5 text-xs"
                            />
                          </div>

                          <label className="flex items-center gap-1 rounded-lg border border-[#b7cada] px-2 py-1.5 text-xs text-[#48637a]">
                            <input type="checkbox" name="strictMode" defaultChecked={task.validationMode === "strict"} /> Strict mode
                          </label>

                          <input
                            name="dueAt"
                            type="datetime-local"
                            defaultValue={toDateTimeLocal(task.dueAt)}
                            className="admin-input w-full px-2 py-1.5 text-xs"
                          />

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

function toDateTimeLocal(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
