import {
  completeTaskAction,
  createQuickTaskAction,
  reopenTaskAction,
  startTaskAction,
} from "@/app/actions";
import { getDashboardData } from "@/lib/dashboard-data";
import { deriveTaskRag } from "@/lib/rag";
import { RagStatus, TaskItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const { rooms, tasks, source } = await getDashboardData();
  const taskWithRag = tasks.map((task) => ({ task, rag: deriveTaskRag(task, now) }));

  const inProgress = taskWithRag.filter((entry) => entry.task.status !== "done" && Boolean(entry.task.startedAt));
  const done = taskWithRag.filter((entry) => entry.task.status === "done");
  const todo = taskWithRag.filter((entry) => entry.task.status !== "done" && !entry.task.startedAt);

  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));

  return (
    <div className="soft-gradient min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Household Job Jar</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Today Board</h1>
          <p className="mt-1 text-sm text-muted">ADO-style flow: add quickly, then move jobs through To Do, In Progress, Done.</p>

          <form action={createQuickTaskAction} className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              name="title"
              type="text"
              required
              placeholder="Quick add: what needs done?"
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
            <select name="roomId" className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Any room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">Add</button>
          </form>

          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Details (frequency, assignment, validation) can be set later in Admin.</span>
            <span>{source === "database" ? "Live DB" : "Demo"}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-80">
            <Link href="/admin" className="rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-semibold">
              Open Admin
            </Link>
            <Link href="/tv" className="rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-semibold">
              Open TV View
            </Link>
          </div>
        </header>

        <TaskColumn title="To Do" hint="Ready to start" items={todo} roomNameById={roomNameById} />
        <TaskColumn title="In Progress" hint="Started, not finished" items={inProgress} roomNameById={roomNameById} />
        <TaskColumn title="Done" hint="Completed" items={done} roomNameById={roomNameById} />
      </main>
    </div>
  );
}

function TaskColumn({
  title,
  hint,
  items,
  roomNameById,
}: {
  title: string;
  hint: string;
  items: Array<{ task: TaskItem; rag: RagStatus }>;
  roomNameById: Map<string, string>;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <span className="rounded-full border border-border bg-white px-2 py-1 text-xs font-semibold">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted">No jobs here.</p> : null}
        {items.map(({ task, rag }) => (
          <article key={task.id} className="rounded-2xl border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {roomNameById.get(task.roomId) ?? "Room"} • Due {formatTime(task.dueAt)}
                </p>
                {task.validationMode === "strict" ? (
                  <p className="mt-1 text-xs font-semibold text-amber">Strict: Start + note + {task.minimumMinutes} min minimum.</p>
                ) : null}
              </div>
              <span className={`status-pill ${rag}`}>{rag}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {task.status !== "done" ? (
                <>
                  <form action={startTaskAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Start</button>
                  </form>
                  <form action={completeTaskAction} className="flex items-center gap-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input
                      name="note"
                      type="text"
                      placeholder="Note"
                      className="w-28 rounded-xl border border-border px-2 py-2 text-xs"
                    />
                    <button className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background">Done</button>
                  </form>
                </>
              ) : (
                <form action={reopenTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="rounded-xl border border-red px-3 py-2 text-sm font-semibold text-red">Not done</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatTime(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateIso));
}
