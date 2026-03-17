"use client";

import {
  acceptRewardAction,
  completeTaskAction,
  markRewardPaidAction,
  renameRecordedTaskTitleAction,
  reopenTaskAction,
  startTaskAction,
} from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { TaskCardChildDetail } from "@/app/components/TaskCardChildDetail";
import { TaskCardProjectDetail } from "@/app/components/TaskCardProjectDetail";
import { TaskCardSummaryAction } from "@/app/components/TaskCardSummaryAction";
import { TaskCardStandardDetail } from "@/app/components/TaskCardStandardDetail";
import type { GroupedRoomOptions, PersonOption, TaskItem } from "@/app/components/task-board-types";
import {
  formatMoney,
  formatTaskPlace,
  getRewardChipClassName,
  getRewardStatusLabel,
  getSubtaskProgressLabel,
  getTaskIconTone,
  getTaskState,
  hasLegacyProjectPlanningData,
  isProjectTask,
  nameInitials,
  nameToAvatarStyle,
  recurrenceStateClassName,
  renderTaskIcon,
  rowStateClass,
  summarizeProject,
} from "@/app/components/task-board-utils";

type Props = {
  task: TaskItem;
  initialOpen: boolean;
  groupedRoomOptions: GroupedRoomOptions;
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
  const showStandardSummaryActions = !childMode && !isProject && canEditTasks;
  const summaryStateChip = getSummaryStateChip(task, childMode);

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
          {showStandardSummaryActions ? (
            <span className="recorded-row-summary-actions" onClick={(event) => event.stopPropagation()}>
              {canAcceptReward ? (
                <TaskCardSummaryAction
                  action={acceptRewardAction}
                  fields={{ taskId: task.id, returnTo: `${basePath}#task-${task.id}` }}
                  className="action-btn subtle quiet summary-action-btn"
                  pendingLabel="Accepting"
                  label={`Accept ${formatMoney(task.rewardCents!)}`}
                />
              ) : null}
              {getTaskState(task) === "done" ? (
                <>
                  {canMarkRewardPaid ? (
                    <TaskCardSummaryAction
                      action={markRewardPaidAction}
                      fields={{ taskId: task.id, returnTo: `${basePath}#task-${task.id}` }}
                      className="action-btn subtle quiet summary-action-btn"
                      pendingLabel="Paying"
                      label="Mark paid"
                    />
                  ) : null}
                  <TaskCardSummaryAction
                    action={reopenTaskAction}
                    fields={{ taskId: task.id }}
                    className="action-btn subtle quiet summary-action-btn"
                    pendingLabel="Opening"
                    label="Reopen"
                  />
                </>
              ) : task.captureStage !== "active" ? (
                <TaskCardSummaryAction
                  action={startTaskAction}
                  fields={{ taskId: task.id }}
                  className="action-btn subtle quiet summary-action-btn"
                  pendingLabel="Starting"
                  label="Start"
                />
              ) : (
                <TaskCardSummaryAction
                  action={completeTaskAction}
                  fields={{ taskId: task.id, note: "", returnTo: `${basePath}#task-${task.id}` }}
                  className="action-btn bright quiet summary-action-btn"
                  pendingLabel="Finishing"
                  label="Done"
                />
              )}
            </span>
          ) : null}
          <span className="recorded-row-chevron">▾</span>
        </div>
        <div className="recorded-row-sub">
          {isProject ? (
            <>
              <span className="recorded-row-room">{formatTaskPlace(task.locationName, task.roomName)}</span>
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
              <span className="recorded-row-room">{formatTaskPlace(task.locationName, task.roomName)}</span>
              {task.assignmentUserName && !childMode ? (
                <span className="recorded-row-assignee">
                  <span className="assignee-avatar" style={nameToAvatarStyle(task.assignmentUserName)}>
                    {nameInitials(task.assignmentUserName)}
                  </span>
                  {task.assignmentUserName}
                </span>
              ) : null}
              {summaryStateChip}
              {rewardLabel && rewardChipClassName ? <span className={`task-chip ${rewardChipClassName}`}>{rewardLabel}</span> : null}
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
          <TaskCardChildDetail
            task={task}
            canEditTasks={canEditTasks}
            canAcceptReward={canAcceptReward}
            hasReward={hasReward}
            rewardLabel={rewardLabel}
            basePath={basePath}
          />
        ) : isProject ? (
          <TaskCardProjectDetail
            task={task}
            peopleOptions={peopleOptions}
            canManageProjects={canManageProjects}
            canDemoteProject={canDemoteProject}
            hasLegacyProjectPlanning={hasLegacyProjectPlanning}
            rewardLabel={rewardLabel}
            basePath={basePath}
          />
        ) : (
          <TaskCardStandardDetail
            task={task}
            groupedRoomOptions={groupedRoomOptions}
            peopleOptions={peopleOptions}
            teenMode={teenMode}
            canEditTasks={canEditTasks}
            canManageProjects={canManageProjects}
            canDeleteTasks={canDeleteTasks}
            hasReward={hasReward}
            rewardLabel={rewardLabel}
            basePath={basePath}
          />
        )}
      </div>
    </details>
  );
}

function getSummaryStateChip(task: TaskItem, childMode: boolean) {
  if (getTaskState(task) === "done") {
    return <span className="task-chip task-chip-done">{childMode ? "Finished" : "Done"}</span>;
  }
  if (task.captureStage === "active") {
    return <span className="task-chip">In progress</span>;
  }
  if (recurrenceStateClassName(task) === "task-chip-lapsed") {
    return <span className="task-chip task-chip-lapsed">Needs attention</span>;
  }
  if (recurrenceStateClassName(task) === "task-chip-due") {
    return <span className="task-chip task-chip-due">Due today</span>;
  }
  return null;
}
