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
import { JobKind, RagStatus, TaskItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

type BoardEntry = {
  task: TaskItem;
  rag: RagStatus;
  roomName: string;
  kind: JobKind;
  isInbox: boolean;
};

export default async function Home() {
  const { userId: currentUserId, householdId } = await requireSessionContext("/");
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { displayName: true } });

  const now = new Date();
  const { rooms, tasks, source } = await getDashboardData({ householdId });
  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));
  const entries = tasks.map((task) => {
    const roomName = roomNameById.get(task.roomId) ?? "Inbox";
    return {
      task,
      rag: deriveTaskRag(task, now),
      roomName,
      kind: task.jobKind,
      isInbox: roomName.toLowerCase() === "inbox",
    } satisfies BoardEntry;
  });

  const freshCaptures = entries.filter((entry) => entry.task.captureStage === "captured" && entry.task.status !== "done");
  const movingNow = entries.filter((entry) => entry.task.captureStage === "active" && entry.task.status !== "done");
  const projects = entries.filter((entry) => entry.task.status !== "done" && !entry.isInbox && isProjectLike(entry));
  const readyToShape = entries.filter(
    (entry) => entry.task.status !== "done" && entry.task.captureStage === "shaped" && !movingNow.includes(entry) && !projects.includes(entry),
  );
  const done = entries.filter((entry) => entry.task.status === "done" || entry.task.captureStage === "done");

  const myEntries = entries.filter((entry) => entry.task.assigneeUserId === currentUserId);
  const myDone = myEntries.filter((entry) => entry.task.status === "done").length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  return (
    <div className="workday-gradient min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="board-shell capture-hero p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526071]">Household Job Jar</p>
              <h1 className="mt-1 text-3xl font-bold text-[#13233c] sm:text-4xl">Catch it fast.</h1>
              <p className="mt-2 text-sm text-[#52657d] sm:text-base">See a job? Type it here. Sort it out later.</p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="capture-panel rounded-[1.4rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Quick Capture</p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#13233c]">Add a job</h2>
                </div>
                <span className="rounded-full bg-[#fff4cf] px-3 py-1 text-xs font-semibold text-[#7a5900]">{freshCaptures.length} waiting in inbox</span>
              </div>

              <form action={createQuickTaskAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Tyre pressure warning on Aoife's car"
                  className="rounded-2xl border border-[#d7e3f4] bg-[#fbfdff] px-4 py-3 text-sm text-[#162840]"
                />
                <button className="action-btn bright px-4">Capture Job</button>
              </form>

              <p className="mt-3 text-sm text-[#5e6e80]">Examples: hoover stairs, tyre warning, garden job, attic clear-out.</p>
            </section>

            <section className="rounded-[1.4rem] border border-[#d7e3f4] bg-[#f7fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Today</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatChip label="Inbox" value={String(freshCaptures.length + readyToShape.length)} />
                <StatChip label="Do now" value={String(movingNow.length)} />
                <StatChip label="Big jobs" value={String(projects.length)} />
                <StatChip label="Done" value={String(done.length)} />
              </div>

              <div className="mt-3 rounded-2xl border border-[#cfe1f7] bg-[#eef5ff] px-3 py-3">
                <p className="text-sm font-semibold text-[#17263a]">{currentUser?.displayName ?? "You"}: {myDone}/{myEntries.length} done</p>
                <p className="mt-1 text-xs text-[#5e6e80]">Whole house: {completionRate}% complete</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/admin" className="action-btn subtle text-center">
                  Admin
                </Link>
                <Link href="/tv" className="action-btn subtle text-center">
                  TV
                </Link>
              </div>
              <p className="mt-2 text-xs text-[#5e6e80]">{source === "database" ? "Live household data" : "Demo fallback"}</p>
            </section>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Inbox</p>
                <h2 className="text-xl font-semibold text-[#13233c]">New jobs</h2>
                <p className="text-sm text-[#5e6e80]">Captured jobs waiting to be sorted.</p>
              </div>
              <span className="queue-count">{freshCaptures.length + readyToShape.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {freshCaptures.length + readyToShape.length === 0 ? (
                <EmptyState text="Inbox is clear." />
              ) : (
                [...freshCaptures, ...readyToShape].map((entry) =>
                  entry.task.captureStage === "captured" ? <CaptureCard key={entry.task.id} entry={entry} /> : <ShapeCard key={entry.task.id} entry={entry} />,
                )
              )}
            </div>
          </article>

          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Do Now</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Active jobs</h2>
                <p className="text-sm text-[#5e6e80]">Jobs already moving.</p>
              </div>
              <span className="queue-count">{movingNow.length}</span>
            </div>
            <div className="mt-3 grid gap-3">
              {movingNow.length === 0 ? <EmptyState text="Nothing active right now." /> : movingNow.map((entry) => <ActionCard key={entry.task.id} entry={entry} />)}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Big Jobs</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Projects</h2>
                <p className="text-sm text-[#5e6e80]">Large jobs to break into smaller steps.</p>
              </div>
              <span className="queue-count">{projects.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {projects.length === 0 ? <EmptyState text="No big jobs yet." /> : projects.map((entry) => <ProjectCard key={entry.task.id} entry={entry} />)}
            </div>
          </article>

          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Done</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Finished</h2>
                <p className="text-sm text-[#5e6e80]">Recently completed jobs.</p>
              </div>
              <span className="queue-count">{done.length}</span>
            </div>
            <div className="mt-3 grid gap-3">
              {done.length === 0 ? <EmptyState text="Nothing finished yet." /> : done.slice(0, 4).map((entry) => <DoneCard key={entry.task.id} entry={entry} />)}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function CaptureCard({ entry }: { entry: BoardEntry }) {
  return (
    <article className="capture-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#13233c]">{entry.task.title}</p>
          <p className="mt-1 text-sm text-[#5e6e80]">{entry.roomName} • {kindLabel(entry.kind)}</p>
        </div>
        <span className="kind-pill">{kindLabel(entry.kind)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={startTaskAction}>
          <input type="hidden" name="taskId" value={entry.task.id} />
          <button className="action-btn subtle">Start</button>
        </form>
        <Link href="/admin#step-tasks" className="action-btn bright text-center">
          Plan in Admin
        </Link>
      </div>
    </article>
  );
}

function ShapeCard({ entry }: { entry: BoardEntry }) {
  return (
    <article className="shape-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#13233c]">{entry.task.title}</p>
          <p className="mt-1 text-xs text-[#5e6e80]">{entry.roomName} • {entry.task.assigneeName ?? "Unassigned"}</p>
        </div>
        <span className={`status-pill ${entry.rag}`}>{entry.rag}</span>
      </div>
      <p className="mt-2 text-sm text-[#45596f]">Needs a person, a place, or a date.</p>
      {entry.task.locationDetails ? <p className="mt-2 text-xs text-[#5e6e80]">Location: {entry.task.locationDetails}</p> : null}
      {entry.task.detailNotes ? <p className="mt-1 text-xs text-[#5e6e80]">{entry.task.detailNotes}</p> : null}
    </article>
  );
}

function ActionCard({ entry }: { entry: BoardEntry }) {
  return (
    <article className={`task-mobile-card board-task ${entry.rag}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#17263a]">{entry.task.title}</p>
          <p className="mt-1 text-xs text-[#5e6e80]">
            {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"} • {kindLabel(entry.kind)}
          </p>
        </div>
        <span className={`status-pill ${entry.rag}`}>{entry.rag}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#5e6e80]">
        <span className="capture-meta-pill">{dueBadge(entry.task.dueAt, entry.task.status)}</span>
        {entry.task.startedAt ? <span className="capture-meta-pill">running {elapsedLabel(entry.task.startedAt)}</span> : null}
        {entry.task.locationDetails ? <span className="capture-meta-pill">{entry.task.locationDetails}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {entry.task.status !== "done" ? (
          <>
            {!entry.task.startedAt ? (
              <form action={startTaskAction}>
                <input type="hidden" name="taskId" value={entry.task.id} />
                <button className="action-btn subtle">Start</button>
              </form>
            ) : null}
              <form action={completeTaskAction} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="taskId" value={entry.task.id} />
                <input name="note" type="text" placeholder="Note" className="min-w-0 flex-1 rounded-xl border border-[#d7e3f4] bg-[#f8fbff] px-2 py-2 text-xs" />
                <button className="action-btn bright">Done</button>
              </form>
          </>
        ) : (
          <form action={reopenTaskAction}>
            <input type="hidden" name="taskId" value={entry.task.id} />
            <button className="action-btn warn">Reopen</button>
          </form>
        )}
      </div>
    </article>
  );
}

function ProjectCard({ entry }: { entry: BoardEntry }) {
  return (
    <article className="project-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#13233c]">{entry.task.title}</p>
          <p className="mt-1 text-xs text-[#5e6e80]">{entry.roomName} • {entry.task.childCount} smaller jobs</p>
        </div>
        <span className="kind-pill">Project</span>
      </div>
      <p className="mt-2 text-sm text-[#45596f]">Break this into smaller jobs.</p>
      {entry.task.detailNotes ? <p className="mt-2 text-xs text-[#5e6e80]">{entry.task.detailNotes}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin#step-tasks" className="action-btn subtle text-center">
          Break into smaller jobs
        </Link>
      </div>
    </article>
  );
}

function DoneCard({ entry }: { entry: BoardEntry }) {
  return (
    <article className="rounded-2xl border border-[#cfe5d8] bg-[#f2fcf6] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#163b25]">{entry.task.title}</p>
          <p className="mt-1 text-xs text-[#4f6f5b]">
            {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"}
          </p>
        </div>
        <span className="rounded-full bg-[#dff4e5] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#2f8f51]">Done</span>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[#d7e3f4] bg-[#f6faff] p-4 text-sm text-[#5e6e80]">{text}</p>;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d7e3f4] bg-[#eef4ff] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#5e6e80]">{label}</p>
      <p className="text-lg font-bold leading-none text-[#17263a]">{value}</p>
    </div>
  );
}

function isProjectLike(entry: BoardEntry) {
  return entry.kind === "project" || entry.kind === "clear_out" || entry.kind === "outdoor" || entry.task.childCount > 0 || entry.task.estimatedMinutes >= 30;
}

function kindLabel(kind: JobKind) {
  switch (kind) {
    case "issue":
      return "Issue";
    case "upkeep":
      return "Upkeep";
    case "project":
      return "Project";
    case "clear_out":
      return "Clear-out";
    case "outdoor":
      return "Outdoor";
    case "planning":
      return "Planning";
  }
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

function dueBadge(dueIso: string | null, status: TaskItem["status"]) {
  if (status === "done") return "done";
  if (!dueIso) return "no due";
  const due = new Date(dueIso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((due - now) / 60000);
  if (diffMin <= 0) return "overdue";
  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
