"use client";

import {
  completeTaskAction,
  deleteTaskAction,
  promoteTaskToProjectAction,
  reopenTaskAction,
  startTaskAction,
  updateRecordedTaskAction,
} from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import type { GroupedRoomOptions, PersonOption, TaskItem, TaskStandardDetail } from "@/app/components/task-board-types";
import {
  addDays,
  computeStreak,
  formatMinutes,
  formatJobKind,
  formatTaskPlace,
  formatRecordedAt,
  formatRecurrenceChip,
  getLatestCompletedOccurrence,
  getTaskState,
  getTaskStatusLabel,
  toDateTimeInputValue,
  wasOccurrenceOnTime,
} from "@/app/components/task-board-utils";
import { useEffect, useState } from "react";

type Props = {
  task: TaskItem;
  isOpen: boolean;
  groupedRoomOptions: GroupedRoomOptions;
  peopleOptions: PersonOption[];
  canEditTasks: boolean;
  canManageProjects: boolean;
  canDeleteTasks: boolean;
  hasReward: boolean;
  rewardLabel: string | null;
  basePath: string;
};

export function TaskCardStandardDetail({
  task,
  isOpen,
  groupedRoomOptions,
  peopleOptions,
  canEditTasks,
  canManageProjects,
  canDeleteTasks,
  hasReward,
  rewardLabel,
  basePath,
}: Props) {
  const [detail, setDetail] = useState<TaskStandardDetail | null>(task.standardDetail);
  const [detailError, setDetailError] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !manageOpen || detail || detailError) {
      return;
    }

    let ignore = false;

    fetch(`/api/tasks/${task.id}/detail`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("detail-fetch-failed");
        }
        return response.json() as Promise<{ detail: TaskStandardDetail }>;
      })
      .then((payload) => {
        if (ignore) return;
        setDetail(payload.detail);
      })
      .catch(() => {
        if (ignore) return;
        setDetailError(true);
      });

    return () => {
      ignore = true;
    };
  }, [detail, detailError, isOpen, manageOpen, task.id]);

  const resolvedDetail = detail ?? {
    detailNotes: task.detailNotes,
    loggerName: task.loggerName,
    priority: task.priority,
    isPrivate: task.isPrivate,
    schedule: task.schedule,
    occurrences: task.occurrences,
  };
  const isLoadingDetail = isOpen && manageOpen && !detail && !detailError;
  const latestCompleted = getLatestCompletedOccurrence(resolvedDetail.occurrences);
  const taskState = getTaskState(task);
  const needsExplicitStart = task.validationMode === "strict" && task.captureStage !== "active" && taskState !== "done";
  const canArchiveTask = canDeleteTasks && taskState === "done";

  return (
    <>
      <section className="task-overview-panel">
        {resolvedDetail.detailNotes ? (
          <p className="task-overview-copy">{resolvedDetail.detailNotes}</p>
        ) : (
          <p className="task-overview-copy">
            Use the quick actions below, then open details only if the job needs updating.
          </p>
        )}

        <div className="task-overview-grid">
          <p><span>Where</span><strong>{formatTaskPlace(task.locationName, task.roomName)}</strong></p>
          <p><span>Assigned</span><strong>{task.assignmentUserName ?? "No one yet"}</strong></p>
          <p><span>Status</span><strong>{getTaskStatusLabel(task)}</strong></p>
          <p><span>Estimate</span><strong>{formatMinutes(task.estimatedMinutes)}</strong></p>
          {hasReward ? <p><span>Reward</span><strong>{rewardLabel}</strong></p> : null}
          {task.projectParentTitle ? <p><span>Parent job</span><strong>{task.projectParentTitle}</strong></p> : null}
        </div>

        {(resolvedDetail.schedule || resolvedDetail.isPrivate || latestCompleted?.completedAt || resolvedDetail.loggerName || computeStreak(resolvedDetail.occurrences) >= 2) ? (
          <details className="recorded-more-details">
            <summary className="recorded-more-summary">More job info</summary>
            <div className="task-overview-grid">
              <p><span>Type</span><strong>{formatJobKind(task.jobKind)}</strong></p>
              {resolvedDetail.isPrivate ? <p><span>Privacy</span><strong>Private</strong></p> : null}
              {resolvedDetail.schedule ? (
                <>
                  <p><span>Repeats</span><strong>{formatRecurrenceChip(resolvedDetail.schedule)}</strong></p>
                  <p><span>Next due</span><strong>{resolvedDetail.schedule.nextDueAt ? formatRecordedAt(resolvedDetail.schedule.nextDueAt) : "Not set"}</strong></p>
                </>
              ) : null}
              {resolvedDetail.schedule && computeStreak(resolvedDetail.occurrences) >= 2 ? (
                <p><span>Streak</span><strong>{computeStreak(resolvedDetail.occurrences)} in a row</strong></p>
              ) : null}
              {latestCompleted?.completedAt ? (
                <p><span>Last done</span><strong>{formatRecordedAt(latestCompleted.completedAt)}</strong></p>
              ) : null}
              {resolvedDetail.loggerName ? <p><span>Logged by</span><strong>{resolvedDetail.loggerName}</strong></p> : null}
              <p><span>Recorded</span><strong>{formatRecordedAt(task.createdAt)}</strong></p>
            </div>
          </details>
        ) : null}

        {canEditTasks ? (
          <div className="recorded-row-actions task-overview-actions">
            {taskState === "done" ? (
              <form action={reopenTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Opening">
                  Reopen job
                </FormActionButton>
              </form>
            ) : needsExplicitStart ? (
              <form action={startTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Starting">
                  Start job
                </FormActionButton>
              </form>
            ) : (
              <form action={completeTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="note" value="" />
                <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                <FormActionButton className="action-btn bright quiet" pendingLabel="Finishing">
                  Mark done
                </FormActionButton>
              </form>
            )}
            {canManageProjects ? (
              <form action={promoteTaskToProjectAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Promoting">
                  Break into steps
                </FormActionButton>
              </form>
            ) : null}
            {canArchiveTask ? (
              <form action={deleteTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value={basePath} />
                <FormActionButton className="action-btn warn quiet" pendingLabel="Archiving">
                  Archive job
                </FormActionButton>
              </form>
            ) : null}
          </div>
        ) : (
          <p className="task-readonly-note">Read-only access. Open the job details to review more information.</p>
        )}
      </section>

      {canEditTasks ? (
        <details
          className="recorded-more-details task-manage-details"
          open={manageOpen}
          onToggle={(event) => setManageOpen(event.currentTarget.open)}
        >
          <summary className="recorded-more-summary">Manage job details</summary>
          {manageOpen ? (
            isLoadingDetail ? (
              <div className="recorded-edit-form">
                <p className="task-readonly-note">Loading job details…</p>
              </div>
            ) : detailError ? (
              <div className="recorded-edit-form">
                <p className="task-readonly-note">Could not load the full job details. Close and reopen the card to try again.</p>
                <button
                  type="button"
                  className="action-btn subtle quiet"
                  onClick={() => setDetailError(false)}
                >
                  Try again
                </button>
              </div>
            ) : (
              <form action={updateRecordedTaskAction} className="recorded-edit-form">
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value={basePath} />

                <label className="recorded-field">
                  <span>Job</span>
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
                    defaultValue={resolvedDetail.detailNotes ?? ""}
                    className="recorded-edit-input recorded-edit-textarea"
                  />
                </label>

                <label className="recorded-field recorded-field-toggle">
                  <span>Private</span>
                  <span className="recorded-toggle-wrap">
                    <input type="checkbox" name="isPrivate" value="true" defaultChecked={resolvedDetail.isPrivate} className="recorded-toggle-check" />
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
                        defaultValue={getTaskState(task) === "done" ? "" : resolvedDetail.priority}
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
                        defaultValue={resolvedDetail.schedule?.recurrenceType ?? "none"}
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
                        defaultValue={resolvedDetail.schedule?.intervalCount ?? 1}
                        className="recorded-edit-input"
                      />
                    </label>
                  </div>

                  <label className="recorded-field">
                    <span>Next due</span>
                    <input
                      name="nextDueAt"
                      type="datetime-local"
                      defaultValue={toDateTimeInputValue(resolvedDetail.schedule?.nextDueAt ?? addDays(new Date(), 7))}
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
            )
          ) : null}
        </details>
      ) : null}
    </>
  );
}
