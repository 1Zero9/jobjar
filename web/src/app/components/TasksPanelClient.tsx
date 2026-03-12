"use client";

import { deleteTaskAction, luckyDipAction, updateRecordedTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { useEffect, useMemo, useState } from "react";

type PersonOption = {
  id: string;
  displayName: string;
};

type RoomOption = {
  id: string;
  name: string;
  designation?: string | null;
  location?: { id: string; name: string } | null;
};

type LocationOption = {
  id: string;
  name: string;
};

type TaskItem = {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  locationId: string | null;
  locationName: string | null;
  loggerName: string | null;
  projectParentTitle: string | null;
  assignmentUserId: string | null;
  assignmentUserName: string | null;
  detailNotes: string | null;
  priority: number;
  captureStage: string;
  createdAt: string;
  schedule: {
    recurrenceType: string;
    intervalCount: number;
    nextDueAt: string | null;
  } | null;
  occurrences: Array<{
    status: string;
    dueAt: string;
    completedAt: string | null;
    completedBy: string | null;
    completerName: string | null;
  }>;
};

type Props = {
  roomOptions: RoomOption[];
  peopleOptions: PersonOption[];
  locationOptions: LocationOption[];
  tasks: TaskItem[];
  initialRoomId: string;
  initialAssigneeId: string;
  initialLocationId: string;
  initialState: "all" | "open" | "done";
  initialLuckyId: string | null;
};

export function TasksPanelClient({
  roomOptions,
  peopleOptions,
  locationOptions,
  tasks,
  initialRoomId,
  initialAssigneeId,
  initialLocationId,
  initialState,
  initialLuckyId,
}: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(initialAssigneeId);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [selectedState, setSelectedState] = useState<"all" | "open" | "done">(initialState);

  const groupedRoomOptions = groupRoomsByLocation(roomOptions);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesRoom = selectedRoomId ? task.roomId === selectedRoomId : true;
      const matchesAssignee = selectedAssigneeId ? task.assignmentUserId === selectedAssigneeId : true;
      const matchesLocation = selectedLocationId ? task.locationId === selectedLocationId : true;
      const taskState = getTaskState(task);
      const matchesState = selectedState === "all" ? true : taskState === selectedState;
      return matchesRoom && matchesAssignee && matchesLocation && matchesState;
    });
  }, [selectedAssigneeId, selectedRoomId, selectedLocationId, selectedState, tasks]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (selectedRoomId) {
      search.set("room", selectedRoomId);
    } else {
      search.delete("room");
    }
    if (selectedAssigneeId) {
      search.set("assignee", selectedAssigneeId);
    } else {
      search.delete("assignee");
    }
    if (selectedLocationId) {
      search.set("location", selectedLocationId);
    } else {
      search.delete("location");
    }
    if (selectedState !== "all") {
      search.set("state", selectedState);
    } else {
      search.delete("state");
    }
    const query = search.toString();
    const nextUrl = query ? `/tasks?${query}` : "/tasks";
    window.history.replaceState(null, "", nextUrl);
  }, [selectedAssigneeId, selectedRoomId, selectedLocationId, selectedState]);

  return (
    <section id="recorded" className="recorded-panel">
      <div className="recorded-header">
        <div>
          <p className="capture-kicker">Tasks</p>
          <h2 className="recorded-title">Logged tasks</h2>
        </div>
        <span className="recorded-count">{visibleTasks.length}</span>
      </div>

      <div className="recorded-toolbar">
        <div className="recorded-filter-bar">
          {locationOptions.length > 1 ? (
            <label className="recorded-filter-field">
              <span>Location</span>
              <select
                value={selectedLocationId}
                onChange={(event) => { setSelectedLocationId(event.target.value); setSelectedAssigneeId(""); }}
                className={`recorded-filter-select${selectedLocationId ? " filter-active" : ""}`}
              >
                <option value="">All locations</option>
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="recorded-filter-field">
            <span>Room</span>
            <select
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(event.target.value)}
              className={`recorded-filter-select${selectedRoomId ? " filter-active" : ""}`}
            >
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
            <select
              value={selectedState}
              onChange={(event) => setSelectedState(event.target.value as "all" | "open" | "done")}
              className={`recorded-filter-select${selectedState !== "all" ? " filter-active" : ""}`}
            >
              <option value="all">All states</option>
              <option value="open">Open</option>
              <option value="done">Completed</option>
            </select>
          </label>
          <label className="recorded-filter-field">
            <span>Assigned</span>
            <select
              value={selectedAssigneeId}
              onChange={(event) => setSelectedAssigneeId(event.target.value)}
              className={`recorded-filter-select${selectedAssigneeId ? " filter-active" : ""}`}
            >
              <option value="">Anyone</option>
              {peopleOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="recorded-toolbar-actions">
          {selectedRoomId || selectedAssigneeId || selectedLocationId || selectedState !== "all" ? (
            <button
              type="button"
              className="action-btn subtle quiet"
              onClick={() => {
                setSelectedRoomId("");
                setSelectedAssigneeId("");
                setSelectedLocationId("");
                setSelectedState("all");
              }}
            >
              Clear filters
            </button>
          ) : (
            <span className="recorded-toolbar-hint">Filters update instantly.</span>
          )}

          <form action={luckyDipAction}>
            <input type="hidden" name="returnTo" value="/tasks" />
            <FormActionButton className="action-btn subtle quiet" pendingLabel="Choosing task">
              Lucky dip
            </FormActionButton>
          </form>
        </div>
      </div>

      <div className="recorded-list">
        {visibleTasks.length === 0 ? (
          <p className="recorded-empty">
            {selectedRoomId || selectedAssigneeId || selectedState !== "all"
              ? "No tasks match these filters."
              : "No tasks recorded yet."}
          </p>
        ) : (
          visibleTasks.map((task) => (
            <details
              key={task.id}
              id={`task-${task.id}`}
              className={`recorded-row ${rowStateClass(task)}`}
              open={task.id === initialLuckyId}
            >
              <summary className="recorded-row-summary">
                <div className="recorded-row-top">
                  <p className="recorded-row-title">{task.title}</p>
                  <span className="recorded-row-chevron">▾</span>
                </div>
                <div className="recorded-row-sub">
                  <span className="recorded-row-room">{displayRoomName(task.roomName)}</span>
                  {task.assignmentUserName ? (
                    <span className="recorded-row-assignee">
                      <span className="assignee-avatar" style={nameToAvatarStyle(task.assignmentUserName)}>
                        {nameInitials(task.assignmentUserName)}
                      </span>
                      {task.assignmentUserName}
                    </span>
                  ) : (
                    <span className="assignee-unset">Unassigned</span>
                  )}
                  {getTaskState(task) === "done" ? <span className="task-chip task-chip-done">Done</span> : null}
                  {recurrenceStateClassName(task) === "task-chip-lapsed" ? <span className="task-chip task-chip-lapsed">Lapsed</span> : null}
                  {recurrenceStateClassName(task) === "task-chip-due" ? <span className="task-chip task-chip-due">Due today</span> : null}
                  {task.projectParentTitle ? <span className="task-chip">↳ {task.projectParentTitle}</span> : null}
                  {task.schedule && computeStreak(task.occurrences) >= 2 ? (
                    <span className="task-chip task-chip-streak">{computeStreak(task.occurrences)} in a row</span>
                  ) : null}
                </div>
              </summary>

              <div className="recorded-row-detail">
                <form action={updateRecordedTaskAction} className="recorded-edit-form">
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="returnTo" value="/tasks" />

                  <label className="recorded-field">
                    <span>Task</span>
                    <input name="title" type="text" defaultValue={task.title} className="recorded-edit-input" />
                  </label>

                  <label className="recorded-field">
                    <span>Room</span>
                    <select name="roomId" defaultValue={task.roomName.toLowerCase() === "unsorted" ? "" : task.roomId} className="recorded-edit-input">
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
                    <select name="assigneeUserId" defaultValue={task.assignmentUserId ?? ""} className="recorded-edit-input">
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

                  {task.loggerName ? <p><span>Logged by</span><strong>{task.loggerName}</strong></p> : null}
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
                  {getLatestCompletedOccurrence(task.occurrences)?.completerName ? (
                    <p><span>Completed by</span><strong>{getLatestCompletedOccurrence(task.occurrences)!.completerName}</strong></p>
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
  );
}


const AVATAR_PALETTE = [
  { bg: "#dbeafe", fg: "#1e40af" }, // blue
  { bg: "#ede9fe", fg: "#5b21b6" }, // violet
  { bg: "#d1fae5", fg: "#065f46" }, // mint
  { bg: "#fef3c7", fg: "#92400e" }, // amber
  { bg: "#fee2e2", fg: "#991b1b" }, // red
  { bg: "#e0f2fe", fg: "#075985" }, // sky
  { bg: "#fce7f3", fg: "#9d174d" }, // rose
  { bg: "#f1f5f9", fg: "#334155" }, // slate
];

function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function nameToAvatarStyle(name: string): { background: string; color: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const entry = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  return { background: entry.bg, color: entry.fg };
}

function formatRecordedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getTaskState(task: { captureStage: string; occurrences: Array<{ status: string }> }) {
  if (task.captureStage === "done" || task.occurrences[0]?.status === "done") {
    return "done";
  }
  return "open";
}

function getLatestCompletedOccurrence<T extends { status: string; completedAt?: string | null; completedBy?: string | null; completerName?: string | null; dueAt?: string }>(
  occurrences: T[],
) {
  return occurrences.find((occurrence) => occurrence.status === "done") ?? null;
}

function getOpenOccurrence<T extends { status: string; dueAt: string }>(occurrences: T[]) {
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
  schedule: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string; dueAt: string }>;
}) {
  const openOccurrence = getOpenOccurrence(task.occurrences);
  const dueAt = openOccurrence?.dueAt ?? task.schedule?.nextDueAt;
  if (!dueAt) {
    return "Scheduled";
  }

  const now = new Date();
  const dueTime = new Date(dueAt).getTime();
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
  schedule: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string; dueAt: string }>;
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

function wasOccurrenceOnTime(occurrence: { dueAt?: string; completedAt?: string | null }) {
  if (!occurrence.dueAt || !occurrence.completedAt) {
    return true;
  }
  return new Date(occurrence.completedAt).getTime() <= new Date(occurrence.dueAt).getTime();
}

function rowStateClass(task: {
  captureStage: string;
  occurrences: Array<{ status: string; dueAt: string }>;
  schedule: { nextDueAt: string | null } | null;
  assignmentUserId: string | null;
}): string {
  if (getTaskState(task) === "done") return "row-state-done";
  const stateClass = recurrenceStateClassName(task);
  if (stateClass === "task-chip-lapsed") return "row-state-overdue";
  if (stateClass === "task-chip-due") return "row-state-due";
  if (task.schedule) return "row-state-active";
  if (!task.assignmentUserId) return "row-state-unassigned";
  return "row-state-assigned";
}

function computeStreak(occurrences: Array<{ status: string }>) {
  let streak = 0;
  for (const occ of occurrences) {
    if (occ.status === "done") streak++;
    else break;
  }
  return streak;
}

function displayRoomName(roomName: string) {
  return roomName.toLowerCase() === "unsorted" ? "No room" : roomName;
}

function groupRoomsByLocation<T extends { location?: { name: string } | null; name: string }>(rooms: T[]) {
  const grouped = new Map<string, T[]>();
  for (const room of rooms) {
    const key = room.location?.name ?? "Other";
    const entries = grouped.get(key) ?? [];
    entries.push(room);
    grouped.set(key, entries);
  }
  return [...grouped.entries()];
}
