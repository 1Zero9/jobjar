import { createQuickTaskAction, logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { SimilarTaskField } from "@/app/components/SimilarTaskField";
import { TasksPanelClient } from "@/app/components/TasksPanelClient";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireSessionContext } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type SearchParams = {
  added?: string;
  updated?: string;
  lucky?: string;
  assignee?: string;
  room?: string;
  state?: string;
  taskId?: string;
};

export async function LogWorkspace({ params }: { params: SearchParams }) {
  const { householdId, userId, role } = await requireSessionContext("/log");

  const [currentUser, rooms, people, lookupTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true },
    }),
    prisma.room.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        detailNotes: true,
        captureStage: true,
        room: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const roomOptions = uniqueRoomsByName(rooms).filter((room) => room.name.toLowerCase() !== "unsorted");
  const peopleOptions = people.map((member) => member.user);
  const groupedRoomOptions = groupRoomsByDesignation(roomOptions);

  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="capture-app-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <header className="capture-topbar">
          <div>
            <div className="capture-topline">
              <p className="capture-kicker">Task Jar</p>
              <span className="version-chip">{APP_VERSION}</span>
            </div>
            <h1 className="capture-title">Log a task</h1>
            <p className="capture-subtitle">Keep capture fast. Task first, room second, everything else optional.</p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/" className="action-btn subtle quiet">
              Home
            </Link>
            <Link href="/tasks" className="action-btn subtle quiet">
              View tasks
            </Link>
            {role === "admin" ? (
              <Link href="/settings" className="action-btn subtle quiet">
                Setup
              </Link>
            ) : null}
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
          </div>
        </header>

        {params.added === "task" ? (
          <div className="flex items-center gap-3">
            <ToastNotice message="Task recorded." tone="success" />
            {params.taskId ? (
              <Link href={`/tasks#task-${params.taskId}`} className="action-btn subtle quiet">
                View task
              </Link>
            ) : null}
          </div>
        ) : null}
        {params.added === "done" ? <ToastNotice message="Completed task recorded." tone="success" /> : null}

        <section className="capture-panel-simple">
          <form action={createQuickTaskAction} className="capture-form-simple" id="capture-form">
            <input type="hidden" name="returnTo" value="/log" />
            <SimilarTaskField
              tasks={lookupTasks.map((task) => ({
                id: task.id,
                title: task.title,
                detailNotes: task.detailNotes,
                roomName: task.room.name,
                state: task.captureStage === "done" ? "done" : "open",
              }))}
            />

            <label className="capture-step">
              <span className="capture-step-label">Room (optional)</span>
              <select name="roomId" defaultValue="" className="capture-room-select">
                <option value="">No room yet</option>
                {groupedRoomOptions.map(([group, groupedRooms]) => (
                  <optgroup key={group} label={group}>
                    {groupedRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <details className="recorded-row recorded-row-green">
              <summary className="recorded-row-summary">
                <div className="min-w-0">
                  <p className="recorded-row-title">Add details</p>
                  <p className="recorded-row-placeholder">Notes, priority, or mark it as already completed.</p>
                </div>
                <div className="recorded-row-meta">
                  <span className="recorded-row-edit">Optional</span>
                  <span className="recorded-row-chevron">+</span>
                </div>
              </summary>

              <div className="recorded-row-detail">
                <label className="recorded-field">
                  <span>Notes</span>
                  <textarea
                    name="detailNotes"
                    rows={3}
                    placeholder="Optional note"
                    className="recorded-edit-input recorded-edit-textarea"
                  />
                </label>

                <div className="capture-meta-grid">
                  <label className="recorded-field">
                    <span>Priority in room</span>
                    <input
                      name="priority"
                      type="number"
                      min={1}
                      placeholder="Auto"
                      className="recorded-edit-input"
                    />
                  </label>

                  <label className="recorded-field">
                    <span>Status</span>
                    <select name="recordStatus" defaultValue="open" className="recorded-edit-input">
                      <option value="open">Open</option>
                      <option value="done">Completed</option>
                    </select>
                  </label>

                  <label className="recorded-field">
                    <span>Completed by</span>
                    <select name="completedByUserId" defaultValue={currentUser?.id ?? ""} className="recorded-edit-input">
                      <option value="">Not set</option>
                      {peopleOptions.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="recorded-field">
                  <span>Resolved date</span>
                  <input
                    name="resolvedAt"
                    type="datetime-local"
                    defaultValue={toDateTimeInputValue(new Date())}
                    className="recorded-edit-input"
                  />
                </label>

                <details className="recorded-more-details">
                  <summary className="recorded-more-summary">Recurring task</summary>
                  <div className="capture-meta-grid">
                    <label className="recorded-field">
                      <span>Repeats</span>
                      <select name="recurrenceType" defaultValue="none" className="recorded-edit-input">
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>

                    <label className="recorded-field">
                      <span>Every</span>
                      <input
                        name="recurrenceInterval"
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="recorded-edit-input"
                      />
                    </label>
                  </div>

                  <label className="recorded-field">
                    <span>Next due</span>
                    <input
                      name="nextDueAt"
                      type="datetime-local"
                      defaultValue={toDateTimeInputValue(addDays(new Date(), 7))}
                      className="recorded-edit-input"
                    />
                  </label>
                </details>
              </div>
            </details>

            <FormActionButton className="capture-submit-btn" pendingLabel="Saving task">
              Save task
            </FormActionButton>
          </form>
        </section>

        <footer className="capture-footer">
          Logged in as <span className="session-user">{currentUser?.displayName ?? "You"}</span>
        </footer>
      </main>
    </div>
  );
}

export async function TasksWorkspace({ params }: { params: SearchParams }) {
  const { householdId, userId, role } = await requireSessionContext("/tasks");

  const [currentUser, rooms, people, recordedTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.room.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId },
      },
      orderBy: [{ room: { sortOrder: "asc" } }, { priority: "asc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        room: {
          select: { name: true },
        },
        logger: {
          select: { displayName: true },
        },
        projectParent: {
          select: {
            title: true,
          },
        },
        assignments: {
          where: { assignedTo: null },
          orderBy: { assignedFrom: "desc" },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        schedule: {
          select: {
            recurrenceType: true,
            intervalCount: true,
            nextDueAt: true,
          },
        },
        occurrences: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            completer: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const roomOptions = uniqueRoomsByName(rooms).filter((room) => room.name.toLowerCase() !== "unsorted");
  const peopleOptions = people.map((member) => member.user);
  const selectedRoomId = roomOptions.some((room) => room.id === params.room) ? (params.room ?? "") : "";
  const selectedAssigneeId = peopleOptions.some((person) => person.id === params.assignee) ? (params.assignee ?? "") : "";
  const selectedState: "all" | "open" | "done" = params.state === "done" || params.state === "open" ? params.state : "all";
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? recordedTasks.find((task) => task.id === params.lucky)
    : null;

  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="capture-app-shell mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <header className="capture-topbar">
          <div>
            <div className="capture-topline">
              <p className="capture-kicker">Task Jar</p>
              <span className="version-chip">{APP_VERSION}</span>
            </div>
            <h1 className="capture-title">Tasks</h1>
            <p className="capture-subtitle">View, filter, prioritise, and complete what has already been logged.</p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/" className="action-btn subtle quiet">
              Home
            </Link>
            <Link href="/log" className="action-btn subtle quiet">
              Log task
            </Link>
            {role === "admin" ? (
              <Link href="/settings" className="action-btn subtle quiet">
                Setup
              </Link>
            ) : null}
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
          </div>
        </header>

        {params.added === "task" ? <ToastNotice message="Task recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed task recorded." tone="success" /> : null}
        {params.updated === "task" ? <ToastNotice message="Task updated." tone="info" /> : null}
        {params.updated === "done" ? <ToastNotice message="Task marked completed." tone="success" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No tasks available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}

        <TasksPanelClient
          roomOptions={roomOptions}
          peopleOptions={peopleOptions}
          initialRoomId={selectedRoomId}
          initialAssigneeId={selectedAssigneeId}
          initialState={selectedState}
          initialLuckyId={params.lucky && params.lucky !== "empty" ? params.lucky : null}
          tasks={recordedTasks.map((task) => ({
            id: task.id,
            title: task.title,
            roomId: task.roomId,
            roomName: task.room.name,
            loggerName: task.logger?.displayName ?? null,
            projectParentTitle: task.projectParent?.title ?? null,
            assignmentUserId: task.assignments[0]?.userId ?? null,
            assignmentUserName: task.assignments[0]?.user?.displayName ?? null,
            detailNotes: task.detailNotes ?? null,
            priority: task.priority,
            captureStage: task.captureStage,
            createdAt: task.createdAt.toISOString(),
            schedule: task.schedule
              ? {
                  recurrenceType: task.schedule.recurrenceType,
                  intervalCount: task.schedule.intervalCount,
                  nextDueAt: task.schedule.nextDueAt?.toISOString() ?? null,
                }
              : null,
            occurrences: task.occurrences.map((occurrence) => ({
              status: occurrence.status,
              dueAt: occurrence.dueAt.toISOString(),
              completedAt: occurrence.completedAt?.toISOString() ?? null,
              completedBy: occurrence.completedBy ?? null,
              completerName: occurrence.completer?.displayName ?? null,
            })),
          }))}
        />

        <footer className="capture-footer">
          Logged in as <span className="session-user">{currentUser?.displayName ?? "You"}</span>
        </footer>
      </main>
    </div>
  );
}

function toDateTimeInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function uniqueRoomsByName<T extends { id: string; name: string }>(rooms: T[]) {
  const seen = new Set<string>();
  return rooms.filter((room) => {
    const key = room.name.trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function groupRoomsByDesignation<T extends { designation?: string | null; name: string }>(rooms: T[]) {
  const grouped = new Map<string, T[]>();
  for (const room of rooms) {
    const key = room.designation?.trim() || "General";
    const entries = grouped.get(key) ?? [];
    entries.push(room);
    grouped.set(key, entries);
  }
  return [...grouped.entries()];
}
