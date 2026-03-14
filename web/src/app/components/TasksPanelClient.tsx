"use client";

import type { MemberAudience } from "@prisma/client";
import {
  completeTaskAction,
  createProjectChildTaskAction,
  createProjectCostAction,
  createProjectMaterialAction,
  createProjectMilestoneAction,
  deleteProjectCostAction,
  deleteProjectMaterialAction,
  deleteProjectMilestoneAction,
  deleteTaskAction,
  luckyDipAction,
  promoteTaskToProjectAction,
  reopenTaskAction,
  startTaskAction,
  toggleProjectMaterialPurchasedAction,
  toggleProjectMilestoneAction,
  updateProjectPlanAction,
  updateRecordedTaskAction,
} from "@/app/actions";
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
  projectParentId: string | null;
  projectParentTitle: string | null;
  assignmentUserId: string | null;
  assignmentUserName: string | null;
  detailNotes: string | null;
  priority: number;
  isPrivate: boolean;
  jobKind: string;
  captureStage: string;
  createdAt: string;
  estimatedMinutes: number;
  projectTargetAt: string | null;
  projectBudgetCents: number | null;
  projectChildren: Array<{
    id: string;
    title: string;
    captureStage: string;
    estimatedMinutes: number;
    assignmentUserName: string | null;
    nextDueAt: string | null;
    occurrences: Array<{
      status: string;
      dueAt: string;
    }>;
  }>;
  projectCosts: Array<{
    id: string;
    title: string;
    amountCents: number;
    notedAt: string;
  }>;
  projectMaterials: Array<{
    id: string;
    title: string;
    quantityLabel: string | null;
    source: string | null;
    estimatedCostCents: number | null;
    actualCostCents: number | null;
    purchasedAt: string | null;
  }>;
  projectMilestones: Array<{
    id: string;
    title: string;
    targetAt: string | null;
    completedAt: string | null;
    sortOrder: number;
  }>;
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
  audienceBand: MemberAudience;
  initialRoomId: string;
  initialAssigneeId: string;
  initialLocationId: string;
  initialState: "all" | "open" | "done";
  initialLuckyId: string | null;
  initialProjectState?: ProjectFilterState;
  canEditTasks: boolean;
  canManageProjects: boolean;
  canDeleteTasks: boolean;
  basePath?: string;
  viewMode?: "tasks" | "projects";
  panelTitle?: string;
  panelKicker?: string;
  emptyMessage?: string;
};

type ProjectFilterState = "all" | "planning" | "active" | "complete" | "over_budget" | "at_risk";

