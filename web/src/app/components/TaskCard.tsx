"use client";

import type { PersonOption, TaskItem } from "@/app/components/task-board-types";
import {
  acceptRewardAction,
  completeTaskAction,
  createProjectChildTaskAction,
  deleteProjectCostAction,
  deleteProjectMaterialAction,
  deleteProjectMilestoneAction,
  deleteTaskAction,
  demoteProjectToTaskAction,
  markRewardPaidAction,
  promoteTaskToProjectAction,
  renameRecordedTaskTitleAction,
  reopenTaskAction,
  startTaskAction,
  updateRecordedTaskAction,
} from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import {
  addDays,
  computeStreak,
  displayRoomName,
  formatJobKind,
  formatMinutes,
  formatMoney,
  formatRecordedAt,
  formatRecurrenceChip,
  getLatestCompletedOccurrence,
  getRewardChipClassName,
  getRewardStatusLabel,
  getSubtaskProgressLabel,
  getTaskIconTone,
  getTaskState,
  getTaskStatusLabel,
  hasLegacyProjectPlanningData,
  isProjectTask,
  nameInitials,
  nameToAvatarStyle,
  recurrenceStateClassName,
  renderTaskIcon,
  rowStateClass,
  summarizeProject,
  toDateTimeInputValue,
  wasOccurrenceOnTime,
} from "@/app/components/task-board-utils";

type Props = {
  task: TaskItem;
  initialOpen: boolean;
  groupedRoomOptions: Array<[string, Array<{ id: string; name: string }>]>;
  peopleOptions: PersonOption[];
  childMode: boolean;
  teenMode: boolean;
  canEditTasks: boolean;
  canManageProjects: boolean;
  canDeleteTasks: boolean;
  currentUserId: string;
  basePath: string;
};

