"use client";

import { acceptRewardAction, completeTaskAction, reopenTaskAction, startTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import type { TaskItem } from "@/app/components/task-board-types";
import { displayRoomName, formatMoney, formatRecordedAt, getLatestCompletedOccurrence, getTaskState } from "@/app/components/task-board-utils";

type Props = {
  task: TaskItem;
  canEditTasks: boolean;
  canAcceptReward: boolean;
  hasReward: boolean;
  rewardLabel: string | null;
  basePath: string;
};

export function TaskCardChildDetail({
  task,
  canEditTasks,
  canAcceptReward,
  hasReward,
  rewardLabel,
  basePath,
}: Props) {
  const latestCompleted = getLatestCompletedOccurrence(task.occurrences);
  const taskState = getTaskState(task);
  const needsExplicitStart = task.validationMode === "strict" && task.captureStage !== "active" && taskState !== "done";

  return (
    <section className="kid-task-panel">
      {task.detailNotes ? (
        <p className="kid-task-copy">{task.detailNotes}</p>
      ) : (
        <p className="kid-task-copy">Pick this job up when you are ready.</p>
      )}
      <div className="kid-task-meta">
        <p><span>Where</span><strong>{displayRoomName(task.roomName)}</strong></p>
        <p><span>Status</span><strong>{getTaskState(task) === "done" ? "Finished" : task.captureStage === "active" ? "In progress" : "Ready to go"}</strong></p>
        {task.projectParentTitle ? <p><span>Parent job</span><strong>{task.projectParentTitle}</strong></p> : null}
        {hasReward ? <p><span>Reward</span><strong>{rewardLabel}</strong></p> : null}
        {task.schedule?.nextDueAt ? <p><span>Due</span><strong>{formatRecordedAt(task.schedule.nextDueAt)}</strong></p> : null}
        {latestCompleted?.completedAt ? <p><span>Last finished</span><strong>{formatRecordedAt(latestCompleted.completedAt)}</strong></p> : null}
      </div>
      <div className="recorded-row-actions kid-task-actions">
        {taskState === "done" ? (
          canEditTasks ? (
            <form action={reopenTaskAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Opening">
                Not done yet
              </FormActionButton>
            </form>
          ) : null
        ) : canEditTasks ? (
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
            {needsExplicitStart ? (
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
        ) : null}
      </div>
    </section>
  );
}
