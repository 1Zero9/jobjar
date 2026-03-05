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
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="board-shell capture-hero p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526071]">Household Job Jar</p>
              <h1 className="mt-1 text-3xl font-bold text-[#13233c] sm:text-4xl">Catch it when you notice it.</h1>
              <p className="mt-2 text-sm text-[#52657d] sm:text-base">
                This is the family capture desk. Notice a problem, a clean-up, a fix, or a bigger ambition, drop it here first, then shape it into work when
                you are ready.
              </p>
            </div>
            <form action={logoutAction}>
              <button className="action-btn warn">Log out</button>
            </form>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="capture-panel rounded-[1.4rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Quick Capture</p>
                  <h2 className="mt-1 text-xl font-semibold text-[#13233c]">Record the raw job before it disappears</h2>
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

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Stairs need hoovering",
                  "Bedroom needs decorating",
                  "Garden needs sorting front and back",
                  "Attic clear-out and donation run",
                ].map((example) => (
                  <span key={example} className="capture-suggestion">
                    {example}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <StageNote label="Capture" text="Get it out of your head fast." />
                <StageNote label="Shape" text="Assign, room it, date it, or expand it." />
                <StageNote label="Move" text="Start work or turn it into a larger project." />
              </div>
            </section>

            <section className="rounded-[1.4rem] border border-[#d7e3f4] bg-[#f7fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">House Pulse</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatChip label="All jobs" value={String(tasks.length)} />
                <StatChip label="Completed" value={String(done.length)} />
                <StatChip label="Needs shaping" value={String(freshCaptures.length + readyToShape.length)} />
                <StatChip label="Live issues" value={String(movingNow.filter((entry) => entry.rag !== "green").length)} />
              </div>

              <div className="mt-3 rounded-2xl border border-[#cfe1f7] bg-[#eef5ff] px-3 py-3">
                <p className="text-sm font-semibold text-[#17263a]">
                  {currentUser?.displayName ?? "Family Member"} owns {myEntries.length} jobs and has closed {myDone}.
                </p>
                <p className="mt-1 text-xs text-[#5e6e80]">Whole-house completion is {completionRate}%.</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/admin" className="action-btn subtle text-center">
                  Shape in Admin
                </Link>
                <Link href="/tv" className="action-btn subtle text-center">
                  Family TV View
                </Link>
              </div>
              <p className="mt-2 text-xs text-[#5e6e80]">Source: {source === "database" ? "Live household data" : "Demo fallback"}</p>
            </section>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Capture Queue</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Freshly noticed</h2>
                <p className="text-sm text-[#5e6e80]">These are raw captures. The point is speed, not precision.</p>
              </div>
              <span className="queue-count">{freshCaptures.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {freshCaptures.length === 0 ? (
                <EmptyState text="Nothing sitting loose in the inbox. Capture the next thing you notice." />
              ) : (
                freshCaptures.map((entry) => <CaptureCard key={entry.task.id} entry={entry} />)
              )}
            </div>
          </article>

          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Needs Shape</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Give the job a home</h2>
                <p className="text-sm text-[#5e6e80]">Decide whether it is upkeep, a fix, a project, or something to schedule later.</p>
              </div>
              <Link href="/admin#step-tasks" className="action-btn subtle text-center">
                Open Task Shaping
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {readyToShape.length === 0 ? (
                <EmptyState text="Nothing half-defined right now. Inbox and active work are under control." />
              ) : (
                readyToShape.map((entry) => <ShapeCard key={entry.task.id} entry={entry} />)
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Active Pressure</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Moving now</h2>
                <p className="text-sm text-[#5e6e80]">Started work, urgent issues, and anything that needs family attention soon.</p>
              </div>
              <span className="queue-count">{movingNow.length}</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {movingNow.length === 0 ? <EmptyState text="No live pressure right now. Good. Capture or shape the next job." /> : movingNow.map((entry) => <ActionCard key={entry.task.id} entry={entry} />)}
            </div>
          </article>

          <article className="board-shell p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Bigger Work</p>
                <h2 className="text-xl font-semibold text-[#13233c]">Projects and clear-outs</h2>
                <p className="text-sm text-[#5e6e80]">These need breaking down, planning, or carving into smaller jobs.</p>
              </div>
              <span className="queue-count">{projects.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {projects.length === 0 ? <EmptyState text="No big multi-step work flagged yet." /> : projects.map((entry) => <ProjectCard key={entry.task.id} entry={entry} />)}
            </div>
          </article>
        </section>

        <section className="board-shell p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e6e80]">Closed Loop</p>
              <h2 className="text-xl font-semibold text-[#13233c]">Done and parked</h2>
              <p className="text-sm text-[#5e6e80]">Finished jobs stay visible long enough to prove the house is moving.</p>
            </div>
            <span className="queue-count">{done.length}</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {done.length === 0 ? <EmptyState text="Nothing closed yet. The first wins will show up here." /> : done.slice(0, 6).map((entry) => <DoneCard key={entry.task.id} entry={entry} />)}
          </div>
        </section>
      </main>
    </div>
  );
}

function StageNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#d7e3f4] bg-[#f8fbff] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6a7b90]">{label}</p>
      <p className="mt-1 text-sm text-[#41546a]">{text}</p>
    </div>
  );
}

function CaptureCard({ entry }: { entry: BoardEntry }) {
  return (
    <article className="capture-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#13233c]">{entry.task.title}</p>
          <p className="mt-1 text-sm text-[#5e6e80]">
            Captured into {entry.roomName}. Suggested shape: <span className="font-semibold text-[#324964]">{kindLabel(entry.kind)}</span>
          </p>
        </div>
        <span className="kind-pill">{kindLabel(entry.kind)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={startTaskAction}>
          <input type="hidden" name="taskId" value={entry.task.id} />
          <button className="action-btn subtle">Start anyway</button>
        </form>
        <Link href="/admin#step-tasks" className="action-btn bright text-center">
          Shape this in Admin
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
          <p className="mt-1 text-xs text-[#5e6e80]">
            {entry.roomName} • {entry.task.assigneeName ?? "Unassigned"} • {kindSentence(entry.kind)}
          </p>
        </div>
        <span className={`status-pill ${entry.rag}`}>{entry.rag}</span>
      </div>
      <p className="mt-2 text-sm text-[#45596f]">{shapeAdvice(entry)}</p>
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
              <input name="note" type="text" placeholder="What happened?" className="min-w-0 flex-1 rounded-xl border border-[#d7e3f4] bg-[#f8fbff] px-2 py-2 text-xs" />
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
          <p className="mt-1 text-xs text-[#5e6e80]">
            {entry.roomName} • {entry.task.assigneeName ?? "Needs owner"} • {kindLabel(entry.kind)} • {entry.task.childCount} child jobs
          </p>
        </div>
        <span className="kind-pill">Project</span>
      </div>
      <p className="mt-2 text-sm text-[#45596f]">{projectAdvice(entry)}</p>
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

function kindSentence(kind: JobKind) {
  switch (kind) {
    case "issue":
      return "Looks like a real-world problem that may need diagnosing or fixing.";
    case "upkeep":
      return "Looks like repeatable upkeep or household maintenance.";
    case "project":
      return "Feels like a larger transformation rather than a one-step job.";
    case "clear_out":
      return "Probably needs sorting, decisions, and disposal or donation.";
    case "outdoor":
      return "Likely outdoor work that can be split by zone or pass.";
    case "planning":
      return "Needs shaping and sequencing before it becomes active work.";
  }
}

function shapeAdvice(entry: BoardEntry) {
  if (entry.kind === "issue") return "Give it an owner, due date, and next action. Problems get heavier when they stay vague.";
  if (entry.kind === "project") return "Break the ambition into first moves: measure, choose, buy, prepare, then do.";
  if (entry.kind === "clear_out") return "Split into keep, donate, and dump passes so the job becomes finishable.";
  if (entry.kind === "outdoor") return "Consider dividing it into front, back, bins, beds, or one weekend push per zone.";
  if (entry.kind === "planning") return "Decide whether this needs a schedule, an owner, or a room before it can move.";
  return "This can probably become a simple assigned household job with a realistic due date.";
}

function projectAdvice(entry: BoardEntry) {
  if (entry.kind === "clear_out") return "Treat this as a disposal workflow: sort first, then book donation or dump runs.";
  if (entry.kind === "outdoor") return "Split the space into visible sections so progress is obvious and family-sized.";
  if (entry.kind === "project") return "This wants stages, not one checkbox. Use Admin to create the first practical steps.";
  return "This is larger than a quick task. Turn it into a small stack of jobs with sequence and ownership.";
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
