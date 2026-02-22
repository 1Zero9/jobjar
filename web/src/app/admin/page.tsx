import {
  createPersonAction,
  createRoomAction,
  createTaskAction,
  deleteRoomAction,
  deleteTaskAction,
  removePersonAction,
  updateRoomAction,
  updateTaskAction,
} from "@/app/actions";
import { getAdminData } from "@/lib/admin-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { rooms, tasks, people } = await getAdminData();

  return (
    <div className="soft-gradient min-h-screen px-4 py-6">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Setup and Management</h1>
          <p className="mt-1 text-sm text-muted">
            Build rooms, add jobs by room, set recurrence, and assign to people.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-80">
            <Link href="/" className="rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-semibold">
              Daily View
            </Link>
            <Link href="/tv" className="rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-semibold">
              TV Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">People</h2>
          <form action={createPersonAction} className="mb-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3 sm:grid-cols-3">
            <input
              name="displayName"
              type="text"
              required
              placeholder="Name (e.g. Sam)"
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <input name="email" type="email" placeholder="Email (optional)" className="rounded-xl border border-border px-3 py-2 text-sm" />
            <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">Add person</button>
          </form>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="border-b border-border px-3 py-2">Name</th>
                  <th className="border-b border-border px-3 py-2">Email</th>
                  <th className="border-b border-border px-3 py-2">Role</th>
                  <th className="border-b border-border px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td className="border-b border-border px-3 py-2">{person.displayName}</td>
                    <td className="border-b border-border px-3 py-2 text-muted">{person.email}</td>
                    <td className="border-b border-border px-3 py-2 capitalize">{person.role}</td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={removePersonAction}>
                        <input type="hidden" name="userId" value={person.id} />
                        <button className="rounded-lg border border-red px-2 py-1 font-semibold text-red">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Rooms / Areas</h2>
          <form action={createRoomAction} className="mb-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3 sm:grid-cols-3">
            <input name="name" type="text" required placeholder="Room name" className="rounded-xl border border-border px-3 py-2 text-sm" />
            <input
              name="designation"
              type="text"
              placeholder="Purpose (e.g. family meals)"
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">Add room</button>
          </form>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="border-b border-border px-3 py-2">#</th>
                  <th className="border-b border-border px-3 py-2">Room</th>
                  <th className="border-b border-border px-3 py-2">Purpose</th>
                  <th className="border-b border-border px-3 py-2">Jobs</th>
                  <th className="border-b border-border px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => (
                  <tr key={room.id} className="align-top">
                    <td className="border-b border-border px-3 py-2">{index + 1}</td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={updateRoomAction} className="space-y-2">
                        <input type="hidden" name="roomId" value={room.id} />
                        <input name="name" type="text" defaultValue={room.name} className="w-full rounded-lg border border-border px-2 py-1.5" />
                        <input
                          name="designation"
                          type="text"
                          defaultValue={room.designation}
                          className="w-full rounded-lg border border-border px-2 py-1.5"
                        />
                        <button className="rounded-lg border border-border px-2 py-1 font-semibold">Save</button>
                      </form>
                    </td>
                    <td className="border-b border-border px-3 py-2 text-muted">{room.designation}</td>
                    <td className="border-b border-border px-3 py-2">{room.taskCount}</td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={deleteRoomAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <button className="rounded-lg border border-red px-2 py-1 font-semibold text-red">Archive</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Tasks</h2>
          <form action={createTaskAction} className="mb-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3 md:grid-cols-4">
            <input name="title" type="text" required placeholder="Job name" className="rounded-xl border border-border px-3 py-2 text-sm" />
            <select name="roomId" required className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Choose room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <select name="assigneeUserId" className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Assign later</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
            <select name="recurrenceType" defaultValue="weekly" className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            <input name="recurrenceInterval" type="number" min={1} defaultValue={1} className="rounded-xl border border-border px-3 py-2 text-sm" />
            <input name="recurrenceTime" type="time" defaultValue="09:00" className="rounded-xl border border-border px-3 py-2 text-sm" />
            <input name="estimatedMinutes" type="number" min={1} defaultValue={15} className="rounded-xl border border-border px-3 py-2 text-sm" />
            <input name="graceHours" type="number" min={1} defaultValue={12} className="rounded-xl border border-border px-3 py-2 text-sm" />
            <input name="dueAt" type="datetime-local" className="rounded-xl border border-border px-3 py-2 text-sm md:col-span-2" />
            <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <input type="checkbox" name="strictMode" />
              Strict proof mode
            </label>
            <input name="minimumMinutes" type="number" min={0} defaultValue={0} className="rounded-xl border border-border px-3 py-2 text-sm" />
            <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background md:col-span-4">Add task</button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="border-b border-border px-3 py-2">Task</th>
                  <th className="border-b border-border px-3 py-2">Room</th>
                  <th className="border-b border-border px-3 py-2">Assigned</th>
                  <th className="border-b border-border px-3 py-2">Frequency</th>
                  <th className="border-b border-border px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="align-top">
                    <td className="border-b border-border px-3 py-2">
                      <form action={updateTaskAction} className="space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input name="title" type="text" defaultValue={task.title} className="w-full rounded-lg border border-border px-2 py-1.5" />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            name="estimatedMinutes"
                            type="number"
                            min={1}
                            defaultValue={task.estimatedMinutes}
                            className="rounded-lg border border-border px-2 py-1.5"
                          />
                          <input
                            name="graceHours"
                            type="number"
                            min={1}
                            defaultValue={task.graceHours}
                            className="rounded-lg border border-border px-2 py-1.5"
                          />
                        </div>
                        <label className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                          <input type="checkbox" name="strictMode" defaultChecked={task.validationMode === "strict"} />
                          Strict
                        </label>
                        <input
                          name="minimumMinutes"
                          type="number"
                          min={0}
                          defaultValue={task.minimumMinutes}
                          className="w-full rounded-lg border border-border px-2 py-1.5"
                        />
                        <input
                          name="dueAt"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(task.dueAt)}
                          className="w-full rounded-lg border border-border px-2 py-1.5"
                        />
                        <button className="rounded-lg bg-foreground px-2 py-1 font-semibold text-background">Save</button>
                      </form>
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={updateTaskAction} className="space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="title" value={task.title} />
                        <input type="hidden" name="estimatedMinutes" value={task.estimatedMinutes} />
                        <input type="hidden" name="graceHours" value={task.graceHours} />
                        <input type="hidden" name="minimumMinutes" value={task.minimumMinutes} />
                        <input type="hidden" name="dueAt" value={task.dueAt} />
                        <select name="roomId" defaultValue={task.roomId} className="w-full rounded-lg border border-border px-2 py-1.5">
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-lg border border-border px-2 py-1 font-semibold">Save</button>
                      </form>
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={updateTaskAction} className="space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="title" value={task.title} />
                        <input type="hidden" name="roomId" value={task.roomId} />
                        <input type="hidden" name="estimatedMinutes" value={task.estimatedMinutes} />
                        <input type="hidden" name="graceHours" value={task.graceHours} />
                        <input type="hidden" name="minimumMinutes" value={task.minimumMinutes} />
                        <input type="hidden" name="dueAt" value={task.dueAt} />
                        <select name="assigneeUserId" defaultValue={task.assigneeUserId} className="w-full rounded-lg border border-border px-2 py-1.5">
                          <option value="">Unassigned</option>
                          {people.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.displayName}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-lg border border-border px-2 py-1 font-semibold">Save</button>
                      </form>
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={updateTaskAction} className="space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="title" value={task.title} />
                        <input type="hidden" name="roomId" value={task.roomId} />
                        <input type="hidden" name="estimatedMinutes" value={task.estimatedMinutes} />
                        <input type="hidden" name="graceHours" value={task.graceHours} />
                        <input type="hidden" name="minimumMinutes" value={task.minimumMinutes} />
                        <input type="hidden" name="dueAt" value={task.dueAt} />
                        <select
                          name="recurrenceType"
                          defaultValue={task.recurrenceType}
                          className="w-full rounded-lg border border-border px-2 py-1.5"
                        >
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
                          className="w-full rounded-lg border border-border px-2 py-1.5"
                        />
                        <input
                          name="recurrenceTime"
                          type="time"
                          defaultValue={task.recurrenceTime}
                          className="w-full rounded-lg border border-border px-2 py-1.5"
                        />
                        <button className="rounded-lg border border-border px-2 py-1 font-semibold">Save</button>
                      </form>
                    </td>
                    <td className="border-b border-border px-3 py-2">
                      <form action={deleteTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button className="rounded-lg border border-red px-2 py-1 font-semibold text-red">Archive</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
