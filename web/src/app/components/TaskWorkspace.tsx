import { createQuickTaskAction, deleteTaskAction, logoutAction, luckyDipAction, updateRecordedTaskAction, updateTaskAssigneeAction } from "@/app/actions";
import { AutoSubmitForm } from "@/app/components/AutoSubmitForm";
import { AutoSubmitSelect } from "@/app/components/AutoSubmitSelect";
import { FormActionButton } from "@/app/components/FormActionButton";
import { SimilarTaskField } from "@/app/components/SimilarTaskField";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireSessionContext } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type SearchParams = {
  added?: string;
  updated?: string;
  lucky?: string;
  room?: string;
  state?: string;
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
      take: 120,
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

        {params.added === "task" ? <ToastNotice message="Task recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed job recorded." tone="success" /> : null}

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
            id: true,
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
  const selectedRoomId = roomOptions.some((room) => room.id === params.room) ? (params.room ?? "") : "";
  const selectedState: "all" | "open" | "done" = params.state === "done" || params.state === "open" ? params.state : "all";
  const visibleTasks = recordedTasks.filter((task) => {
    const matchesRoom = selectedRoomId ? task.roomId === selectedRoomId : true;
    const taskState = getTaskState(task);
    const matchesState = selectedState === "all" ? true : taskState === selectedState;
    return matchesRoom && matchesState;
  });
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? visibleTasks.find((task) => task.id === params.lucky) ?? recordedTasks.find((task) => task.id === params.lucky)
    : null;
  const currentTasksReturnTo = buildTasksReturnTo(selectedRoomId, selectedState);

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
        {params.added === "done" ? <ToastNotice message="Completed job recorded." tone="success" /> : null}
        {params.updated === "task" ? <ToastNotice message="Task updated." tone="info" /> : null}
        {params.updated === "done" ? <ToastNotice message="Task marked completed." tone="success" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No tasks available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}

        <section id="recorded" className="recorded-panel">
          <div className="recorded-header">
            <div>
              <p className="capture-kicker">Tasks</p>
              <h2 className="recorded-title">Logged tasks</h2>
            </div>
            <span className="recorded-count">{visibleTasks.length}</span>
          </div>

          <div className="recorded-toolbar">
            <AutoSubmitForm action="/tasks" className="recorded-filter-bar">
              <label className="recorded-filter-field">
                <span>Room</span>
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
              {selectedRoomId || selectedState !== "all" ? (
                <Link href="/tasks#recorded" className="action-btn subtle quiet">
                  Clear
                </Link>
              ) : null}
            </AutoSubmitForm>

            <form action={luckyDipAction}>
              <input type="hidden" name="returnTo" value="/tasks" />
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Choosing task">
                Lucky dip
              </FormActionButton>
            </form>
          </div>

          <div className="recorded-list">
            {visibleTasks.length === 0 ? (
              <p className="recorded-empty">
                {selectedRoomId || selectedState !== "all" ? "No tasks match these filters." : "No tasks recorded yet."}
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
                    <div className="recorded-row-main">
                      <p className="recorded-row-title">{task.title}</p>
                      <p className="recorded-row-placeholder">
                        {task.logger?.displayName ? `Logged by ${task.logger.displayName}` : "Earlier task"}
                      </p>
                      <div className="recorded-summary-line">
                        {getTaskState(task) !== "done" ? <span className="task-chip">Priority {task.priority}</span> : null}
                        <span className={`task-chip ${getTaskState(task) === "done" ? "task-chip-done" : ""}`}>
                          {getTaskState(task) === "done" ? "Completed" : "Open"}
                        </span>
                        {task.schedule ? <span className="task-chip">{formatRecurrenceChip(task.schedule)}</span> : null}
                        {task.schedule?.nextDueAt ? <span className="task-chip">Due {formatShortDate(task.schedule.nextDueAt)}</span> : null}
                        {task.schedule ? <span className={`task-chip ${recurrenceStateClassName(task)}`}>{getRecurrenceStateLabel(task)}</span> : null}
                        {task.projectParent ? <span className="task-chip">Sub-task of {task.projectParent.title}</span> : null}
                      </div>
                      <form action={updateTaskAssigneeAction} className="task-inline-assign">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnTo" value={currentTasksReturnTo} />
                        <span className="task-inline-assign-label">Assigned</span>
                        <AutoSubmitSelect
                          name="assigneeUserId"
                          defaultValue={task.assignments[0]?.userId ?? ""}
                          className="task-inline-assign-select"
                        >
                          <option value="">No person</option>
                          {peopleOptions.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.displayName}
                            </option>
                          ))}
                        </AutoSubmitSelect>
                      </form>
                    </div>
                    <div className="recorded-row-meta">
                      <span className="recorded-row-room">{displayRoomName(task.room.name)}</span>
                      <div className="recorded-row-summary-actions">
                        <span className="recorded-row-edit">Edit</span>
                        <span className="recorded-row-chevron">+</span>
                      </div>
                    </div>
                  </summary>

                  <div className="recorded-row-detail">
                    <form action={updateRecordedTaskAction} className="recorded-edit-form">
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="returnTo" value="/tasks" />

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
                        <span>Notes</span>
                        <textarea
                          name="detailNotes"
                          rows={3}
                          defaultValue={task.detailNotes ?? ""}
                          className="recorded-edit-input recorded-edit-textarea"
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

                      <details className="recorded-more-details">
                        <summary className="recorded-more-summary">More details</summary>
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
                            <span>Completed by</span>
                            <select
                              name="completedByUserId"
                              defaultValue={getLatestCompletedOccurrence(task.occurrences)?.completedBy ?? ""}
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
                            defaultValue={toDateTimeInputValue(getLatestCompletedOccurrence(task.occurrences)?.completedAt ?? task.createdAt)}
                            className="recorded-edit-input"
                          />
                        </label>

                        <div className="capture-meta-grid">
                          <label className="recorded-field">
                            <span>Repeats</span>
                            <select
                              name="recurrenceType"
                              defaultValue={task.schedule?.recurrenceType ?? "none"}
                              className="recorded-edit-input"
                            >
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
                              defaultValue={task.schedule?.intervalCount ?? 1}
                              className="recorded-edit-input"
                            />
                          </label>
                        </div>

                        <label className="recorded-field">
                          <span>Next due</span>
                          <input
                            name="nextDueAt"
                            type="datetime-local"
                            defaultValue={toDateTimeInputValue(task.schedule?.nextDueAt ?? addDays(new Date(), 7))}
                            className="recorded-edit-input"
                          />
                        </label>
                      </details>

                      <p><span>Recorded</span><strong>{formatRecordedAt(task.createdAt)}</strong></p>
                      {task.schedule ? (
                        <p><span>Recurring</span><strong>{formatRecurrenceChip(task.schedule)}</strong></p>
                      ) : null}
                      {task.schedule?.nextDueAt ? (
                        <p><span>Next due</span><strong>{formatRecordedAt(task.schedule.nextDueAt)}</strong></p>
                      ) : null}
                      {task.schedule ? (
                        <p><span>Status</span><strong>{getRecurrenceStateLabel(task)}</strong></p>
                      ) : null}
                      {getLatestCompletedOccurrence(task.occurrences)?.completedAt ? (
                        <p><span>Resolved</span><strong>{formatRecordedAt(getLatestCompletedOccurrence(task.occurrences)!.completedAt!)}</strong></p>
                      ) : null}
                      {getLatestCompletedOccurrence(task.occurrences)?.completedAt ? (
                        <p><span>Last done</span><strong>{formatRecordedAt(getLatestCompletedOccurrence(task.occurrences)!.completedAt!)}</strong></p>
                      ) : null}
                      {getLatestCompletedOccurrence(task.occurrences)?.completedAt && getLatestCompletedOccurrence(task.occurrences)?.dueAt ? (
                        <p>
                          <span>Completed</span>
                          <strong>{wasOccurrenceOnTime(getLatestCompletedOccurrence(task.occurrences)!) ? "On time" : "Late"}</strong>
                        </p>
                      ) : null}
                      {getLatestCompletedOccurrence(task.occurrences)?.completer?.displayName ? (
                        <p><span>Completed by</span><strong>{getLatestCompletedOccurrence(task.occurrences)!.completer!.displayName}</strong></p>
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

        <footer className="capture-footer">
          Logged in as <span className="session-user">{currentUser?.displayName ?? "You"}</span>
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

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function buildTasksReturnTo(selectedRoomId: string, selectedState: string) {
  const search = new URLSearchParams();
  if (selectedRoomId) {
    search.set("room", selectedRoomId);
  }
  if (selectedState !== "all") {
    search.set("state", selectedState);
  }
  const query = search.toString();
  return query ? `/tasks?${query}` : "/tasks";
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

function getLatestCompletedOccurrence<T extends { status: string; completedAt?: Date | null; completedBy?: string | null; completer?: { displayName: string } | null }>(
  occurrences: T[],
) {
  return occurrences.find((occurrence) => occurrence.status === "done") ?? null;
}

function getOpenOccurrence<T extends { status: string; dueAt: Date }>(occurrences: T[]) {
  return occurrences.find((occurrence) => occurrence.status !== "done") ?? null;
}

function formatRecurrenceChip(schedule: { recurrenceType: string; intervalCount: number }) {
  const interval = schedule.intervalCount > 1 ? `${schedule.intervalCount} ` : "";
  if (schedule.recurrenceType === "daily") {
    return `Every ${interval}day${schedule.intervalCount > 1 ? "s" : ""}`;
  }
  if (schedule.recurrenceType === "monthly") {
    return `Every ${interval}month${schedule.intervalCount > 1 ? "s" : ""}`;
  }
  return `Every ${interval}week${schedule.intervalCount > 1 ? "s" : ""}`;
}

function getRecurrenceStateLabel(task: {
  schedule: { nextDueAt: Date | null } | null;
  occurrences: Array<{ status: string; dueAt: Date; completedAt?: Date | null }>;
}) {
  const openOccurrence = getOpenOccurrence(task.occurrences);
  const dueAt = openOccurrence?.dueAt ?? task.schedule?.nextDueAt;
  if (!dueAt) {
    return "Scheduled";
  }

  const now = new Date();
  const dueTime = dueAt.getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = today + (24 * 60 * 60 * 1000);

  if (dueTime < now.getTime()) {
    return "Lapsed";
  }
  if (dueTime >= today && dueTime < tomorrow) {
    return "Due today";
  }
  return "On track";
}

function recurrenceStateClassName(task: {
  schedule: { nextDueAt: Date | null } | null;
  occurrences: Array<{ status: string; dueAt: Date; completedAt?: Date | null }>;
}) {
  const label = getRecurrenceStateLabel(task);
  if (label === "Lapsed") {
    return "task-chip-lapsed";
  }
  if (label === "Due today") {
    return "task-chip-due";
  }
  return "task-chip-recurring";
}

function wasOccurrenceOnTime(occurrence: { dueAt?: Date; completedAt?: Date | null }) {
  if (!occurrence.dueAt || !occurrence.completedAt) {
    return true;
  }
  return occurrence.completedAt.getTime() <= occurrence.dueAt.getTime();
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
