import { getDashboardData } from "@/lib/dashboard-data";
import { deriveTaskRag, rollupRoomRag } from "@/lib/rag";
import { RagStatus } from "@/lib/types";
import {
  createRoomAction,
  createTaskAction,
  deleteRoomAction,
  deleteTaskAction,
  updateRoomAction,
  updateTaskAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const { rooms, tasks, source } = await getDashboardData();
  const taskWithRag = tasks.map((task) => ({ task, rag: deriveTaskRag(task, now) }));
  const roomSummaries = rooms.map((room) => {
    const roomTasks = taskWithRag.filter((entry) => entry.task.roomId === room.id);
    return {
      room,
      taskCount: roomTasks.length,
      rag: rollupRoomRag(roomTasks.map((entry) => entry.rag)),
      overdue: roomTasks.filter((entry) => entry.rag === "red").length,
    };
  });

  return (
    <div className="soft-gradient min-h-screen px-4 py-6">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <header className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Household Job Jar</p>
          <h1 className="mt-2 text-3xl font-bold">Daily control panel</h1>
          <p className="mt-1 text-sm text-muted">
            Quick logging, room status, and recurring chores in one mobile-first view.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-white p-1">
            <Tab label="Today" active />
            <Tab label="Rooms" />
            <Tab label="Calendar" />
          </div>
          <p className="mt-3 text-xs text-muted">
            Data source: <span className="font-semibold">{source === "database" ? "Live DB" : "Demo fallback"}</span>
          </p>
        </header>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Today&apos;s jobs</h2>
            <span className="text-xs text-muted">{taskWithRag.length} tasks</span>
          </div>
          <div className="space-y-2">
            {taskWithRag.map(({ task, rag }) => (
              <article
                key={task.id}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-border bg-white p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    Due {formatTime(task.dueAt)} • {task.estimatedMinutes} mins
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusPill rag={rag} />
                  <button className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    {task.status === "done" ? "Logged" : "Complete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Room status</h2>
          <div className="space-y-2">
            {roomSummaries.map(({ room, rag, taskCount, overdue }) => (
              <article key={room.id} className="rounded-2xl border border-border bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{room.name}</p>
                  <StatusPill rag={rag} />
                </div>
                <p className="mt-1 text-xs text-muted">{room.designation}</p>
                <p className="mt-2 text-xs text-muted">
                  {taskCount} active tasks • {overdue} overdue
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Calendar (7-day)</h2>
            <p className="text-xs text-muted">RAG per due event</p>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>
                <p className="mb-1 text-muted">{day}</p>
                <div className="rounded-xl border border-border bg-white p-2">
                  <span className="status-pill green">G</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Manage rooms</h2>
          <form action={createRoomAction} className="mb-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add room</p>
            <input
              name="name"
              type="text"
              required
              placeholder="Room name (e.g. Kitchen)"
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <input
              name="designation"
              type="text"
              placeholder="Designation (e.g. Food + surfaces)"
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">
              Create room
            </button>
          </form>

          <div className="space-y-2">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-2xl border border-border bg-white p-3">
                <form action={updateRoomAction} className="grid grid-cols-1 gap-2">
                  <input type="hidden" name="roomId" value={room.id} />
                  <input
                    name="name"
                    type="text"
                    defaultValue={room.name}
                    required
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                  />
                  <input
                    name="designation"
                    type="text"
                    defaultValue={room.designation}
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">
                      Save
                    </button>
                    <button
                      formAction={deleteRoomAction}
                      className="rounded-xl border border-red px-3 py-2 text-sm font-semibold text-red"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Manage tasks</h2>
          <form action={createTaskAction} className="mb-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add task</p>
            <input
              name="title"
              type="text"
              required
              placeholder="Task title"
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <select name="roomId" required className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                name="estimatedMinutes"
                type="number"
                min={1}
                defaultValue={15}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              />
              <input
                name="graceHours"
                type="number"
                min={1}
                defaultValue={12}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <input name="dueAt" type="datetime-local" className="rounded-xl border border-border px-3 py-2 text-sm" />
            <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">
              Create task
            </button>
          </form>

          <div className="space-y-2">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-border bg-white p-3">
                <form action={updateTaskAction} className="grid grid-cols-1 gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <input
                    name="title"
                    type="text"
                    defaultValue={task.title}
                    required
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                  />
                  <select
                    name="roomId"
                    required
                    defaultValue={task.roomId}
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="estimatedMinutes"
                      type="number"
                      min={1}
                      defaultValue={task.estimatedMinutes}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      name="graceHours"
                      type="number"
                      min={1}
                      defaultValue={task.graceHours}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    name="dueAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(task.dueAt)}
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">
                      Save
                    </button>
                    <button
                      formAction={deleteTaskAction}
                      className="rounded-xl border border-red px-3 py-2 text-sm font-semibold text-red"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Tab({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
        active ? "bg-foreground text-background" : "bg-transparent text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({ rag }: { rag: RagStatus }) {
  return <span className={`status-pill ${rag}`}>{rag}</span>;
}

function formatTime(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function toDateTimeLocal(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
