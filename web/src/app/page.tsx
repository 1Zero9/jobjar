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
    <div className="task-shell min-h-screen px-4 py-4 sm:px-5 sm:py-5">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="task-topbar">
          <div>
            <p className="task-kicker">Task Jar</p>
            <h1 className="task-app-title">Household tasks</h1>
            <p className="task-app-subtitle">{currentUser?.displayName ?? "You"} • {openTasks.length} open tasks</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings" className="action-btn subtle">
              Settings
            </Link>
            <form action={logoutAction}>
              <button className="action-btn subtle">Log out</button>
            </form>
          </div>
        </header>

        <section className="task-toolbar">
          <form action={createQuickTaskAction} className="task-toolbar-form">
            <input
              name="title"
              type="text"
              required
              placeholder="Add a task"
              className="task-text-input"
            />
            <button className="action-btn bright">Add</button>
          </form>

          <div className="task-metric-strip">
            <MetricPill label="Today" value={todayTasks.length} />
            <MetricPill label="Mine" value={myTasks.length} />
            <MetricPill label="Open" value={openTasks.length} />
            <MetricPill label="Done today" value={completedToday} />
          </div>
        </section>

        <TaskSection
          title="Today"
          count={todayTasks.length}
          emptyText="Nothing due today."
          entries={todayTasks}
        />

        <TaskSection
          title="Upcoming"
          count={upcomingTasks.length}
          emptyText="No upcoming tasks."
          entries={upcomingTasks}
        />

        <DoneSection entries={doneTasks.slice(0, 8)} />
      </main>
    </div>
  );
}

function TaskSection({
  title,
  count,
  emptyText,
  entries,
}: {
  title: string;
  count: number;
  emptyText: string;
  entries: TaskWithRoom[];
}) {
  return (
    <section className="task-section">
      <div className="task-section-header">
        <div>
          <p className="task-section-label">{title}</p>
          <h2 className="task-section-title">{title}</h2>
        </div>
        <span className="task-count-pill">{count}</span>
      </div>

      <div className="mt-3 space-y-3">
        {entries.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          entries.map((entry) => <TaskCard key={entry.task.id} entry={entry} />)
        )}
      </div>
    </section>
  );
}

function DoneSection({ entries }: { entries: TaskWithRoom[] }) {
  return (
    <section className="task-section">
      <div className="task-section-header">
        <div>
          <p className="task-section-label">Done</p>
          <h2 className="task-section-title">Done</h2>
        </div>
        <span className="task-count-pill">{entries.length}</span>
      </div>

      <div className="mt-3 space-y-3">
        {entries.length === 0 ? (
          <EmptyState text="No completed tasks yet." />
        ) : (
          entries.map((entry) => (
            <article key={entry.task.id} className="task-card task-card-done">
              <div className="task-card-head">
                <div>
                  <p className="task-card-title">{entry.task.title}</p>
                  <p className="task-card-meta">
                    {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"}
                  </p>
                </div>
                <span className="task-status-pill task-status-pill-done">Done</span>
              </div>
              <form action={reopenTaskAction} className="mt-3">
                <input type="hidden" name="taskId" value={entry.task.id} />
                <button className="action-btn subtle">Reopen</button>
              </form>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function TaskCard({ entry }: { entry: TaskWithRoom }) {
  const dueLabel = describeDue(entry.task.dueAt, entry.task.status);
  const statusTone = dueTone(entry.task.dueAt, entry.task.status);

  return (
    <article className={`task-card ${statusTone}`}>
      <div className="task-card-head">
        <div>
          <p className="task-card-title">{entry.task.title}</p>
          <p className="task-card-meta">
            {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"}
          </p>
        </div>
        <span className={`task-status-pill ${statusTone}`}>{dueLabel}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {entry.isMine ? <span className="task-chip">Mine</span> : null}
        {entry.task.locationDetails ? <span className="task-chip">{entry.task.locationDetails}</span> : null}
        {entry.task.startedAt ? <span className="task-chip">Started {elapsedLabel(entry.task.startedAt)} ago</span> : null}
      </div>

      <div className="task-actions-row">
        {!entry.task.startedAt ? (
          <form action={startTaskAction}>
            <input type="hidden" name="taskId" value={entry.task.id} />
            <button className="action-btn subtle">Start</button>
          </form>
        ) : null}
        <form action={completeTaskAction} className="task-complete-form">
          <input type="hidden" name="taskId" value={entry.task.id} />
          <input name="note" type="text" placeholder="Optional note" className="task-note-input" />
          <button className="action-btn bright">Done</button>
        </form>
      </div>
    </article>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="task-metric-pill">
      <span>{label}</span>
      <strong>{value}</strong>
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
