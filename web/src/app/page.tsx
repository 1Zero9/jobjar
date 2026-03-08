import {
  completeTaskAction,
  createQuickTaskAction,
  logoutAction,
  reopenTaskAction,
  startTaskAction,
} from "@/app/actions";
import { requireSessionContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";
import { TaskItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

type TaskWithRoom = {
  task: TaskItem;
  roomName: string;
  isMine: boolean;
};

export default async function Home() {
  const { userId: currentUserId, householdId } = await requireSessionContext("/");
  const [currentUser, { rooms, tasks }] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUserId }, select: { displayName: true } }),
    getDashboardData({ householdId }),
  ]);

  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));
  const entries: TaskWithRoom[] = tasks.map((task) => ({
    task,
    roomName: roomNameById.get(task.roomId) ?? "General",
    isMine: task.assigneeUserId === currentUserId,
  }));

  const openTasks = entries.filter((entry) => entry.task.status !== "done");
  const doneTasks = entries
    .filter((entry) => entry.task.status === "done")
    .sort((a, b) => {
      const aTime = a.task.lastCompletedAt ? new Date(a.task.lastCompletedAt).getTime() : 0;
      const bTime = b.task.lastCompletedAt ? new Date(b.task.lastCompletedAt).getTime() : 0;
      return bTime - aTime;
    });

  const todayTasks = openTasks.filter((entry) => isDueToday(entry.task.dueAt));
  const myTasks = openTasks.filter((entry) => entry.isMine);
  const upcomingTasks = openTasks
    .filter((entry) => !isDueToday(entry.task.dueAt))
    .sort((a, b) => compareByDueDate(a.task, b.task));

  const completedToday = doneTasks.filter((entry) => isSameDayToday(entry.task.lastCompletedAt)).length;

  return (
    <div className="task-shell min-h-screen px-4 py-5 sm:px-5 sm:py-6">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="task-hero">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="task-kicker">Task Jar</p>
              <h1 className="task-title">Simple household tasks, one screen.</h1>
              <p className="task-copy">
                Capture work fast, see what matters today, and mark it done without the extra workflow overhead.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings" className="action-btn subtle">
                Settings
              </Link>
              <form action={logoutAction}>
                <button className="action-btn warn">Log out</button>
              </form>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
            <section className="task-capture-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="task-section-label">Quick Add</p>
                  <h2 className="text-2xl font-semibold text-[#15263c]">Add a task</h2>
                </div>
                <span className="task-badge">{openTasks.length} open</span>
              </div>

              <form action={createQuickTaskAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Book car service"
                  className="task-text-input"
                />
                <button className="action-btn bright px-4">Add</button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#596c85]">
                <span className="task-chip">Examples</span>
                <span className="task-chip">Change bed sheets</span>
                <span className="task-chip">Fix kitchen light</span>
                <span className="task-chip">Order school supplies</span>
              </div>
            </section>

            <aside className="task-summary-panel">
              <p className="task-section-label">Overview</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricCard label="Today" value={String(todayTasks.length)} />
                <MetricCard label="Mine" value={String(myTasks.length)} />
                <MetricCard label="Open" value={String(openTasks.length)} />
                <MetricCard label="Done today" value={String(completedToday)} />
              </div>
              <div className="mt-3 rounded-[1.1rem] border border-[#d4e0f2] bg-[#eef5ff] px-3 py-3">
                <p className="text-sm font-semibold text-[#14253a]">{currentUser?.displayName ?? "You"}</p>
                <p className="mt-1 text-sm text-[#5b6e86]">
                  {myTasks.length === 0 ? "Nothing assigned to you right now." : `${myTasks.length} active tasks assigned to you.`}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
          <TaskColumn
            title="Today"
            subtitle="Tasks due today or overdue."
            count={todayTasks.length}
            emptyText="Nothing due today."
            entries={todayTasks}
          />
          <TaskColumn
            title="Upcoming"
            subtitle="Everything else that is still open."
            count={upcomingTasks.length}
            emptyText="No upcoming tasks."
            entries={upcomingTasks}
          />
          <DoneColumn entries={doneTasks.slice(0, 8)} />
        </section>
      </main>
    </div>
  );
}

function TaskColumn({
  title,
  subtitle,
  count,
  emptyText,
  entries,
}: {
  title: string;
  subtitle: string;
  count: number;
  emptyText: string;
  entries: TaskWithRoom[];
}) {
  return (
    <article className="task-column">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="task-section-label">{title}</p>
          <h2 className="text-xl font-semibold text-[#15263c]">{title}</h2>
          <p className="mt-1 text-sm text-[#5b6e86]">{subtitle}</p>
        </div>
        <span className="task-count-pill">{count}</span>
      </div>

      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          entries.map((entry) => <TaskCard key={entry.task.id} entry={entry} />)
        )}
      </div>
    </article>
  );
}

