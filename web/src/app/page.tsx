import {
  completeTaskAction,
  createQuickTaskAction,
  logoutAction,
  reopenTaskAction,
  startTaskAction,
} from "@/app/actions";
import { requireSessionUserId } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";
import { deriveTaskRag } from "@/lib/rag";
import { RagStatus, TaskItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentUserId = await requireSessionUserId("/");
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { displayName: true } });

  const now = new Date();
  const { rooms, tasks, source } = await getDashboardData();
  const taskWithRag = tasks.map((task) => ({ task, rag: deriveTaskRag(task, now) }));

  const inProgress = taskWithRag.filter((entry) => entry.task.status !== "done" && Boolean(entry.task.startedAt));
  const done = taskWithRag.filter((entry) => entry.task.status === "done");
  const todo = taskWithRag.filter((entry) => entry.task.status !== "done" && !entry.task.startedAt);

  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));
  const stars = done.length * 4;
  const completionRate = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  const myTasks = tasks.filter((task) => task.assigneeUserId === currentUserId);
  const myDone = myTasks.filter((task) => task.status === "done").length;
  const myRate = myTasks.length === 0 ? 0 : Math.round((myDone / myTasks.length) * 100);

  return (
    <div className="family-gradient min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="playful-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Household Job Jar</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Family Mission Board</h1>
              <p className="mt-1 text-sm text-muted">
                Welcome {currentUser?.displayName ?? "Family Member"}. Quick, friendly, and phone-first.
              </p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2">
            <p className="text-sm font-semibold">My jobs:</p>
            <p className="text-sm text-muted">
              {myDone}/{myTasks.length} done ({myRate}%)
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatChip label="Total" value={String(tasks.length)} />
            <StatChip label="Done" value={String(done.length)} />
            <StatChip label="Stars" value={`${stars}`} />
          </div>

          <form action={createQuickTaskAction} className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-white p-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              name="title"
              type="text"
              required
              placeholder="What job needs done right now?"
              className="rounded-xl border border-border bg-[#fdfcf8] px-3 py-2 text-sm"
            />
            <select name="roomId" className="rounded-xl border border-border bg-[#fdfcf8] px-3 py-2 text-sm">
              <option value="">Any room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <button className="action-btn primary">Add ⭐</button>
          </form>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-96">
            <Link href="/admin" className="action-btn subtle text-center">
              Open Admin Board
            </Link>
            <Link href="/tv" className="action-btn subtle text-center">
              Open TV Dashboard
            </Link>
          </div>
          <p className="mt-2 text-xs text-muted">
            Data source: {source === "database" ? "Live DB" : "Demo fallback"} • Overall progress {completionRate}%
          </p>
        </header>

        <TaskLane title="To Do" subtitle="Pick one and press Start" items={todo} laneClass="lane-todo" roomNameById={roomNameById} />
        <TaskLane
          title="In Progress"
          subtitle="Keep momentum. Tap Done when finished"
          items={inProgress}
          laneClass="lane-progress"
          roomNameById={roomNameById}
        />
        <TaskLane title="Done" subtitle="Great work. Reopen if needed" items={done} laneClass="lane-done" roomNameById={roomNameById} />
      </main>
    </div>
  );
}

function TaskLane({
  title,
  subtitle,
  items,
  laneClass,
  roomNameById,
}: {
  title: string;
  subtitle: string;
  items: Array<{ task: TaskItem; rag: RagStatus }>;
  laneClass: string;
  roomNameById: Map<string, string>;
}) {
  return (
    <section className={`lane-shell ${laneClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full border border-border bg-white px-2 py-1 text-xs font-semibold">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? <p className="rounded-2xl border border-dashed border-border bg-white/70 p-3 text-sm text-muted">Nothing here yet.</p> : null}
        {items.map(({ task, rag }) => (
          <TaskCard key={task.id} task={task} rag={rag} roomName={roomNameById.get(task.roomId) ?? "Room"} />
        ))}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  rag,
  roomName,
}: {
  task: TaskItem;
  rag: RagStatus;
  roomName: string;
}) {
  return (
    <article className="playful-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            <span className="mr-1" aria-hidden>
              {taskEmoji(task.title, roomName)}
            </span>
            {task.title}
          </p>
          <p className="mt-1 text-xs text-muted">
            {roomName}
            {task.assigneeName ? ` • Assigned ${task.assigneeName}` : " • Unassigned"} • Due {formatTime(task.dueAt)}
            {task.startedAt ? ` • Running ${elapsedLabel(task.startedAt)}` : ""}
          </p>
          {task.validationMode === "strict" ? (
            <p className="mt-1 text-xs font-semibold text-amber">Strict check: Start + note + {task.minimumMinutes} min minimum.</p>
          ) : null}
        </div>
        <span className={`status-pill ${rag}`}>{rag}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {task.status !== "done" ? (
          <>
            <form action={startTaskAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <button className="action-btn subtle">Start</button>
            </form>
            <form action={completeTaskAction} className="flex items-center gap-2">
              <input type="hidden" name="taskId" value={task.id} />
              <input name="note" type="text" placeholder="Note" className="w-24 rounded-xl border border-border bg-white px-2 py-2 text-xs" />
              <button className="action-btn primary">Done</button>
            </form>
          </>
        ) : (
          <form action={reopenTaskAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <button className="action-btn warn">Not done</button>
          </form>
        )}
      </div>
    </article>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function formatTime(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function elapsedLabel(startIso: string) {
  const start = new Date(startIso);
  const diffMin = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h ${mins}m`;
}

function taskEmoji(title: string, roomName: string) {
  const t = `${title} ${roomName}`.toLowerCase();
  if (t.includes("dog")) return "🐶";
  if (t.includes("garden") || t.includes("plant")) return "🌿";
  if (t.includes("kitchen") || t.includes("dish")) return "🍽️";
  if (t.includes("car")) return "🚗";
  if (t.includes("floor") || t.includes("hoover") || t.includes("vac")) return "🧹";
  return "⭐";
}
