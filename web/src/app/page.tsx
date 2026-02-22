import {
  createRoomAction,
  createTaskAction,
  deleteRoomAction,
  deleteTaskAction,
  updateRoomAction,
  updateTaskAction,
} from "@/app/actions";
import { getDashboardData } from "@/lib/dashboard-data";
import { deriveTaskRag, rollupRoomRag } from "@/lib/rag";
import { RagStatus } from "@/lib/types";

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
          <h1 className="mt-2 text-3xl font-bold">Daily Jobs</h1>
          <p className="mt-1 text-sm text-muted">
            Built for everyone in the house. Tap tasks in daily mode, manage setup in admin mode.
          </p>
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
                  <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    {task.status === "done" ? "Logged" : "Open"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Room status</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {roomSummaries.map(({ room, rag, taskCount, overdue }) => (
              <article key={room.id} className="rounded-2xl border border-border bg-white p-3 text-center">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl ${roomAuraClass(
                    rag,
                  )}`}
                >
                  <span aria-hidden>{roomEmoji(room.name)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{room.name}</p>
                <p className="mt-1 text-xs text-muted">{room.designation}</p>
                <p className="mt-2 text-xs text-muted">
                  {taskCount} active tasks • {overdue} overdue
                </p>
                <div className="mt-2">
                  <StatusPill rag={rag} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <details className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <summary className="cursor-pointer list-none text-base font-semibold">Setup & Admin</summary>
          <p className="mt-2 text-xs text-muted">
            Use this section to create and edit rooms/tasks. Delete actions archive items from daily view.
          </p>

          <section className="mt-3 rounded-2xl border border-border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold">Add room</h3>
            <form action={createRoomAction} className="grid grid-cols-1 gap-2">
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
          </section>

          <section className="mt-3 rounded-2xl border border-border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold">Edit rooms</h3>
            <div className="space-y-2">
              {rooms.map((room) => (
                <article key={room.id} className="rounded-xl border border-border p-3">
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
                    <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">
                      Save room
                    </button>
                  </form>
                  <form action={deleteRoomAction} className="mt-2">
                    <input type="hidden" name="roomId" value={room.id} />
                    <button className="w-full rounded-xl border border-red px-3 py-2 text-sm font-semibold text-red">
                      Archive room
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-3 rounded-2xl border border-border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold">Add task</h3>
            <form action={createTaskAction} className="grid grid-cols-1 gap-2">
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
          </section>

          <section className="mt-3 rounded-2xl border border-border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold">Edit tasks</h3>
            <div className="space-y-2">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-border p-3">
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
                    <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">
                      Save task
                    </button>
                  </form>
                  <form action={deleteTaskAction} className="mt-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <button className="w-full rounded-xl border border-red px-3 py-2 text-sm font-semibold text-red">
                      Archive task
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        </details>
      </main>
    </div>
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

function roomAuraClass(rag: RagStatus) {
  if (rag === "green") {
    return "border-green bg-green/10 shadow-[0_0_18px_rgba(47,143,81,0.35)]";
  }
  if (rag === "amber") {
    return "border-amber bg-amber/10 shadow-[0_0_18px_rgba(198,122,6,0.35)]";
  }
  return "border-red bg-red/10 shadow-[0_0_18px_rgba(192,50,33,0.35)]";
}

function roomEmoji(roomName: string) {
  const key = roomName.toLowerCase();
  if (key.includes("kitchen")) {
    return "🍽️";
  }
  if (key.includes("living")) {
    return "🛋️";
  }
  if (key.includes("garden")) {
    return "🌿";
  }
  if (key.includes("bath")) {
    return "🛁";
  }
  if (key.includes("bed")) {
    return "🛏️";
  }
  return "🏠";
}