function DoneColumn({ entries }: { entries: TaskWithRoom[] }) {
  return (
    <article className="task-column task-column-done">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="task-section-label">Done</p>
          <h2 className="text-xl font-semibold text-[#15263c]">Recently finished</h2>
          <p className="mt-1 text-sm text-[#5b6e86]">Completed tasks stay visible here for a short while.</p>
        </div>
        <span className="task-count-pill">{entries.length}</span>
      </div>

      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <EmptyState text="No completed tasks yet." />
        ) : (
          entries.map((entry) => (
            <article key={entry.task.id} className="task-card task-card-done">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#163526]">{entry.task.title}</p>
                  <p className="mt-1 text-xs text-[#4f6f5b]">
                    {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"}
                  </p>
                </div>
                <span className="task-status-pill task-status-pill-done">Done</span>
              </div>
              <form action={reopenTaskAction} className="mt-3">
                <input type="hidden" name="taskId" value={entry.task.id} />
                <button className="action-btn subtle w-full">Reopen</button>
              </form>
            </article>
          ))
        )}
      </div>
    </article>
  );
}

function TaskCard({ entry }: { entry: TaskWithRoom }) {
  const dueLabel = describeDue(entry.task.dueAt, entry.task.status);
  const statusTone = dueTone(entry.task.dueAt, entry.task.status);

  return (
    <article className={`task-card ${statusTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#15263c]">{entry.task.title}</p>
          <p className="mt-1 text-sm text-[#5b6e86]">
            {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"}
          </p>
        </div>
        <span className={`task-status-pill ${statusTone}`}>{dueLabel}</span>
      </div>

      {entry.task.detailNotes ? <p className="mt-3 text-sm text-[#435872]">{entry.task.detailNotes}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5b6e86]">
        {entry.isMine ? <span className="task-chip">Assigned to me</span> : null}
        {entry.task.locationDetails ? <span className="task-chip">{entry.task.locationDetails}</span> : null}
        {entry.task.startedAt ? <span className="task-chip">Started {elapsedLabel(entry.task.startedAt)} ago</span> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!entry.task.startedAt ? (
          <form action={startTaskAction}>
            <input type="hidden" name="taskId" value={entry.task.id} />
            <button className="action-btn subtle">Start</button>
          </form>
        ) : null}
        <form action={completeTaskAction} className="flex min-w-0 flex-1 items-center gap-2">
          <input type="hidden" name="taskId" value={entry.task.id} />
          <input name="note" type="text" placeholder="Optional note" className="task-note-input" />
          <button className="action-btn bright">Done</button>
        </form>
      </div>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="task-metric-card">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#5b6e86]">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none text-[#15263c]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="task-empty-state">{text}</p>;
}

function compareByDueDate(a: TaskItem, b: TaskItem) {
  const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

function isDueToday(dueIso: string | null) {
  if (!dueIso) {
    return false;
  }
  const due = new Date(dueIso);
  const current = new Date();
  return (
    due.getFullYear() === current.getFullYear() &&
    due.getMonth() === current.getMonth() &&
    due.getDate() === current.getDate()
  ) || due.getTime() < current.getTime();
}

function isSameDayToday(iso: string | undefined) {
  if (!iso) {
    return false;
  }
  const value = new Date(iso);
  const current = new Date();
  return (
    value.getFullYear() === current.getFullYear() &&
    value.getMonth() === current.getMonth() &&
    value.getDate() === current.getDate()
  );
}

function dueTone(dueIso: string | null, status: TaskItem["status"]) {
  if (status === "done") {
    return "done";
  }
  if (!dueIso) {
    return "calm";
  }
  const dueTime = new Date(dueIso).getTime();
  if (Number.isNaN(dueTime)) {
    return "calm";
  }
  const diff = dueTime - Date.now();
  if (diff < 0) {
    return "late";
  }
  if (diff < 1000 * 60 * 60 * 24) {
    return "soon";
  }
  return "calm";
}

function describeDue(dueIso: string | null, status: TaskItem["status"]) {
  if (status === "done") {
    return "Done";
  }
  if (!dueIso) {
    return "No date";
  }

  const due = new Date(dueIso);
  const diffMinutes = Math.round((due.getTime() - Date.now()) / 60000);
  if (diffMinutes < 0) {
    const overdueMinutes = Math.abs(diffMinutes);
    if (overdueMinutes < 60) {
      return `Overdue ${overdueMinutes}m`;
    }
    const overdueHours = Math.floor(overdueMinutes / 60);
    if (overdueHours < 24) {
      return `Overdue ${overdueHours}h`;
    }
    return "Overdue";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
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
