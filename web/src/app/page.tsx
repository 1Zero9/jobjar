import { completeTaskAction, reopenTaskAction, startTaskAction } from "@/app/actions";
import { getDashboardData } from "@/lib/dashboard-data";
import { deriveTaskRag, rollupRoomRag } from "@/lib/rag";
import { RagStatus } from "@/lib/types";
import Link from "next/link";

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
          <p className="mt-1 text-sm text-muted">Simple check-in screen. Setup and assignments are in Admin.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/admin" className="rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-semibold">
              Open Admin
            </Link>
            <Link href="/tv" className="rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-semibold">
              Open TV View
            </Link>
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
              <article key={task.id} className="rounded-2xl border border-border bg-white p-3">
                <div>
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    Due {formatTime(task.dueAt)} • {task.estimatedMinutes} mins
                  </p>
                  {task.validationMode === "strict" ? (
                    <p className="mt-1 text-xs font-semibold text-amber">
                      Strict check: press Start first, add note, minimum {task.minimumMinutes} mins.
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusPill rag={rag} />
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <form action={startTaskAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Start</button>
                    </form>
                    {task.status === "done" ? (
                      <form action={reopenTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button className="rounded-full border border-red px-3 py-1 text-xs font-semibold text-red">
                          Not done
                        </button>
                      </form>
                    ) : (
                      <form action={completeTaskAction} className="flex items-center gap-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input
                          name="note"
                          type="text"
                          placeholder="Quick note"
                          className="w-32 rounded-full border border-border px-3 py-1 text-xs"
                        />
                        <button className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                          Done
                        </button>
                      </form>
                    )}
                  </div>
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
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl ${roomAuraClass(rag)}`}>
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
