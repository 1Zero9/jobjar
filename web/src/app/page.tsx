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
import { deriveTaskRag } from "@/lib/rag";
import { RagStatus, TaskItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId: currentUserId, householdId } = await requireSessionContext("/");
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { displayName: true } });

  const now = new Date();
  const { rooms, tasks, source } = await getDashboardData({ householdId });
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
    <div className="workday-gradient min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="board-shell p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#526071]">Household Job Jar</p>
              <h1 className="mt-1 text-2xl font-bold text-[#111f33] sm:text-3xl">Today Board</h1>
              <p className="mt-1 text-sm text-[#5e6e80]">Welcome {currentUser?.displayName ?? "Family Member"}. Bright, fast, and easy to use.</p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#d7e3f4] bg-[#eef4ff] px-3 py-2">
            <p className="text-sm font-semibold">My jobs:</p>
            <p className="text-sm text-[#5e6e80]">
              {myDone}/{myTasks.length} done ({myRate}%)
            </p>
            <span className="ml-auto rounded-full bg-[#e9f1ff] px-2 py-1 text-xs font-semibold text-[#3366d6]">Progress {completionRate}%</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip label="Total" value={String(tasks.length)} />
            <StatChip label="Done" value={String(done.length)} />
            <StatChip label="Stars" value={`${stars}`} />
            <StatChip label="In progress" value={String(inProgress.length)} />
          </div>

          <form action={createQuickTaskAction} className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-[#d7e3f4] bg-[#f3f8ff] p-3 sm:grid-cols-[1fr_auto]">
            <input
              name="title"
              type="text"
              required
              placeholder="Capture a job fast..."
              className="rounded-xl border border-[#d7e3f4] bg-[#f8fbff] px-3 py-2 text-sm"
            />
            <button className="action-btn bright">Add task</button>
          </form>
          <p className="mt-2 text-xs text-[#5e6e80]">Quick captures go to Inbox with no due date. Triage room and schedule later.</p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:w-[28rem]">
            <Link href="/admin" className="action-btn subtle text-center">
              Open Admin Board
            </Link>
            <Link href="/tv" className="action-btn subtle text-center">
              Open TV Dashboard
            </Link>
          </div>
          <p className="mt-2 text-xs text-[#5e6e80]">
            Data source: {source === "database" ? "Live DB" : "Demo fallback"} • Overall progress {completionRate}%
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <TaskSection title="To Do" subtitle="Ready to start" items={todo} laneClass="lane-kanban-todo" roomNameById={roomNameById} />
          <TaskSection
            title="In Progress"
            subtitle="Started, not finished"
            items={inProgress}
            laneClass="lane-kanban-progress"
            roomNameById={roomNameById}
          />
          <TaskSection title="Done" subtitle="Completed items" items={done} laneClass="lane-kanban-done" roomNameById={roomNameById} />
        </section>
      </main>
    </div>
  );
}

function TaskSection({
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
    <section className={`board-shell kanban-lane p-4 ${laneClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#17263a]">{title}</h2>
          <p className="text-xs text-[#5e6e80]">{subtitle}</p>
        </div>
        <span className="rounded-full border border-[#d7e3f4] bg-[#eef4ff] px-2 py-1 text-xs font-semibold">{items.length}</span>
      </div>

      {items.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d7e3f4] bg-[#f3f8ff] p-3 text-sm text-[#5e6e80]">Nothing here yet.</p> : null}

      <div className="space-y-2">
        {items.map(({ task, rag }) => (
          <TaskBoardCard key={task.id} task={task} rag={rag} roomName={roomNameById.get(task.roomId) ?? "Room"} />
        ))}
      </div>
    </section>
  );
}

function TaskBoardCard({
  task,
  rag,
  roomName,
}: {
  task: TaskItem;
  rag: RagStatus;
  roomName: string;
}) {
  const dueText = dueBadge(task.dueAt, task.status);
  return (
    <article className={`task-mobile-card board-task ${rag}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#17263a]">
            <span className="mr-1" aria-hidden>
              {taskEmoji(task.title, roomName)}
            </span>
            {task.title}
          </p>
          <p className="mt-1 text-xs text-[#5e6e80]">
            {roomName} • {task.assigneeName ?? "Unassigned"} • {formatDueLabel(task.dueAt)}
          </p>
          {task.validationMode === "strict" ? <p className="mt-1 text-[11px] font-semibold text-[#d67b00]">Strict check enabled</p> : null}
        </div>
        <span className={`status-pill ${rag}`}>{rag}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-[#edf3ff] px-2 py-1 text-xs font-semibold text-[#3566d0]">{dueText}</span>
        {task.startedAt ? <span className="text-xs text-[#5e6e80]">Running {elapsedLabel(task.startedAt)}</span> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {task.status !== "done" ? (
          <>
            <form action={startTaskAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <button className="action-btn subtle">Start</button>
            </form>
            <form action={completeTaskAction} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="taskId" value={task.id} />
              <input name="note" type="text" placeholder="Note" className="min-w-0 flex-1 rounded-xl border border-[#d7e3f4] bg-[#f8fbff] px-2 py-2 text-xs" />
              <button className="action-btn bright">Done</button>
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
    <div className="rounded-xl border border-[#d7e3f4] bg-[#eef4ff] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#5e6e80]">{label}</p>
      <p className="text-lg font-bold leading-none text-[#17263a]">{value}</p>
    </div>
  );
}

function formatDueLabel(dateIso: string | null) {
  if (!dateIso) {
    return "No due date";
  }

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

function dueBadge(dueIso: string | null, status: TaskItem["status"]) {
  if (status === "done") {
    return "done";
  }
  if (!dueIso) {
    return "no due";
  }
  const due = new Date(dueIso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((due - now) / 60000);
  if (diffMin <= 0) {
    return "overdue";
  }
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
