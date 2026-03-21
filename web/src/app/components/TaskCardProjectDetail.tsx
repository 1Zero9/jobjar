"use client";

import { closeJobWithStepsAction, completeTaskAction, createProjectChildTaskAction, removeStepsAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import type { TaskItem } from "@/app/components/task-board-types";
import { summarizeProject } from "@/app/components/task-board-utils";
import { getSuggestedSteps } from "@/lib/subtask-suggestions";
import { useState } from "react";

type Props = {
  task: TaskItem;
  canManageProjects: boolean;
  basePath: string;
};

export function TaskCardProjectDetail({ task, canManageProjects, basePath }: Props) {
  const [stepTitle, setStepTitle] = useState("");
  const projectSummary = summarizeProject(task);
  const suggestions = getSuggestedSteps(task.title);
  const progressPct = projectSummary.totalChildren > 0
    ? Math.round((projectSummary.completedChildren / projectSummary.totalChildren) * 100)
    : 0;
  const allDone = projectSummary.totalChildren > 0 && projectSummary.completedChildren === projectSummary.totalChildren;

  return (
    <section className="project-panel">

      {/* Progress */}
      <div className="project-panel-progress">
        <div className="project-panel-progress-track">
          <div className="project-panel-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="project-panel-progress-label">
          {projectSummary.completedChildren} of {projectSummary.totalChildren}{" "}
          {projectSummary.totalChildren === 1 ? "step" : "steps"} done
        </p>
      </div>

      {/* Step checklist */}
      {task.projectChildren.length > 0 ? (
        <ul className="step-checklist">
          {task.projectChildren.map((step) => {
            const done = step.captureStage === "done" || step.occurrences[0]?.status === "done";
            return (
              <li key={step.id} className={`step-row ${done ? "step-row-done" : ""}`.trim()}>
                <span className="step-row-title">{step.title}</span>
                {done ? (
                  <span className="step-row-tick" aria-label="Done">✓</span>
                ) : canManageProjects ? (
                  <form action={completeTaskAction}>
                    <input type="hidden" name="taskId" value={step.id} />
                    <input type="hidden" name="note" value="" />
                    <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
                    <FormActionButton className="step-done-btn" pendingLabel="…">
                      Done
                    </FormActionButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="step-empty-note">No steps yet — add one below.</p>
      )}

      {canManageProjects ? (
        <div className="project-manage-stack">

          {/* Suggested steps */}
          {suggestions.length > 0 && !allDone ? (
            <div className="step-suggestions">
              <p className="step-suggestions-label">Tap to add a suggested step:</p>
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

          {/* Add step — just a name, nothing else */}
          {!allDone ? (
            <form action={createProjectChildTaskAction} className="step-add-form">
              <input type="hidden" name="projectId" value={task.id} />
              <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
              <input
                name="title"
                type="text"
                required
                placeholder="Add a step…"
                className="step-add-input"
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
              />
              <FormActionButton className="action-btn bright quiet" pendingLabel="Adding">
                Add
              </FormActionButton>
            </form>
          ) : null}

          {/* Close whole job */}
          <div className="step-footer-actions">
            <form action={closeJobWithStepsAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="returnTo" value={basePath} />
              <FormActionButton className="action-btn bright quiet" pendingLabel="Closing…">
                {allDone ? "Close job" : "Close whole job"}
              </FormActionButton>
            </form>

            {/* Remove steps / back to single job */}
            <form action={removeStepsAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="returnTo" value={`${basePath}#task-${task.id}`} />
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Removing…">
                Remove steps
              </FormActionButton>
            </form>
          </div>

        </div>
      ) : null}
    </section>
  );
}
