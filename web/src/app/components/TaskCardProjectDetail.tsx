"use client";

import { createProjectChildTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import type { PersonOption, TaskItem } from "@/app/components/task-board-types";
import { summarizeProject } from "@/app/components/task-board-utils";
import { getSuggestedSteps } from "@/lib/subtask-suggestions";
import { useState } from "react";

type Props = {
  task: TaskItem;
  peopleOptions: PersonOption[];
  canManageProjects: boolean;
  basePath: string;
};

export function TaskCardProjectDetail({ task, peopleOptions, canManageProjects, basePath }: Props) {
  const [stepTitle, setStepTitle] = useState("");
  const projectSummary = summarizeProject(task);
  const suggestions = getSuggestedSteps(task.title);
  const progressPct = projectSummary.totalChildren > 0
    ? Math.round((projectSummary.completedChildren / projectSummary.totalChildren) * 100)
    : 0;

  return (
    <section className="project-panel">
      <div className="project-panel-header">
        <div className="project-panel-progress">
          <div className="project-panel-progress-track">
            <div className="project-panel-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="project-panel-progress-label">
            {projectSummary.completedChildren} of {projectSummary.totalChildren}{" "}
            {projectSummary.totalChildren === 1 ? "step" : "steps"} done
            {projectSummary.overdueChildren > 0 ? ` · ${projectSummary.overdueChildren} overdue` : ""}
          </p>
        </div>
      </div>

      <p className="task-readonly-note">
        Steps appear as individual jobs in the list. When all steps are done, this job closes automatically.
      </p>

      {canManageProjects ? (
        <div className="project-manage-stack">
          {suggestions.length > 0 ? (
            <div className="step-suggestions">
              <p className="step-suggestions-label">Suggested steps — tap to add:</p>
              <div className="step-suggestion-chips">
                {suggestions.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`step-suggestion-chip ${stepTitle === step ? "is-selected" : ""}`.trim()}
                    onClick={() => setStepTitle((prev) => (prev === step ? "" : step))}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form action={createProjectChildTaskAction} className="recorded-edit-form">
            <input type="hidden" name="projectId" value={task.id} />
            <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
            <label className="recorded-field">
              <span>Add next step</span>
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. Tape edges"
                className="recorded-edit-input"
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
              />
            </label>
            <div className="recorded-row-actions between">
              <FormActionButton className="action-btn bright quiet" pendingLabel="Adding step">
                Add step
              </FormActionButton>
            </div>
            <details className="recorded-more-details">
              <summary className="recorded-more-summary">Step details</summary>
              <label className="recorded-field">
                <span>Notes</span>
                <input name="detailNotes" type="text" placeholder="Optional detail" className="recorded-edit-input" />
              </label>
              <div className="capture-meta-grid">
                <label className="recorded-field">
                  <span>Assign to</span>
                  <select name="assigneeUserId" defaultValue="" className="recorded-edit-input">
                    <option value="">No one</option>
                    {peopleOptions.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="recorded-field">
                  <span>Est. minutes</span>
                  <input name="estimatedMinutes" type="number" min={1} defaultValue={30} className="recorded-edit-input" />
                </label>
              </div>
              <label className="recorded-field">
                <span>Due date</span>
                <input name="dueAt" type="datetime-local" className="recorded-edit-input" />
              </label>
            </details>
          </form>
        </div>
      ) : null}
    </section>
  );
}
