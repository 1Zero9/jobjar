"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type LookupTask = {
  id: string;
  title: string;
  detailNotes: string | null;
  roomName: string;
  state: "open" | "done";
};

type SimilarTaskFieldProps = {
  tasks: LookupTask[];
  defaultTitle?: string;
  className?: string;
  label?: string;
  placeholder?: string;
};

export function SimilarTaskField({
  tasks,
  defaultTitle = "",
  className = "",
  label = "Task",
  placeholder = "Light bulb out",
}: SimilarTaskFieldProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [debouncedTitle, setDebouncedTitle] = useState(defaultTitle);
  const [parentTask, setParentTask] = useState<LookupTask | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedTitle(title), 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title]);

  const similarTasks =
    debouncedTitle.trim().length < 3
      ? []
      : tasks
          .map((task) => ({
            task,
            score: scoreTaskSimilarity(debouncedTitle, task),
          }))
          .filter((entry) => entry.score >= 0.22)
          .sort((a, b) => b.score - a.score || a.task.title.localeCompare(b.task.title))
          .slice(0, 4)
          .map((entry) => entry.task);

  return (
    <div className={`capture-step ${className}`.trim()}>
      <span className="capture-step-label">{label}</span>
      <input
        name="title"
        type="text"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
        className="capture-main-input"
        autoFocus
      />

      {parentTask ? <input type="hidden" name="projectParentId" value={parentTask.id} /> : null}

      {parentTask ? (
        <div className="lookup-parent-banner">
          <span>Adding under</span>
          <strong>{parentTask.title}</strong>
          <button type="button" className="action-btn subtle quiet" onClick={() => setParentTask(null)}>
            Clear
          </button>
        </div>
      ) : null}

      {similarTasks.length > 0 ? (
        <details className="similar-task-warning">
          <summary className="recorded-row-summary">
            <div className="min-w-0">
              <p className="recorded-row-title">Already on the board?</p>
              <p className="recorded-row-placeholder">Optional. Open a match or add this under a bigger job.</p>
            </div>
            <div className="recorded-row-meta">
              <span className="recorded-row-edit">Optional</span>
              <span className="recorded-row-chevron">+</span>
            </div>
          </summary>

          <div className="similar-task-list">
            {similarTasks.map((task) => (
              <article key={task.id} className="similar-task-item">
              <div className="similar-task-copy">
                  <strong>{task.title}</strong>
                  <span>
                    {task.roomName} · {task.state === "done" ? "Completed" : "Open"}
                  </span>
                </div>
                <div className="similar-task-actions">
                  <Link href={`/tasks#task-${task.id}`} className="recorded-row-edit">
                    Open
                  </Link>
                  <button
                    type="button"
                    className="recorded-row-edit recorded-row-edit-bright"
                    onClick={() => setParentTask(task)}
                  >
                    Add as subtask
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function scoreTaskSimilarity(
  query: string,
  task: {
    title: string;
    detailNotes?: string | null;
  },
) {
  const normalizedQuery = normalizeLookupText(query);
  const normalizedTitle = normalizeLookupText(task.title);
  const normalizedNotes = normalizeLookupText(task.detailNotes ?? "");

  if (!normalizedQuery || !normalizedTitle) {
    return 0;
  }

  if (normalizedQuery === normalizedTitle) {
    return 1;
  }

  const queryTokens = new Set(tokenizeLookupText(normalizedQuery));
  const titleTokens = new Set(tokenizeLookupText(normalizedTitle));
  const sharedTokens = [...queryTokens].filter((token) => titleTokens.has(token)).length;
  const tokenScore = queryTokens.size > 0 ? sharedTokens / queryTokens.size : 0;

  let score = tokenScore * 0.55;
  if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
    score += 0.3;
  }
  if ([...queryTokens].some((token) => normalizedTitle.startsWith(token))) {
    score += 0.08;
  }
  if (normalizedNotes.includes(normalizedQuery)) {
    score += 0.08;
  }

  return Math.min(score, 0.98);
}

function normalizeLookupText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeLookupText(value: string) {
  return value.split(" ").filter((token) => token.length > 1);
}