export function TaskCard({
  task,
  initialOpen,
  groupedRoomOptions,
  peopleOptions,
  childMode,
  teenMode,
  canEditTasks,
  canManageProjects,
  canDeleteTasks,
  currentUserId,
  basePath,
}: Props) {
  const latestCompleted = getLatestCompletedOccurrence(task.occurrences);
  const isProject = isProjectTask(task);
  const projectSummary = summarizeProject(task);
  const subtaskProgressLabel = getSubtaskProgressLabel(projectSummary);
  const hasLegacyProjectPlanning = hasLegacyProjectPlanningData(task);
  const canDemoteProject =
    task.projectChildren.length === 0 &&
    task.projectCosts.length === 0 &&
    task.projectMaterials.length === 0 &&
    task.projectMilestones.length === 0;
  const hasReward = task.rewardCents !== null;
  const canAcceptReward =
    hasReward &&
    task.assignmentUserId === currentUserId &&
    !task.rewardConfirmed &&
    !task.rewardPaidAt;
  const canMarkRewardPaid =
    hasReward &&
    task.createdByUserId === currentUserId &&
    task.rewardConfirmed &&
    !task.rewardPaidAt &&
    getTaskState(task) === "done";
  const rewardLabel = hasReward ? getRewardStatusLabel(task.rewardCents!, task.rewardConfirmed, task.rewardPaidAt) : null;
  const rewardChipClassName = hasReward ? getRewardChipClassName(task.rewardConfirmed, task.rewardPaidAt) : null;

  return (
    <details
      id={`task-${task.id}`}
      className={`recorded-row ${rowStateClass(task)}`}
      open={initialOpen}
    >
      <summary className="recorded-row-summary">
        <div className="recorded-row-top">
          <span className={`recorded-row-icon recorded-row-icon-${getTaskIconTone(task, isProject)}`} aria-hidden="true">
            {renderTaskIcon(task, isProject)}
          </span>
          <p className="recorded-row-title">{task.title}</p>
          <span className="recorded-row-chevron">▾</span>
        </div>
        <div className="recorded-row-sub">
          {isProject ? (
            <>
              {task.locationName ? (
                <span className="recorded-row-location">{task.locationName}</span>
              ) : null}
              <span className="recorded-row-room">{displayRoomName(task.roomName)}</span>
              {task.assignmentUserName ? (
                <span className="recorded-row-assignee">
                  <span className="assignee-avatar" style={nameToAvatarStyle(task.assignmentUserName)}>
                    {nameInitials(task.assignmentUserName)}
                  </span>
                  {task.assignmentUserName}
                </span>
              ) : null}
              <span className="task-chip task-chip-streak">{subtaskProgressLabel}</span>
              {projectSummary.overdueChildren > 0 ? (
                <span className="task-chip task-chip-lapsed">{projectSummary.overdueChildren} overdue</span>
              ) : null}
            </>
          ) : (
            <>
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
              {recurrenceStateClassName(task) === "task-chip-due" ? <span className="task-chip task-chip-due">Due today</span> : null}
              {rewardLabel && rewardChipClassName ? <span className={`task-chip ${rewardChipClassName}`}>{rewardLabel}</span> : null}
              {task.isPrivate && !childMode ? <span className="task-chip task-chip-private">Private</span> : null}
              {task.projectParentTitle ? <span className="task-chip">↳ {task.projectParentTitle}</span> : null}
              {isProject ? <span className="task-chip task-chip-streak">{subtaskProgressLabel}</span> : null}
              {isProject && projectSummary.overdueChildren > 0 ? (
                <span className="task-chip task-chip-lapsed">
                  {projectSummary.overdueChildren} overdue
                </span>
              ) : null}
              {isProject && hasLegacyProjectPlanning ? <span className="task-chip">Legacy extras</span> : null}
              {task.schedule && computeStreak(task.occurrences) >= 2 ? (
                <span className="task-chip task-chip-streak">{computeStreak(task.occurrences)} in a row</span>
              ) : null}
            </>
          )}
        </div>
      </summary>

      <div className="recorded-row-detail">
        {!childMode && canEditTasks ? (
          <form action={renameRecordedTaskTitleAction} className="task-title-quick-edit">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
            <input
              name="title"
              type="text"
              defaultValue={task.title}
              aria-label="Quick edit task title"
              className="task-title-quick-edit-input"
            />
            <FormActionButton className="action-btn subtle quiet task-title-quick-edit-button" pendingLabel="Saving">
              Rename
            </FormActionButton>
          </form>
        ) : null}

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
              {hasReward ? <p><span>Reward</span><strong>{rewardLabel}</strong></p> : null}
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
                    {canAcceptReward ? (
                      <form action={acceptRewardAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                        <FormActionButton className="action-btn subtle quiet" pendingLabel="Accepting">
                          Accept {formatMoney(task.rewardCents!)}
                        </FormActionButton>
                      </form>
                    ) : null}
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
                      <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                      <FormActionButton className="action-btn bright quiet" pendingLabel="Finishing">
                        I finished this
                      </FormActionButton>
                    </form>
                  </>
                ) : null
              )}
            </div>
          </section>
        ) : isProject ? null : (
          <>
            <section className="task-overview-panel">
              {task.detailNotes ? (
                <p className="task-overview-copy">{task.detailNotes}</p>
              ) : (
                <p className="task-overview-copy">{teenMode ? "Use the quick actions below or open details if this needs tidying." : "Use the quick actions below, then open details only if the job needs updating."}</p>
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
                  {getTaskState(task) === "done" ? (
                    <form action={reopenTaskAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <FormActionButton className="action-btn subtle quiet" pendingLabel="Opening">
                        Reopen
                      </FormActionButton>
                    </form>
                  ) : (
                    <>
                      {canAcceptReward ? (
                        <form action={acceptRewardAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                          <FormActionButton className="action-btn subtle quiet" pendingLabel="Accepting">
                            Accept {formatMoney(task.rewardCents!)}
                          </FormActionButton>
                        </form>
                      ) : null}
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
                        <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                        <FormActionButton className="action-btn bright quiet" pendingLabel="Finishing">
                          Finish job
                        </FormActionButton>
                      </form>
                    </>
                  )}
                  {canMarkRewardPaid ? (
                    <form action={markRewardPaidAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                      <FormActionButton className="action-btn subtle quiet" pendingLabel="Paying">
                        Mark paid
                      </FormActionButton>
                    </form>
                  ) : null}
                  {!isProject && canManageProjects ? (
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
        )}

        {!childMode && isProject ? (
          <section className="rounded-xl border border-border bg-surface p-3 project-panel">
            <div className="room-setup-header">
              <div>
                <p className="settings-kicker">Parent job</p>
                <h3 className="recorded-title">Subtasks</h3>
              </div>
            </div>

            <p className="task-readonly-note">
              Bigger jobs live here as a short list of steps.
            </p>

            {canManageProjects ? (
              <div className="project-manage-stack">
                <div className="task-overview-grid project-overview-grid">
                  <p><span>Where</span><strong>{task.locationName ? `${task.locationName} · ${displayRoomName(task.roomName)}` : displayRoomName(task.roomName)}</strong></p>
                  <p><span>Assigned</span><strong>{task.assignmentUserName ?? "No one yet"}</strong></p>
                  <p><span>Done</span><strong>{projectSummary.completedChildren} of {projectSummary.totalChildren}</strong></p>
                  <p><span>Overdue</span><strong>{projectSummary.overdueChildren}</strong></p>
                </div>

                <form action={createProjectChildTaskAction} className="recorded-edit-form">
                  <input type="hidden" name="projectId" value={task.id} />
                  <input type="hidden" name="returnTo" value={basePath} />
                  <label className="recorded-field">
                    <span>Subtask title</span>
                    <input name="title" type="text" placeholder="Patch walls" className="recorded-edit-input" />
                  </label>
                  <label className="recorded-field">
                    <span>Notes</span>
                    <textarea name="detailNotes" rows={2} placeholder="Optional detail" className="recorded-edit-input recorded-edit-textarea" />
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
                      <input name="estimatedMinutes" type="number" min={5} defaultValue={30} className="recorded-edit-input" />
                    </label>
                  </div>
                  <label className="recorded-field">
                    <span>Due date</span>
                    <input name="dueAt" type="datetime-local" className="recorded-edit-input" />
                  </label>
                  <div className="recorded-row-actions between">
                    <FormActionButton className="action-btn bright quiet" pendingLabel="Adding">
                      Add subtask
                    </FormActionButton>
                  </div>
                </form>

                <div className="task-overview-grid">
                  <p><span>Status</span><strong>{projectSummary.statusLabel}</strong></p>
                  <p><span>Subtasks</span><strong>{subtaskProgressLabel}</strong></p>
                  {task.rewardCents !== null ? <p><span>Reward</span><strong>{rewardLabel}</strong></p> : null}
                </div>

                {task.projectChildren.length > 0 ? (
                  <div className="stats-streak-list">
                    {task.projectChildren.map((child) => (
                      <div key={child.id} className="stats-streak-row">
                        <div className="stats-streak-info">
                          <span className="stats-streak-title">{child.title}</span>
                          <span className="recorded-row-room">{child.assignmentUserName ?? "Unassigned"}</span>
                        </div>
                        <span className="stats-streak-badge">
                          {getTaskState(child) === "done" ? "Done" : child.nextDueAt ? formatRecordedAt(child.nextDueAt) : "Open"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="recorded-row-actions between">
                  {canDemoteProject ? (
                    <form action={demoteProjectToTaskAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="returnTo" value={basePath} />
                      <FormActionButton className="action-btn subtle quiet" pendingLabel="Changing">
                        Back to normal job
                      </FormActionButton>
                    </form>
                  ) : null}
                </div>

                {hasLegacyProjectPlanning ? (
                  <details className="recorded-more-details">
                    <summary className="recorded-more-summary">Legacy planning data</summary>
                    <div className="space-y-3">
                      <p className="task-readonly-note">
                        Older parent jobs may still have targets, budget, shopping, milestone, or spend data. New multi-step work should use subtasks instead.
                      </p>

                      <div className="task-overview-grid project-overview-grid">
                        <p><span>Target</span><strong>{task.projectTargetAt ? formatRecordedAt(task.projectTargetAt) : "Not set"}</strong></p>
                        <p><span>Budget</span><strong>{task.projectBudgetCents !== null ? formatMoney(task.projectBudgetCents) : "Not set"}</strong></p>
                        <p><span>Costs</span><strong>{task.projectCosts.length}</strong></p>
                        <p><span>Materials</span><strong>{task.projectMaterials.length}</strong></p>
                        <p><span>Milestones</span><strong>{task.projectMilestones.length}</strong></p>
                        <p><span>Spend</span><strong>{formatMoney(projectSummary.spentCents)}</strong></p>
                      </div>

                      {task.projectMaterials.length > 0 ? (
                        <div className="space-y-2">
                          {task.projectMaterials.map((material) => (
                            <div key={material.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">{material.title}</p>
                                <p className="text-muted">
                                  {[material.quantityLabel, material.source].filter(Boolean).join(" · ") || "No extra detail"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {material.actualCostCents !== null ? (
                                  <strong className="text-foreground">{formatMoney(material.actualCostCents)}</strong>
                                ) : material.estimatedCostCents !== null ? (
                                  <span className="text-muted">{formatMoney(material.estimatedCostCents)} est.</span>
                                ) : null}
                                {canManageProjects ? (
                                  <form action={deleteProjectMaterialAction}>
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <input type="hidden" name="materialId" value={material.id} />
                                    <input type="hidden" name="returnTo" value={basePath} />
                                    <FormActionButton className="action-btn subtle quiet" pendingLabel="Removing">
                                      Remove
                                    </FormActionButton>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {task.projectMilestones.length > 0 ? (
                        <div className="space-y-2">
                          {task.projectMilestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">{milestone.title}</p>
                                <p className="text-muted">
                                  {milestone.completedAt
                                    ? `Done ${formatRecordedAt(milestone.completedAt)}`
                                    : milestone.targetAt
                                      ? `Target ${formatRecordedAt(milestone.targetAt)}`
                                      : "No target date"}
                                </p>
                              </div>
                              {canManageProjects ? (
                                <form action={deleteProjectMilestoneAction}>
                                  <input type="hidden" name="taskId" value={task.id} />
                                  <input type="hidden" name="milestoneId" value={milestone.id} />
                                  <input type="hidden" name="returnTo" value={basePath} />
                                  <FormActionButton className="action-btn subtle quiet" pendingLabel="Removing">
                                    Remove
                                  </FormActionButton>
                                </form>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {task.projectCosts.length > 0 ? (
                        <div className="space-y-2">
                          {task.projectCosts.map((cost) => (
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
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  );
}
