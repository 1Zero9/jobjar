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
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";

type Props = {
  task: TaskItem;
  initialOpen: boolean;
  groupedRoomOptions: GroupedRoomOptions;
  peopleOptions: PersonOption[];
  childMode: boolean;
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
  canEditTasks,
  canManageProjects,
  canDeleteTasks,
  currentUserId,
  basePath,
}: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [optimisticTask, setOptimisticTask] = useOptimistic(task);

  // Swipe gesture state (refs to avoid re-renders during gesture)
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const isProject = isProjectTask(optimisticTask);
  const projectSummary = summarizeProject(optimisticTask);
  const subtaskProgressLabel = getSubtaskProgressLabel(projectSummary);
  const hasLegacyProjectPlanning = hasLegacyProjectPlanningData(optimisticTask);
  const canDemoteProject =
    projectSummary.totalChildren === 0 &&
    optimisticTask.projectCosts.length === 0 &&
    optimisticTask.projectMaterials.length === 0 &&
    optimisticTask.projectMilestones.length === 0;
  const hasReward = optimisticTask.rewardCents !== null;
  const canAcceptReward =
    hasReward &&
    optimisticTask.assignmentUserId === currentUserId &&
    !optimisticTask.rewardConfirmed &&
    !optimisticTask.rewardPaidAt;
  const canMarkRewardPaid =
    hasReward &&
    optimisticTask.createdByUserId === currentUserId &&
    optimisticTask.rewardConfirmed &&
    !optimisticTask.rewardPaidAt &&
    getTaskState(optimisticTask) === "done";
  const rewardLabel = hasReward ? getRewardStatusLabel(optimisticTask.rewardCents!, optimisticTask.rewardConfirmed, optimisticTask.rewardPaidAt) : null;
  const rewardChipClassName = hasReward ? getRewardChipClassName(optimisticTask.rewardConfirmed, optimisticTask.rewardPaidAt) : null;
  const showStandardSummaryActions = !childMode && !isProject && canEditTasks;
  const summaryStateChip = getSummaryStateChip(optimisticTask, childMode);
  const taskState = getTaskState(optimisticTask);
  const needsExplicitStart = optimisticTask.validationMode === "strict" && optimisticTask.captureStage !== "active" && taskState !== "done";

  useEffect(() => {
    const expectedHash = `#task-${task.id}`;
    const syncOpenFromHash = () => {
      if (window.location.hash === expectedHash) {
        setOpen(true);
      }
    };

    syncOpenFromHash();
    window.addEventListener("hashchange", syncOpenFromHash);
    return () => {
      window.removeEventListener("hashchange", syncOpenFromHash);
    };
  }, [task.id]);

  // Optimistic update helpers
  function applyOptimisticDone() {
    setOptimisticTask((current) => {
      const updatedOccurrences = current.occurrences.map((occ) =>
        occ.status !== "done" ? { ...occ, status: "done" } : occ,
      );
      return { ...current, captureStage: "done", occurrences: updatedOccurrences };
    });
  }

  function applyOptimisticActive() {
    setOptimisticTask((current) => ({ ...current, captureStage: "active" }));
  }

  function applyOptimisticReopen() {
    setOptimisticTask((current) => {
      // Revert captureStage to "open" and restore occurrences to open state if they were all done
      const updatedOccurrences = current.occurrences.map((occ, index) =>
        index === 0 && current.schedule ? { ...occ, status: "open" } : occ,
      );
      return { ...current, captureStage: "open", occurrences: updatedOccurrences };
    });
  }

  // Swipe gesture handlers
  function handleTouchStart(e: React.TouchEvent<HTMLElement>) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLElement>) {
    const deltaX = touchStartX.current - e.touches[0].clientX;
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY);
    // Show swipe feedback when mostly horizontal and past a small threshold
    if (deltaX > 20 && deltaY < 40) {
      setIsSwiping(true);
    }
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLElement>) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - endX;
    const deltaY = Math.abs(touchStartY.current - endY);

    setIsSwiping(false);

    // Threshold: 80px horizontal, less than 40px vertical drift
    if (deltaX > 80 && deltaY < 40 && showStandardSummaryActions) {
      if (taskState === "done") {
        // No swipe action when already done
        return;
      }
      if (needsExplicitStart) {
        const fd = new FormData();
        fd.set("taskId", task.id);
        startTransition(async () => {
          applyOptimisticActive();
          await startTaskAction(fd);
        });
      } else {
        const fd = new FormData();
        fd.set("taskId", task.id);
        fd.set("note", "");
        fd.set("returnTo", `${basePath}#task-${task.id}`);
        startTransition(async () => {
          applyOptimisticDone();
          await completeTaskAction(fd);
        });
      }
    }
  }

  const summaryStyle: React.CSSProperties = isSwiping
    ? {
        background: "linear-gradient(to left, #bbf7d0 0%, transparent 60%)",
        transition: "background 0.1s ease",
      }
    : {
        transition: "background 0.2s ease",
      };

  return (
    <details
      id={`task-${task.id}`}
      className={`recorded-row ${rowStateClass(optimisticTask)}`}
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary
        className="recorded-row-summary"
        style={summaryStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="recorded-row-top">
          <span className={`recorded-row-icon recorded-row-icon-${getTaskIconTone(optimisticTask, isProject)}`} aria-hidden="true">
            {renderTaskIcon(optimisticTask, isProject)}
          </span>
          <p className="recorded-row-title">{optimisticTask.title}</p>
          {showStandardSummaryActions ? (
            <span className="recorded-row-summary-actions" onClick={(event) => event.stopPropagation()}>
              {canAcceptReward ? (
                <TaskCardSummaryAction
                  action={acceptRewardAction}
                  fields={{ taskId: task.id, returnTo: `${basePath}#task-${task.id}` }}
                  className="action-btn subtle quiet summary-action-btn"
                  pendingLabel="Accepting"
                  label={`Accept ${formatMoney(optimisticTask.rewardCents!)}`}
                />
              ) : null}
              {taskState === "done" ? (
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
                    onOptimisticUpdate={applyOptimisticReopen}
                  />
                </>
              ) : needsExplicitStart ? (
                <TaskCardSummaryAction
                  action={startTaskAction}
                  fields={{ taskId: task.id }}
                  className="action-btn subtle quiet summary-action-btn"
                  pendingLabel="Starting"
                  label="Start"
                  onOptimisticUpdate={applyOptimisticActive}
                />
              ) : (
                <TaskCardSummaryAction
                  action={completeTaskAction}
                  fields={{ taskId: task.id, note: "", returnTo: `${basePath}#task-${task.id}` }}
                  className="action-btn bright quiet summary-action-btn"
                  pendingLabel="Finishing"
                  label="Done"
                  onOptimisticUpdate={applyOptimisticDone}
                />
              )}
            </span>
          ) : null}
          <span className="recorded-row-chevron">▾</span>
        </div>
        <div className="recorded-row-sub">
          {isProject ? (
            <>
              <span className="recorded-row-room">{formatTaskPlace(optimisticTask.locationName, optimisticTask.roomName)}</span>
              {optimisticTask.assignmentUserName ? (
                <span className="recorded-row-assignee">
                  <span className="assignee-avatar" style={nameToAvatarStyle(optimisticTask.assignmentUserName)}>
                    {nameInitials(optimisticTask.assignmentUserName)}
                  </span>
                  {optimisticTask.assignmentUserName}
                </span>
              ) : null}
              <span className="task-chip task-chip-streak">{subtaskProgressLabel}</span>
              {projectSummary.overdueChildren > 0 ? (
                <span className="task-chip task-chip-lapsed">{projectSummary.overdueChildren} overdue</span>
              ) : null}
            </>
          ) : (
            <>
              <span className="recorded-row-room">{formatTaskPlace(optimisticTask.locationName, optimisticTask.roomName)}</span>
              {optimisticTask.assignmentUserName && !childMode ? (
                <span className="recorded-row-assignee">
                  <span className="assignee-avatar" style={nameToAvatarStyle(optimisticTask.assignmentUserName)}>
                    {nameInitials(optimisticTask.assignmentUserName)}
                  </span>
                  {optimisticTask.assignmentUserName}
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
            task={optimisticTask}
            canEditTasks={canEditTasks}
            canAcceptReward={canAcceptReward}
            hasReward={hasReward}
            rewardLabel={rewardLabel}
            basePath={basePath}
          />
        ) : isProject ? (
          <TaskCardProjectDetail
            task={optimisticTask}
            peopleOptions={peopleOptions}
            canManageProjects={canManageProjects}
            canDemoteProject={canDemoteProject}
            hasLegacyProjectPlanning={hasLegacyProjectPlanning}
            rewardLabel={rewardLabel}
            basePath={basePath}
          />
        ) : (
          <TaskCardStandardDetail
            task={optimisticTask}
            isOpen={open}
            groupedRoomOptions={groupedRoomOptions}
            peopleOptions={peopleOptions}
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
