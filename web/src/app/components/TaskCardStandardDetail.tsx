"use client";

import {
  deleteTaskAction,
  promoteTaskToProjectAction,
  updateRecordedTaskAction,
} from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import type { GroupedRoomOptions, PersonOption, TaskItem } from "@/app/components/task-board-types";
import {
  addDays,
  displayRoomName,
  formatMinutes,
  formatRecordedAt,
  formatRecurrenceChip,
  getLatestCompletedOccurrence,
  getTaskState,
  getTaskStatusLabel,
  toDateTimeInputValue,
  wasOccurrenceOnTime,
} from "@/app/components/task-board-utils";

type Props = {
  task: TaskItem;
  groupedRoomOptions: GroupedRoomOptions;
  peopleOptions: PersonOption[];
  teenMode: boolean;
  canEditTasks: boolean;
  canManageProjects: boolean;
  canDeleteTasks: boolean;
  hasReward: boolean;
  rewardLabel: string | null;
  basePath: string;
};

export function TaskCardStandardDetail({
  task,
  groupedRoomOptions,
  peopleOptions,
  teenMode,
  canEditTasks,
  canManageProjects,
  canDeleteTasks,
  hasReward,
  rewardLabel,
  basePath,
}: Props) {
  const latestCompleted = getLatestCompletedOccurrence(task.occurrences);

  return (
    <>
      <section className="task-overview-panel">
        {task.detailNotes ? (
          <p className="task-overview-copy">{task.detailNotes}</p>
        ) : (
          <p className="task-overview-copy">
            {teenMode
              ? "Use the quick actions below or open details if this needs tidying."
              : "Use the quick actions below, then open details only if the job needs updating."}
          </p>
        )}

        <div className="task-overview-grid">
          <p><span>Where</span><strong>{task.locationName ? `${task.locationName} · ${displayRoomName(task.roomName)}` : displayRoomName(task.roomName)}</strong></p>
          <p><span>Assigned</span><strong>{task.assignmentUserName ?? "No one yet"}</strong></p>
          <p><span>Status</span><strong>{getTaskStatusLabel(task)}</strong></p>
          <p><span>Estimate</span><strong>{formatMinutes(task.estimatedMinutes)}</strong></p>
          {hasReward ? <p><span>Reward</span><strong>{rewardLabel}</strong></p> : null}
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
            <p className="task-readonly-note">
              Use the button on the card to {getTaskState(task) === "done" ? "reopen this job" : task.captureStage === "active" ? "mark this job done" : "start this job"}.
            </p>
            {canManageProjects ? (
              <form action={promoteTaskToProjectAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value={basePath} />
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Promoting">
                  Add subtasks
                </FormActionButton>
              </form>
            ) : null}
            {canDeleteTasks ? (
              <form action={deleteTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
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
        <details className="recorded-more-details task-manage-details">
          <summary className="recorded-more-summary">Manage job details</summary>
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
  );
}
