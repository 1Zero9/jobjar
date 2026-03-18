"use client";

import { createProjectChildTaskAction, demoteProjectToTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import type { PersonOption, TaskItem } from "@/app/components/task-board-types";
import { displayRoomName, formatMoney, summarizeProject } from "@/app/components/task-board-utils";

type Props = {
  task: TaskItem;
  peopleOptions: PersonOption[];
  canManageProjects: boolean;
  canDemoteProject: boolean;
  hasLegacyProjectPlanning: boolean;
  rewardLabel: string | null;
  basePath: string;
};

export function TaskCardProjectDetail({
  task,
  peopleOptions,
  canManageProjects,
  canDemoteProject,
  hasLegacyProjectPlanning,
  rewardLabel,
  basePath,
}: Props) {
  const projectSummary = summarizeProject(task);
  const hasSubtasks = projectSummary.totalChildren > 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-3 project-panel">
      <div className="room-setup-header">
        <div>
          <p className="settings-kicker">Parent job</p>
          <h3 className="recorded-title">Steps</h3>
        </div>
      </div>

      <p className="task-readonly-note">
        Break bigger work into a few simple steps. Those steps show in the jobs list like normal jobs.
      </p>

      <div className="task-overview-grid project-overview-grid">
        <p><span>Where</span><strong>{task.locationName ? `${task.locationName} · ${displayRoomName(task.roomName)}` : displayRoomName(task.roomName)}</strong></p>
        <p><span>Assigned</span><strong>{task.assignmentUserName ?? "No one yet"}</strong></p>
        <p><span>Subtasks</span><strong>{projectSummary.completedChildren} of {projectSummary.totalChildren}</strong></p>
        <p><span>Overdue</span><strong>{projectSummary.overdueChildren}</strong></p>
        {task.rewardCents !== null ? <p><span>Reward</span><strong>{rewardLabel}</strong></p> : null}
      </div>

      {hasSubtasks ? (
        <p className="task-readonly-note">
          {projectSummary.overdueChildren > 0
            ? `${projectSummary.overdueChildren} step${projectSummary.overdueChildren === 1 ? "" : "s"} need attention.`
            : "Your subtasks appear below in the jobs list."}
        </p>
      ) : (
        <p className="recorded-empty">No steps yet. Add the first one below.</p>
      )}

      {canManageProjects ? (
        <div className="project-manage-stack">
          <form action={createProjectChildTaskAction} className="recorded-edit-form">
            <input type="hidden" name="projectId" value={task.id} />
            <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
            <label className="recorded-field">
              <span>Add next step</span>
              <input name="title" type="text" required placeholder="Patch walls" className="recorded-edit-input" />
            </label>
            <div className="recorded-row-actions between">
              <FormActionButton className="action-btn bright quiet" pendingLabel="Adding step">
                Add step
              </FormActionButton>
            </div>
            <details className="recorded-more-details">
              <summary className="recorded-more-summary">Add step details</summary>
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
            </details>
          </form>

          <details className="recorded-more-details">
            <summary className="recorded-more-summary">Parent job settings</summary>
            <div className="recorded-edit-form">
              <p className="task-readonly-note">
                {canDemoteProject
                  ? "Turn this back into a normal job if it no longer needs subtasks."
                  : "Clear subtasks first before changing this back into a normal job."}
              </p>
              {canDemoteProject ? (
                <form action={demoteProjectToTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="returnTo" value={basePath} />
                  <FormActionButton className="action-btn subtle quiet" pendingLabel="Changing">
                    Turn back into a job
                  </FormActionButton>
                </form>
              ) : null}
            </div>
          </details>
        </div>
      ) : null}

      {hasLegacyProjectPlanning ? (
        <details className="recorded-more-details project-collection-details">
          <summary className="recorded-more-summary">Legacy planning data</summary>
          <div className="recorded-edit-form">
            <p className="task-readonly-note">
              Older parent jobs can still carry planning data. It is kept here for reference, but new work should use subtasks instead.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <p><span>Target</span><strong>{task.projectTargetAt ? "Set" : "Not set"}</strong></p>
              <p><span>Budget</span><strong>{task.projectBudgetCents !== null ? formatMoney(task.projectBudgetCents) : "Not set"}</strong></p>
              <p><span>Costs</span><strong>{task.projectCosts.length}</strong></p>
              <p><span>Materials</span><strong>{task.projectMaterials.length}</strong></p>
              <p><span>Milestones</span><strong>{task.projectMilestones.length}</strong></p>
              <p><span>Spend</span><strong>{formatMoney(projectSummary.spentCents)}</strong></p>
            </div>
          </div>
        </details>
      ) : null}
    </section>
  );
}
