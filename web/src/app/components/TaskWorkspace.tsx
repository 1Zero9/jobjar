import { createQuickTaskAction, deleteTaskAction, logoutAction, luckyDipAction, updateRecordedTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type SearchParams = {
  added?: string;
  updated?: string;
  lucky?: string;
  room?: string;
  state?: string;
};

export async function TaskWorkspace({
  params,
  basePath,
  primaryPanel = "capture",
  pageTitle,
  pageSubtitle,
}: {
  params: SearchParams;
  basePath: "/log" | "/tasks";
  primaryPanel?: "capture" | "recorded";
  pageTitle: string;
  pageSubtitle: string;
}) {
  const { householdId, userId, role } = await requireSessionContext(basePath);

  const [currentUser, rooms, people, recordedTasks] = await Promise.all([
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
      orderBy: [{ room: { sortOrder: "asc" } }, { priority: "asc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        room: {
          select: { name: true, designation: true },
        },
        projectParent: {
          select: { id: true, title: true },
        },
        projectChildren: {
          where: { active: true },
          select: { id: true },
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
        occurrences: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            completer: {
              select: {
                id: true,
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
  const groupedRoomOptions = groupRoomsByDesignation(roomOptions);
  const selectedRoomId = roomOptions.some((room) => room.id === params.room) ? params.room : "";
  const selectedState = params.state === "done" || params.state === "open" ? params.state : "all";
  const visibleTasks = recordedTasks.filter((task) => {
    const matchesRoom = selectedRoomId ? task.roomId === selectedRoomId : true;
    const taskState = getTaskState(task);
    const matchesState = selectedState === "all" ? true : taskState === selectedState;
    return matchesRoom && matchesState;
  });
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? visibleTasks.find((task) => task.id === params.lucky) ?? recordedTasks.find((task) => task.id === params.lucky)
    : null;

  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="capture-app-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <header className="capture-topbar">
          <div>
            <p className="capture-kicker">Task Jar</p>
            <h1 className="capture-title">{pageTitle}</h1>
            <p className="capture-subtitle">{pageSubtitle}</p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/" className="action-btn subtle quiet">
              Home
            </Link>
            {basePath === "/log" ? (
              <Link href="/tasks#recorded" className="action-btn subtle quiet">
                View tasks
              </Link>
            ) : (
              <Link href="/log" className="action-btn subtle quiet">
                Log task
              </Link>
            )}
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
        {params.added === "done" ? <ToastNotice message="Completed job recorded." tone="success" /> : null}
        {params.updated === "task" ? <ToastNotice message="Task updated." tone="info" /> : null}
        {params.updated === "done" ? <ToastNotice message="Task marked completed." tone="success" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No tasks available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}

        <div className={`capture-content-grid ${primaryPanel === "recorded" ? "recorded-first" : ""}`}>
          <section className="capture-panel-simple">
            <div className="capture-step">
              <p className="capture-step-label">1. Task</p>
              <form action={createQuickTaskAction} className="capture-form-simple">
                <input type="hidden" name="returnTo" value={basePath} />
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Light bulb out"
                  className="capture-main-input"
                  autoFocus={basePath === "/log"}
                />

                <div className="capture-step">
                  <p className="capture-step-label">2. Room (optional)</p>
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
                </div>

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

                <FormActionButton className="capture-submit-btn" pendingLabel="Saving task">
                  Save task
                </FormActionButton>
              </form>
              <form action={luckyDipAction}>
                <input type="hidden" name="returnTo" value="/tasks" />
                <FormActionButton className="action-btn subtle w-full" pendingLabel="Choosing task">
                  Lucky dip
                </FormActionButton>
              </form>
            </div>
          </section>

          <section id="recorded" className="recorded-panel">
            <div className="recorded-header">
              <div>
                <p className="capture-kicker">Recorded</p>
                <h2 className="recorded-title">Tasks recorded</h2>
              </div>
              <span className="recorded-count">{visibleTasks.length}</span>
            </div>

            <form method="get" action={basePath} className="recorded-filter-bar">
              <label className="recorded-filter-field">
                <span>Filter by room</span>
                <select name="room" defaultValue={selectedRoomId} className="recorded-filter-select">
                  <option value="">All rooms</option>
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
              <label className="recorded-filter-field">
                <span>State</span>
                <select name="state" defaultValue={selectedState} className="recorded-filter-select">
                  <option value="all">All states</option>
                  <option value="open">Open</option>
                  <option value="done">Completed</option>
                </select>
              </label>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Applying">
                Apply
              </FormActionButton>
              {selectedRoomId || selectedState !== "all" ? (
                <Link href={`${basePath}#recorded`} className="action-btn subtle quiet">
                  Clear
                </Link>
              ) : null}
            </form>

            <div className="recorded-list">
              {visibleTasks.length === 0 ? (
                <p className="recorded-empty">
                  {selectedRoomId ? "No tasks recorded for this room yet." : "No tasks recorded yet."}
                </p>
              ) : (
                visibleTasks.map((task, index) => (
                  <details
                    key={task.id}
                    id={`task-${task.id}`}
                    className={`recorded-row recorded-row-${rowTone(index)}`}
                    open={task.id === params.lucky}
                  >
                    <summary className="recorded-row-summary">
                      <div className="min-w-0">
                        <p className="recorded-row-title">{task.title}</p>
                        <div className="recorded-summary-line">
                          {getTaskState(task) !== "done" ? <span className="task-chip">Priority {task.priority}</span> : null}
                          <span className={`task-chip ${getTaskState(task) === "done" ? "task-chip-done" : ""}`}>
                            {getTaskState(task) === "done" ? "Completed" : "Open"}
                          </span>
                          {task.projectParent ? <span className="task-chip">Sub-task of {task.projectParent.title}</span> : null}
                          {task.projectChildren.length > 0 ? <span className="task-chip">{task.projectChildren.length} sub-tasks</span> : null}
                        </div>
                      </div>
                      <div className="recorded-row-meta">
                        <span className="recorded-row-edit">Edit</span>
                        <p className="recorded-row-room">{displayRoomName(task.room.name)}</p>
                        <span className="recorded-row-chevron">+</span>
                      </div>
                    </summary>

                    <div className="recorded-row-detail">
                      <form action={updateRecordedTaskAction} className="recorded-edit-form">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnTo" value={basePath} />

                        <label className="recorded-field">
                          <span>Task</span>
                          <input
                            name="title"
                            type="text"
                            defaultValue={task.title}
                            className="recorded-edit-input"
                          />
                        </label>

                        <label className="recorded-field">
                          <span>Room</span>
                          <select name="roomId" defaultValue={task.room.name.toLowerCase() === "unsorted" ? "" : task.roomId} className="recorded-edit-input">
                            <option value="">No room</option>
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

                        <label className="recorded-field">
                          <span>Person</span>
                          <select
                            name="assigneeUserId"
                            defaultValue={task.assignments[0]?.userId ?? ""}
                            className="recorded-edit-input"
                          >
                            <option value="">No person</option>
                            {peopleOptions.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.displayName}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="recorded-field">
                          <span>Sub-task of</span>
                          <select
                            name="parentTaskId"
                            defaultValue={task.projectParent?.id ?? ""}
                            className="recorded-edit-input"
                          >
                            <option value="">No parent task</option>
                            {recordedTasks
                              .filter((candidate) => candidate.id !== task.id)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.title}
                                </option>
                              ))}
                          </select>
                        </label>

                        <label className="recorded-field">
                          <span>Notes</span>
                          <textarea
                            name="detailNotes"
                            rows={3}
                            defaultValue={task.detailNotes ?? ""}
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
                              defaultValue={getTaskState(task) === "done" ? "" : task.priority}
                              className="recorded-edit-input"
                            />
                          </label>

                          <label className="recorded-field">
                            <span>Status</span>
                            <select
                              name="recordStatus"
                              defaultValue={getTaskState(task) === "done" ? "done" : "open"}
                              className="recorded-edit-input"
                            >
                              <option value="open">Open</option>
                              <option value="done">Completed</option>
                            </select>
                          </label>

                          <label className="recorded-field">
                            <span>Completed by</span>
                            <select
                              name="completedByUserId"
                              defaultValue={task.occurrences[0]?.completedBy ?? ""}
                              className="recorded-edit-input"
                            >
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
                            defaultValue={toDateTimeInputValue(task.occurrences[0]?.completedAt ?? task.createdAt)}
                            className="recorded-edit-input"
                          />
                        </label>

                        <p><span>Recorded</span><strong>{formatRecordedAt(task.createdAt)}</strong></p>
                        {task.occurrences[0]?.completedAt ? (
                          <p><span>Resolved</span><strong>{formatRecordedAt(task.occurrences[0].completedAt)}</strong></p>
                        ) : null}
                        {task.occurrences[0]?.completer?.displayName ? (
                          <p><span>Completed by</span><strong>{task.occurrences[0].completer.displayName}</strong></p>
                        ) : null}
                        <div className="recorded-row-actions between">
                          <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                            Save changes
                          </FormActionButton>
                        </div>
                      </form>
                      <form action={deleteTaskAction} className="recorded-row-actions">
                        <input type="hidden" name="taskId" value={task.id} />
                        <FormActionButton className="action-btn warn quiet" pendingLabel="Deleting">
                          Delete task
                        </FormActionButton>
                      </form>
                    </div>
                  </details>
                ))
              )}
            </div>
          </section>
        </div>

        <footer className="capture-footer">
          Logged in as {currentUser?.displayName ?? "You"}
        </footer>
      </main>
    </div>
  );
}

function rowTone(index: number) {
  const tones = ["blue", "green", "amber", "rose"] as const;
  return tones[index % tones.length];
}

function formatRecordedAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function toDateTimeInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getTaskState(task: {
  captureStage: string;
  occurrences: Array<{ status: string }>;
}) {
  if (task.captureStage === "done" || task.occurrences[0]?.status === "done") {
    return "done";
  }
  return "open";
}

function displayRoomName(roomName: string) {
  return roomName.toLowerCase() === "unsorted" ? "No room" : roomName;
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