export function TasksPanelClient({
  roomOptions,
  peopleOptions,
  locationOptions,
  tasks,
  audienceBand,
  initialRoomId,
  initialAssigneeId,
  initialLocationId,
  initialState,
  initialLuckyId,
  initialProjectState = "all",
  canEditTasks,
  canManageProjects,
  canDeleteTasks,
  basePath = "/tasks",
  viewMode = "tasks",
  panelTitle = "Task board",
  panelKicker = "Tasks",
  emptyMessage = "No tasks on the board yet.",
}: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(initialAssigneeId);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [selectedState, setSelectedState] = useState<"all" | "open" | "done">(initialState);
  const [selectedProjectState, setSelectedProjectState] = useState<ProjectFilterState>(initialProjectState);

  const groupedRoomOptions = groupRoomsByLocation(roomOptions);
  const projectMode = viewMode === "projects";
  const childMode = audienceBand === "under_12";
  const teenMode = audienceBand === "teen_12_18";

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesRoom = selectedRoomId ? task.roomId === selectedRoomId : true;
      const matchesAssignee = selectedAssigneeId ? task.assignmentUserId === selectedAssigneeId : true;
      const matchesLocation = selectedLocationId ? task.locationId === selectedLocationId : true;
      const taskState = getTaskState(task);
      const matchesState = selectedState === "all" ? true : taskState === selectedState;
      const matchesProjectState = projectMode ? projectMatchesFilter(task, selectedProjectState) : true;
      return matchesRoom && matchesAssignee && matchesLocation && matchesState && matchesProjectState;
    });
  }, [projectMode, selectedAssigneeId, selectedProjectState, selectedRoomId, selectedLocationId, selectedState, tasks]);

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
    if (projectMode && selectedProjectState !== "all") {
      search.set("projectState", selectedProjectState);
    } else {
      search.delete("projectState");
    }
    const query = search.toString();
    const nextUrl = query ? `${basePath}?${query}` : basePath;
    window.history.replaceState(null, "", nextUrl);
  }, [basePath, projectMode, selectedAssigneeId, selectedProjectState, selectedRoomId, selectedLocationId, selectedState]);

  return (
    <section id="recorded" className="recorded-panel">
      <div className="recorded-header">
        <div>
          <p className="capture-kicker">{panelKicker}</p>
          <h2 className="recorded-title">{panelTitle}</h2>
        </div>
        <span className="recorded-count">{visibleTasks.length}</span>
      </div>

      <div className="recorded-toolbar">
        <div className="recorded-filter-bar">
          {!childMode && locationOptions.length > 1 ? (
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
          {!childMode ? (
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
          ) : null}
          <label className="recorded-filter-field">
            <span>{childMode ? "Show" : "State"}</span>
            <select
              value={selectedState}
              onChange={(event) => setSelectedState(event.target.value as "all" | "open" | "done")}
              className={`recorded-filter-select${selectedState !== "all" ? " filter-active" : ""}`}
            >
              <option value="all">{childMode ? "Everything" : "All states"}</option>
              <option value="open">{childMode ? "Ready to do" : "Open"}</option>
              <option value="done">{childMode ? "Finished" : "Completed"}</option>
            </select>
          </label>
          {!childMode ? (
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
          ) : null}
          {projectMode && !childMode ? (
            <label className="recorded-filter-field">
              <span>Project state</span>
              <select
                value={selectedProjectState}
                onChange={(event) => setSelectedProjectState(event.target.value as ProjectFilterState)}
                className={`recorded-filter-select${selectedProjectState !== "all" ? " filter-active" : ""}`}
              >
                <option value="all">All projects</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="at_risk">At risk</option>
                <option value="complete">Complete</option>
                <option value="over_budget">Over budget</option>
              </select>
            </label>
          ) : null}
        </div>

        <div className="recorded-toolbar-actions">
          {selectedRoomId || selectedAssigneeId || selectedLocationId || selectedState !== "all" || (projectMode && selectedProjectState !== "all") ? (
            <button
              type="button"
              className="action-btn subtle quiet"
              onClick={() => {
                setSelectedRoomId("");
                setSelectedAssigneeId("");
                setSelectedLocationId("");
                setSelectedState("all");
                setSelectedProjectState("all");
              }}
            >
              {childMode ? "Reset view" : "Clear filters"}
            </button>
          ) : (
            <span className="recorded-toolbar-hint">{childMode ? "Your jobs update right away." : "Filters update instantly."}</span>
          )}

          {!projectMode && !childMode && canEditTasks ? (
            <form action={luckyDipAction}>
              <input type="hidden" name="returnTo" value="/tasks" />
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Choosing task">
                {teenMode ? "Pick one" : "Lucky dip"}
              </FormActionButton>
            </form>
          ) : null}
        </div>
      </div>

      <div className="recorded-list">
        {visibleTasks.length === 0 ? (
          <p className="recorded-empty">
            {selectedRoomId || selectedAssigneeId || selectedState !== "all" || (projectMode && selectedProjectState !== "all")
              ? childMode ? "No jobs match this view." : "No tasks match these filters."
              : emptyMessage}
          </p>
        ) : (
          visibleTasks.map((task) => {
            const latestCompleted = getLatestCompletedOccurrence(task.occurrences);
            const isProject = isProjectTask(task);
            const projectSummary = summarizeProject(task);

            return (
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
                    {task.locationName ? (
                      <span className="recorded-row-location">{task.locationName}</span>
                    ) : null}
                    <span className="recorded-row-room">{displayRoomName(task.roomName)}</span>
                    {task.assignmentUserName && !childMode ? (
                      <span className="recorded-row-assignee">
                        <span className="assignee-avatar" style={nameToAvatarStyle(task.assignmentUserName)}>
                          {nameInitials(task.assignmentUserName)}
                        </span>
                        {task.assignmentUserName}
                      </span>
                    ) : (
                      !childMode ? <span className="assignee-unset">Unassigned</span> : null
                    )}
                    {!childMode ? <span className="task-chip task-chip-kind">{formatJobKind(task.jobKind)}</span> : null}
                    {getTaskState(task) === "done" ? <span className="task-chip task-chip-done">{childMode ? "Finished" : "Done"}</span> : null}
                    {recurrenceStateClassName(task) === "task-chip-lapsed" ? <span className="task-chip task-chip-lapsed">{childMode ? "Needs attention" : "Lapsed"}</span> : null}
                    {recurrenceStateClassName(task) === "task-chip-due" ? <span className="task-chip task-chip-due">{childMode ? "Due today" : "Due today"}</span> : null}
                    {task.isPrivate && !childMode ? <span className="task-chip task-chip-private">Private</span> : null}
                    {task.projectParentTitle ? <span className="task-chip">↳ {task.projectParentTitle}</span> : null}
                    {isProject ? <span className="task-chip task-chip-streak">{projectSummary.progressLabel}</span> : null}
                    {isProject && projectSummary.atRisk ? <span className="task-chip task-chip-lapsed">At risk</span> : null}
                    {isProject && !projectSummary.atRisk && projectSummary.overBudget ? <span className="task-chip task-chip-due">Over budget</span> : null}
                    {isProject && projectSummary.milestoneLabel ? <span className="task-chip">{projectSummary.milestoneLabel}</span> : null}
                    {task.schedule && computeStreak(task.occurrences) >= 2 ? (
                      <span className="task-chip task-chip-streak">{computeStreak(task.occurrences)} in a row</span>
                    ) : null}
                  </div>
                </summary>

                <div className="recorded-row-detail">
                  {childMode ? (
                    <section className="kid-task-panel">
                      {task.detailNotes ? (
                        <p className="kid-task-copy">{task.detailNotes}</p>
                      ) : (
                        <p className="kid-task-copy">Pick this job up when you are ready.</p>
                      )}
                      <div className="kid-task-meta">
                        <p><span>Where</span><strong>{displayRoomName(task.roomName)}</strong></p>
                        <p><span>Status</span><strong>{getTaskState(task) === "done" ? "Finished" : task.captureStage === "active" ? "In progress" : "Ready to go"}</strong></p>
                        {task.schedule?.nextDueAt ? <p><span>Due</span><strong>{formatRecordedAt(task.schedule.nextDueAt)}</strong></p> : null}
                        {latestCompleted?.completedAt ? <p><span>Last finished</span><strong>{formatRecordedAt(latestCompleted.completedAt)}</strong></p> : null}
                      </div>
                      <div className="recorded-row-actions kid-task-actions">
                        {getTaskState(task) === "done" ? (
                          canEditTasks ? (
                          <form action={reopenTaskAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <FormActionButton className="action-btn subtle quiet" pendingLabel="Opening">
                              Not done yet
                            </FormActionButton>
                          </form>
                          ) : null
                        ) : (
                          canEditTasks ? (
                          <>
                            {task.captureStage !== "active" ? (
                              <form action={startTaskAction}>
                                <input type="hidden" name="taskId" value={task.id} />
                                <FormActionButton className="action-btn subtle quiet" pendingLabel="Starting">
                                  Start job
                                </FormActionButton>
                              </form>
                            ) : null}
                            <form action={completeTaskAction}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <input type="hidden" name="note" value="" />
                              <FormActionButton className="action-btn bright quiet" pendingLabel="Finishing">
                                I finished this
                              </FormActionButton>
                            </form>
                          </>
                          ) : null
                        )}
                      </div>
                    </section>
                  ) : (
                    <>
                      <section className="task-overview-panel">
                        {task.detailNotes ? (
                          <p className="task-overview-copy">{task.detailNotes}</p>
                        ) : (
                          <p className="task-overview-copy">{teenMode ? "Use the quick actions below or open details if this needs tidying." : "Use the quick actions below, then open details only if the task needs updating."}</p>
                        )}

                        <div className="task-overview-grid">
                          <p><span>Where</span><strong>{task.locationName ? `${task.locationName} · ${displayRoomName(task.roomName)}` : displayRoomName(task.roomName)}</strong></p>
                          <p><span>Assigned</span><strong>{task.assignmentUserName ?? "No one yet"}</strong></p>
                          <p><span>Status</span><strong>{getTaskStatusLabel(task)}</strong></p>
                          <p><span>Estimate</span><strong>{formatMinutes(task.estimatedMinutes)}</strong></p>
                          {task.schedule ? (
                            <>
                              <p><span>Repeats</span><strong>{formatRecurrenceChip(task.schedule)}</strong></p>
                              <p><span>Next due</span><strong>{task.schedule.nextDueAt ? formatRecordedAt(task.schedule.nextDueAt) : "Not set"}</strong></p>
                            </>
                          ) : null}
                          {latestCompleted?.completedAt ? (
                            <p><span>Last done</span><strong>{formatRecordedAt(latestCompleted.completedAt)}</strong></p>
                          ) : null}
                          {task.loggerName ? <p><span>Logged by</span><strong>{task.loggerName}</strong></p> : null}
                          <p><span>Recorded</span><strong>{formatRecordedAt(task.createdAt)}</strong></p>
                        </div>

                        {canEditTasks ? (
                        <div className="recorded-row-actions task-overview-actions">
                          {getTaskState(task) === "done" ? (
                            <form action={reopenTaskAction}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <FormActionButton className="action-btn subtle quiet" pendingLabel="Opening">
                                Reopen
                              </FormActionButton>
                            </form>
                          ) : (
                            <>
                              {task.captureStage !== "active" ? (
                                <form action={startTaskAction}>
                                  <input type="hidden" name="taskId" value={task.id} />
                                  <FormActionButton className="action-btn subtle quiet" pendingLabel="Starting">
                                    {teenMode ? "Start job" : "Start task"}
                                  </FormActionButton>
                                </form>
                              ) : null}
                              <form action={completeTaskAction}>
                                <input type="hidden" name="taskId" value={task.id} />
                                <input type="hidden" name="note" value="" />
                                <FormActionButton className="action-btn bright quiet" pendingLabel="Finishing">
                                  {teenMode ? "Finish job" : "Mark done"}
                                </FormActionButton>
                              </form>
                            </>
                          )}
                          {!isProject && canManageProjects ? (
                            <form action={promoteTaskToProjectAction}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <input type="hidden" name="returnTo" value={basePath} />
                              <FormActionButton className="action-btn subtle quiet" pendingLabel="Promoting">
                                Promote to project
                              </FormActionButton>
                            </form>
                          ) : null}
                          {canDeleteTasks ? (
                            <form action={deleteTaskAction}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <FormActionButton className="action-btn warn quiet" pendingLabel="Archiving">
                                Archive task
                              </FormActionButton>
                            </form>
                          ) : null}
                        </div>
                        ) : (
                          <p className="task-readonly-note">Read-only access. Open the task details to review more information.</p>
                        )}
                      </section>

                      {canEditTasks ? (
                      <details className="recorded-more-details task-manage-details">
                        <summary className="recorded-more-summary">{teenMode ? "Manage this job" : "Manage task details"}</summary>
                        <form action={updateRecordedTaskAction} className="recorded-edit-form">
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={basePath} />

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

                          <label className="recorded-field recorded-field-toggle">
                            <span>Private</span>
                            <span className="recorded-toggle-wrap">
                              <input type="checkbox" name="isPrivate" value="true" defaultChecked={task.isPrivate} className="recorded-toggle-check" />
                              <input type="hidden" name="isPrivate" value="false" />
                              <span className="recorded-toggle-hint">Only visible to you and the assigned person</span>
                            </span>
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
                                  defaultValue={latestCompleted?.completedBy ?? ""}
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
                                defaultValue={toDateTimeInputValue(latestCompleted?.completedAt ?? task.createdAt)}
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

                          {latestCompleted?.completedAt && latestCompleted?.dueAt ? (
                            <p><span>Completed</span><strong>{wasOccurrenceOnTime(latestCompleted) ? "On time" : "Late"}</strong></p>
                          ) : null}
                          {latestCompleted?.completerName ? (
                            <p><span>Completed by</span><strong>{latestCompleted.completerName}</strong></p>
                          ) : null}
                          <div className="recorded-row-actions between">
                            <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                              Save changes
                            </FormActionButton>
                          </div>
                        </form>
                      </details>
                      ) : null}
                    </>
                  )}

                  {!childMode && isProject ? (
                    <section className="rounded-xl border border-border bg-surface p-3 project-panel">
                      <div className="room-setup-header">
                        <div>
                          <p className="settings-kicker">Project</p>
                          <h3 className="recorded-title">Plan and rollout</h3>
                        </div>
                        <span className="recorded-count">{projectSummary.progressLabel}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <p><span>Target</span><strong>{task.projectTargetAt ? formatRecordedAt(task.projectTargetAt) : "Not set"}</strong></p>
                        <p><span>Budget</span><strong>{task.projectBudgetCents !== null ? formatMoney(task.projectBudgetCents) : "Not set"}</strong></p>
                        <p><span>Actual spend</span><strong>{formatMoney(projectSummary.spentCents)}</strong></p>
                        <p><span>Total estimate</span><strong>{formatMinutes(projectSummary.totalEstimatedMinutes)}</strong></p>
                        <p><span>Materials estimate</span><strong>{projectSummary.materialEstimateCents > 0 ? formatMoney(projectSummary.materialEstimateCents) : "Not set"}</strong></p>
                        <p><span>Shopping progress</span><strong>{projectSummary.materialsLabel ?? "No materials"}</strong></p>
                      </div>

                      {canManageProjects ? (
                        <details className="recorded-more-details project-manage-details">
                          <summary className="recorded-more-summary">Project actions</summary>
                          <div className="project-manage-stack">
                            <details className="recorded-more-details">
                              <summary className="recorded-more-summary">Update plan</summary>
                              <form action={updateProjectPlanAction} className="recorded-edit-form">
                                <input type="hidden" name="taskId" value={task.id} />
                                <input type="hidden" name="returnTo" value={basePath} />
                                <label className="recorded-field">
                                  <span>Target date</span>
                                  <input
                                    name="projectTargetAt"
                                    type="datetime-local"
                                    defaultValue={task.projectTargetAt ? toDateTimeInputValue(task.projectTargetAt) : ""}
                                    className="recorded-edit-input"
                                  />
                                </label>
                                <label className="recorded-field">
                                  <span>Budget amount</span>
                                  <input
                                    name="projectBudget"
                                    type="text"
                                    inputMode="decimal"
                                    defaultValue={task.projectBudgetCents !== null ? centsToInputValue(task.projectBudgetCents) : ""}
                                    placeholder="250.00"
                                    className="recorded-edit-input"
                                  />
                                </label>
                                <label className="recorded-field">
                                  <span>Estimate minutes</span>
                                  <input
                                    name="estimatedMinutes"
                                    type="number"
                                    min={1}
                                    defaultValue={task.estimatedMinutes}
                                    className="recorded-edit-input"
                                  />
                                </label>
                                <div className="recorded-row-actions between">
                                  <FormActionButton className="action-btn bright quiet" pendingLabel="Saving plan">
                                    Save project plan
                                  </FormActionButton>
                                </div>
                              </form>
                            </details>

                            <details className="recorded-more-details">
                              <summary className="recorded-more-summary">Add project step</summary>
                              <form action={createProjectChildTaskAction} className="recorded-edit-form">
                                <input type="hidden" name="projectId" value={task.id} />
                                <input type="hidden" name="returnTo" value={basePath} />
                                <label className="recorded-field">
                                  <span>Step title</span>
                                  <input name="title" type="text" required placeholder="Patch walls" className="recorded-edit-input" />
                                </label>
                                <label className="recorded-field">
                                  <span>Notes</span>
                                  <input name="detailNotes" type="text" placeholder="Optional detail" className="recorded-edit-input" />
                                </label>
                                <div className="capture-meta-grid">
                                  <label className="recorded-field">
                                    <span>Assign</span>
                                    <select name="assigneeUserId" defaultValue="" className="recorded-edit-input">
                                      <option value="">No person</option>
                                      {peopleOptions.map((person) => (
                                        <option key={person.id} value={person.id}>
                                          {person.displayName}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="recorded-field">
                                    <span>Estimate minutes</span>
                                    <input name="estimatedMinutes" type="number" min={1} defaultValue={30} className="recorded-edit-input" />
                                  </label>
                                </div>
                                <label className="recorded-field">
                                  <span>Due date</span>
                                  <input name="dueAt" type="datetime-local" className="recorded-edit-input" />
                                </label>
                                <div className="recorded-row-actions between">
                                  <FormActionButton className="action-btn bright quiet" pendingLabel="Adding step">
                                    Add project step
                                  </FormActionButton>
                                </div>
                              </form>
                            </details>

                            <details className="recorded-more-details">
                              <summary className="recorded-more-summary">Add spend or shopping</summary>
                              <div className="project-manage-stack">
                                <form action={createProjectCostAction} className="recorded-edit-form">
                                  <input type="hidden" name="taskId" value={task.id} />
                                  <input type="hidden" name="returnTo" value={basePath} />
                                  <label className="recorded-field">
                                    <span>Cost line</span>
                                    <input name="title" type="text" required placeholder="Paint order" className="recorded-edit-input" />
                                  </label>
                                  <label className="recorded-field">
                                    <span>Amount</span>
                                    <input name="amount" type="text" inputMode="decimal" required placeholder="48.90" className="recorded-edit-input" />
                                  </label>
                                  <div className="recorded-row-actions between">
                                    <FormActionButton className="action-btn bright quiet" pendingLabel="Adding cost">
                                      Add cost
                                    </FormActionButton>
                                  </div>
                                </form>

                                <form action={createProjectMaterialAction} className="recorded-edit-form">
                                  <input type="hidden" name="taskId" value={task.id} />
                                  <input type="hidden" name="returnTo" value={basePath} />
                                  <label className="recorded-field">
                                    <span>Material item</span>
                                    <input name="title" type="text" required placeholder="Wall paint" className="recorded-edit-input" />
                                  </label>
                                  <div className="capture-meta-grid">
                                    <label className="recorded-field">
                                      <span>Quantity</span>
                                      <input name="quantityLabel" type="text" placeholder="2 tins" className="recorded-edit-input" />
                                    </label>
                                    <label className="recorded-field">
                                      <span>Estimated cost</span>
                                      <input name="estimatedCost" type="text" inputMode="decimal" placeholder="65.00" className="recorded-edit-input" />
                                    </label>
                                  </div>
                                  <label className="recorded-field">
                                    <span>Store or source</span>
                                    <input name="source" type="text" placeholder="Woodies" className="recorded-edit-input" />
                                  </label>
                                  <div className="recorded-row-actions between">
                                    <FormActionButton className="action-btn bright quiet" pendingLabel="Adding material">
                                      Add material
                                    </FormActionButton>
                                  </div>
                                </form>
                              </div>
                            </details>

                            <details className="recorded-more-details">
                              <summary className="recorded-more-summary">Add milestone</summary>
                              <form action={createProjectMilestoneAction} className="recorded-edit-form">
                                <input type="hidden" name="taskId" value={task.id} />
                                <input type="hidden" name="returnTo" value={basePath} />
                                <label className="recorded-field">
                                  <span>Milestone</span>
                                  <input name="title" type="text" required placeholder="Materials ordered" className="recorded-edit-input" />
                                </label>
                                <label className="recorded-field">
                                  <span>Target date</span>
                                  <input name="targetAt" type="datetime-local" className="recorded-edit-input" />
                                </label>
                                <div className="recorded-row-actions between">
                                  <FormActionButton className="action-btn bright quiet" pendingLabel="Adding milestone">
                                    Add milestone
                                  </FormActionButton>
                                </div>
                              </form>
                            </details>
                          </div>
                        </details>
                      ) : null}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <p><span>Project state</span><strong>{projectSummary.statusLabel}</strong></p>
                        <p><span>Milestones</span><strong>{projectSummary.milestoneLabel ?? "No milestones"}</strong></p>
                        <p><span>Overdue project steps</span><strong>{projectSummary.overdueChildren}</strong></p>
                        <p><span>Spend vs budget</span><strong>{formatSpendSummary(projectSummary.spentCents, task.projectBudgetCents)}</strong></p>
                        <p><span>Materials</span><strong>{projectSummary.materialsLabel ?? "No materials"}</strong></p>
                        <p><span>Bought materials</span><strong>{projectSummary.materialSpendLabel}</strong></p>
                      </div>

                      <details className="recorded-more-details project-collection-details">
                        <summary className="recorded-more-summary">Materials and shopping ({task.projectMaterials.length})</summary>
                        {task.projectMaterials.length === 0 ? (
                          <p className="recorded-empty">No materials yet.</p>
                        ) : (
                          task.projectMaterials.map((material) => (
                            <div key={material.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground">{material.title}</p>
                                  <p className="text-muted">
                                    {[
                                      material.quantityLabel,
                                      material.source,
                                      material.purchasedAt ? `Bought ${formatRecordedAt(material.purchasedAt)}` : "Still to buy",
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {material.estimatedCostCents !== null ? (
                                    <span className="task-chip">Est. {formatMoney(material.estimatedCostCents)}</span>
                                  ) : null}
                                  {material.actualCostCents !== null ? (
                                    <span className="task-chip task-chip-done">Paid {formatMoney(material.actualCostCents)}</span>
                                  ) : null}
                                  <span className={`task-chip ${material.purchasedAt ? "task-chip-done" : ""}`}>
                                    {material.purchasedAt ? "Bought" : "Open"}
                                  </span>
                                </div>
                              </div>

                              {canManageProjects ? (
                                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                  <form action={toggleProjectMaterialPurchasedAction} className="flex flex-wrap items-center gap-2">
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input type="hidden" name="materialId" value={material.id} />
                                    <input type="hidden" name="returnTo" value={basePath} />
                                    {!material.purchasedAt ? (
                                      <>
                                        <input
                                          name="source"
                                          type="text"
                                          defaultValue={material.source ?? ""}
                                          placeholder="Store"
                                          className="recorded-edit-input w-32"
                                        />
                                        <input
                                          name="actualCost"
                                          type="text"
                                          inputMode="decimal"
                                          defaultValue={material.actualCostCents !== null ? centsToInputValue(material.actualCostCents) : ""}
                                          placeholder="Actual cost"
                                          className="recorded-edit-input w-32"
                                        />
                                      </>
                                    ) : null}
                                    <FormActionButton className="action-btn subtle quiet" pendingLabel="Saving">
                                      {material.purchasedAt ? "Reopen" : "Mark bought"}
                                    </FormActionButton>
                                  </form>
                                  <form action={deleteProjectMaterialAction}>
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input type="hidden" name="materialId" value={material.id} />
                                    <input type="hidden" name="returnTo" value={basePath} />
                                    <FormActionButton className="action-btn subtle quiet" pendingLabel="Removing">
                                      Remove
                                    </FormActionButton>
                                  </form>
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </details>

                      <details className="recorded-more-details project-collection-details">
                        <summary className="recorded-more-summary">Milestones ({task.projectMilestones.length})</summary>
                        {task.projectMilestones.length === 0 ? (
                          <p className="recorded-empty">No milestones yet.</p>
                        ) : (
                          task.projectMilestones.map((milestone) => {
                            const overdue = isMilestoneOverdue(milestone);
                            return (
                              <div key={milestone.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground">{milestone.title}</p>
                                  <p className="text-muted">
                                    {milestone.completedAt
                                      ? `Done ${formatRecordedAt(milestone.completedAt)}`
                                      : milestone.targetAt
                                        ? overdue
                                          ? `Due ${formatRecordedAt(milestone.targetAt)}`
                                          : `Target ${formatRecordedAt(milestone.targetAt)}`
                                        : "No target date"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`task-chip ${milestone.completedAt ? "task-chip-done" : overdue ? "task-chip-lapsed" : ""}`}>
                                    {milestone.completedAt ? "Done" : overdue ? "Late" : "Open"}
                                  </span>
                                  {canManageProjects ? (
                                    <>
                                      <form action={toggleProjectMilestoneAction}>
                                        <input type="hidden" name="taskId" value={task.id} />
                                        <input type="hidden" name="milestoneId" value={milestone.id} />
                                        <input type="hidden" name="returnTo" value={basePath} />
                                        <FormActionButton className="action-btn subtle quiet" pendingLabel="Saving">
                                          {milestone.completedAt ? "Reopen" : "Complete"}
                                        </FormActionButton>
                                      </form>
                                      <form action={deleteProjectMilestoneAction}>
                                        <input type="hidden" name="taskId" value={task.id} />
                                        <input type="hidden" name="milestoneId" value={milestone.id} />
                                        <input type="hidden" name="returnTo" value={basePath} />
                                        <FormActionButton className="action-btn subtle quiet" pendingLabel="Removing">
                                          Remove
                                        </FormActionButton>
                                      </form>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </details>

                      <details className="recorded-more-details project-collection-details">
                        <summary className="recorded-more-summary">Project steps ({task.projectChildren.length})</summary>
                        {task.projectChildren.length === 0 ? (
                          <p className="recorded-empty">No project steps yet.</p>
                        ) : (
                          task.projectChildren.map((child) => (
                            <a key={child.id} href={`#task-${child.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                              <span>{child.title}</span>
                              <span className="text-muted">
                                {getTaskState(child) === "done"
                                  ? "Done"
                                  : isProjectChildOverdue(child)
                                    ? "Overdue"
                                  : child.assignmentUserName
                                    ? child.assignmentUserName
                                    : child.nextDueAt
                                      ? formatRecordedAt(child.nextDueAt)
                                      : "Open"}
                              </span>
                            </a>
                          ))
                        )}
                      </details>

                      <details className="recorded-more-details project-collection-details">
                        <summary className="recorded-more-summary">Costs ({task.projectCosts.length})</summary>
                        {task.projectCosts.length === 0 ? (
                          <p className="recorded-empty">No costs recorded yet.</p>
                        ) : (
                          task.projectCosts.map((cost) => (
                            <div key={cost.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">{cost.title}</p>
                                <p className="text-muted">{formatRecordedAt(cost.notedAt)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <strong className="text-foreground">{formatMoney(cost.amountCents)}</strong>
                                {canManageProjects ? (
                                  <form action={deleteProjectCostAction}>
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input type="hidden" name="costId" value={cost.id} />
                                    <input type="hidden" name="returnTo" value={basePath} />
                                    <FormActionButton className="action-btn subtle quiet" pendingLabel="Removing">
                                      Remove
                                    </FormActionButton>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </details>
                    </section>
                  ) : null}
                </div>
              </details>
            );
          })
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

function getTaskState(task: { captureStage: string; occurrences: Array<{ status: string }> }) {
  if (task.captureStage === "done" || task.occurrences[0]?.status === "done") {
    return "done";
  }
  return "open";
}

function getTaskStatusLabel(task: {
  captureStage: string;
  schedule: { nextDueAt: string | null } | null;
  occurrences: Array<{ status: string; dueAt: string }>;
}) {
  if (getTaskState(task) === "done") {
    return "Done";
  }
  if (task.captureStage === "active") {
    return "In progress";
  }
  if (task.schedule) {
    return getRecurrenceStateLabel(task);
  }
  return "Open";
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
  isPrivate: boolean;
}): string {
  const privateClass = task.isPrivate ? " row-state-private" : "";
  if (getTaskState(task) === "done") return `row-state-done${privateClass}`;
  const stateClass = recurrenceStateClassName(task);
  if (stateClass === "task-chip-lapsed") return `row-state-overdue${privateClass}`;
  if (stateClass === "task-chip-due") return `row-state-due${privateClass}`;
  if (task.schedule) return `row-state-active${privateClass}`;
  if (!task.assignmentUserId) return `row-state-unassigned${privateClass}`;
  return `row-state-assigned${privateClass}`;
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

function isProjectTask(task: TaskItem) {
  return (
    task.jobKind === "project" ||
    task.projectChildren.length > 0 ||
    task.projectCosts.length > 0 ||
    task.projectMaterials.length > 0 ||
    task.projectMilestones.length > 0 ||
    task.projectBudgetCents !== null ||
    task.projectTargetAt !== null
  );
}

function summarizeProject(task: TaskItem) {
  const now = Date.now();
  const totalChildren = task.projectChildren.length;
  const completedChildren = task.projectChildren.filter((child) => getTaskState(child) === "done").length;
  const overdueChildren = task.projectChildren.filter((child) => isProjectChildOverdue(child)).length;
  const spentCents = task.projectCosts.reduce((sum, cost) => sum + cost.amountCents, 0);
  const totalMaterials = task.projectMaterials.length;
  const purchasedMaterials = task.projectMaterials.filter((material) => material.purchasedAt).length;
  const materialEstimateCents = task.projectMaterials.reduce((sum, material) => sum + (material.estimatedCostCents ?? 0), 0);
  const materialSpentCents = task.projectMaterials.reduce((sum, material) => sum + (material.actualCostCents ?? 0), 0);
  const totalMilestones = task.projectMilestones.length;
  const completedMilestones = task.projectMilestones.filter((milestone) => milestone.completedAt).length;
  const overdueMilestones = task.projectMilestones.filter((milestone) => isMilestoneOverdue(milestone)).length;
  const totalEstimatedMinutes =
    task.estimatedMinutes + task.projectChildren.reduce((sum, child) => sum + child.estimatedMinutes, 0);
  const overBudget = task.projectBudgetCents !== null && spentCents > task.projectBudgetCents;
  const complete = task.projectChildren.length > 0
    ? completedChildren === totalChildren
    : getTaskState(task) === "done";
  const planning =
    task.projectChildren.length === 0 &&
    task.projectMilestones.length === 0 &&
    task.projectMaterials.length === 0 &&
    getTaskState(task) !== "done";
  const targetMissed =
    !complete && task.projectTargetAt !== null && new Date(task.projectTargetAt).getTime() < now;
  const atRisk = !complete && (overBudget || overdueChildren > 0 || overdueMilestones > 0 || targetMissed);
  const milestoneLabel = totalMilestones > 0 ? `${completedMilestones}/${totalMilestones} milestones` : null;
  const materialsLabel = totalMaterials > 0 ? `${purchasedMaterials}/${totalMaterials} bought` : null;
  const statusLabel = complete ? "Complete" : planning ? "Planning" : atRisk ? "At risk" : "Active";

  return {
    totalChildren,
    completedChildren,
    overdueChildren,
    spentCents,
    totalMaterials,
    purchasedMaterials,
    materialEstimateCents,
    materialSpentCents,
    totalEstimatedMinutes,
    totalMilestones,
    completedMilestones,
    overdueMilestones,
    overBudget,
    atRisk,
    statusLabel,
    milestoneLabel,
    materialsLabel,
    materialSpendLabel:
      totalMaterials > 0
        ? materialSpentCents > 0
          ? `${formatMoney(materialSpentCents)} across ${purchasedMaterials}`
          : purchasedMaterials > 0
            ? `${purchasedMaterials} bought`
            : "None bought"
        : "No materials",
    progressLabel: totalChildren > 0 ? `${completedChildren}/${totalChildren} tasks done` : "Project shell",
  };
}

function projectMatchesFilter(task: TaskItem, filter: ProjectFilterState) {
  if (filter === "all") {
    return true;
  }

  const summary = summarizeProject(task);
  const complete = task.projectChildren.length > 0
    ? summary.completedChildren === summary.totalChildren
    : getTaskState(task) === "done";
  const planning =
    task.projectChildren.length === 0 &&
    task.projectMilestones.length === 0 &&
    task.projectMaterials.length === 0 &&
    getTaskState(task) !== "done";
  const active = !planning && !complete;

  if (filter === "at_risk") {
    return summary.atRisk;
  }
  if (filter === "over_budget") {
    return summary.overBudget;
  }
  if (filter === "complete") {
    return complete;
  }
  if (filter === "planning") {
    return planning;
  }
  return active;
}

function formatMinutes(value: number) {
  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatSpendSummary(spentCents: number, budgetCents: number | null) {
  if (budgetCents === null) {
    return `${formatMoney(spentCents)} spent`;
  }
  return `${formatMoney(spentCents)} / ${formatMoney(budgetCents)}`;
}

function centsToInputValue(cents: number) {
  return (cents / 100).toFixed(2);
}

function formatJobKind(jobKind: string) {
  const labels: Record<string, string> = {
    upkeep: "Upkeep",
    issue: "Issue",
    project: "Project",
    clear_out: "Clear out",
    outdoor: "Outdoor",
    planning: "Planning",
  };
  return labels[jobKind] ?? jobKind;
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

function isProjectChildOverdue(child: { captureStage: string; nextDueAt: string | null; occurrences: Array<{ status: string; dueAt: string }> }) {
  if (getTaskState(child) === "done") {
    return false;
  }
  const dueAt = child.nextDueAt ?? getOpenOccurrence(child.occurrences)?.dueAt ?? null;
  return dueAt ? new Date(dueAt).getTime() < Date.now() : false;
}

function isMilestoneOverdue(milestone: { targetAt: string | null; completedAt: string | null }) {
  if (!milestone.targetAt || milestone.completedAt) {
    return false;
  }
  return new Date(milestone.targetAt).getTime() < Date.now();
}
