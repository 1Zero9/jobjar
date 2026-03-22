import { completeTaskAction, startTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import Link from "next/link";

export type HomeTaskItem = {
  id: string;
  title: string;
  roomName: string;
  locationName: string | null;
  dueAt: string | null;
  rewardCents: number | null;
  projectParentTitle: string | null;
  captureStage: string;
  validationMode: string;
  milestoneTotal: number;
  milestoneDone: number;
};

type Props = {
  title: string;
  emptyMessage: string;
  tasks: HomeTaskItem[];
  canAct: boolean;
  childMode?: boolean;
  emptyActionHref?: string;
  emptyActionLabel?: string;
};

export function HomeTaskList({
  title,
  emptyMessage,
  tasks,
  canAct,
  childMode = false,
  emptyActionHref,
  emptyActionLabel,
}: Props) {
  return (
    <section className="today-section">
      <div className="today-section-head">
        <h2 className="today-section-title">{title}</h2>
        <span className="today-section-count">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="recorded-empty-card">
          <p className="today-empty">{emptyMessage}</p>
          {emptyActionHref && emptyActionLabel ? (
            <div className="recorded-row-actions">
              <Link href={emptyActionHref} className="action-btn subtle quiet">
                {emptyActionLabel}
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="today-task-list">
          {tasks.map((task) => (
            <article key={task.id} className={`today-task-card ${getHomeTaskStateClassName(task)}`.trim()}>
              <Link href={`/tasks#task-${task.id}`} className="today-task-link-surface">
                <div className="today-task-main">
                <div className="today-task-title-row">
                  <span className="today-task-title">{task.title}</span>
                  <span className={`today-task-state ${getHomeTaskStateClassName(task)}-badge`.trim()}>
                    {getHomeTaskStateLabel(task)}
                  </span>
                </div>
                <p className="today-task-meta">
                  <span className="today-task-meta-chip">{task.locationName ? `${task.locationName} · ${displayRoomName(task.roomName)}` : displayRoomName(task.roomName)}</span>
                  {task.projectParentTitle ? <span className="today-task-meta-chip">Part of: {task.projectParentTitle}</span> : null}
                  {task.dueAt ? <span className="today-task-meta-chip today-task-due">{formatDueLabel(task.dueAt)}</span> : null}
                </p>
                {task.milestoneTotal > 0 ? (
                  <div className="task-milestone-bar-wrap">
                    <div className="task-milestone-track">
                      <div
                        className="task-milestone-fill"
                        style={{ width: `${Math.round((task.milestoneDone / task.milestoneTotal) * 100)}%` }}
                      />
                    </div>
                    <span className="task-milestone-label">{task.milestoneDone}/{task.milestoneTotal} milestones</span>
                  </div>
                ) : null}
                </div>
              </Link>
              <div className="today-task-side">
                {task.rewardCents !== null ? <span className="today-task-reward">{formatMoney(task.rewardCents)}</span> : null}
                {renderHomeTaskActions(task, childMode, canAct)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDueLabel(value: string) {
  const due = new Date(value);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const dueTime = due.getTime();
  const msLeft = dueTime - now.getTime();

  if (dueTime < now.getTime()) {
    return "Overdue";
  }
  if (dueTime < tomorrowStart) {
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    if (hoursLeft < 1) return `Due in ${minutesLeft}m`;
    if (minutesLeft === 0) return `Due in ${hoursLeft}h`;
    return `Due in ${hoursLeft}h ${minutesLeft}m`;
  }

  const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000;
  if (dueTime < tomorrowEnd) {
    return `Tomorrow ${new Intl.DateTimeFormat("en-IE", { hour: "numeric", minute: "2-digit" }).format(due)}`;
  }

  return new Intl.DateTimeFormat("en-IE", { month: "short", day: "numeric" }).format(due);
}

function displayRoomName(roomName: string) {
  return roomName.toLowerCase() === "unsorted" ? "General" : roomName;
}

function renderHomeTaskActions(task: HomeTaskItem, childMode: boolean, canAct: boolean) {
  const openHref = `/tasks#task-${task.id}`;
  const needsStart = task.validationMode === "strict" && task.captureStage !== "active";

  if (!canAct) {
    return (
      <div className="today-task-actions">
        <Link href={openHref} className="action-btn subtle quiet today-task-open">
          Open
        </Link>
      </div>
    );
  }

  if (needsStart) {
    return (
      <div className="today-task-actions">
        <Link href={openHref} className="action-btn subtle quiet today-task-open">
          Open
        </Link>
        <form action={startTaskAction} className="today-task-form">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="returnTo" value="/" />
          <FormActionButton className={`action-btn subtle quiet today-task-action ${childMode ? "today-task-action-kid" : ""}`.trim()} pendingLabel="Starting">
            Start
          </FormActionButton>
        </form>
      </div>
    );
  }

  return (
    <div className="today-task-actions">
      <Link href={openHref} className="action-btn subtle quiet today-task-open">
        Open
      </Link>
      <form action={completeTaskAction} className="today-task-form">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="note" value="" />
        <input type="hidden" name="returnTo" value="/" />
        <FormActionButton className={`action-btn bright quiet today-task-action ${childMode ? "today-task-action-kid" : ""}`.trim()} pendingLabel="Saving">
          Done
        </FormActionButton>
      </form>
    </div>
  );
}

function getHomeTaskStateClassName(task: HomeTaskItem) {
  if (task.captureStage === "active") {
    return "today-task-in-progress";
  }
  if (task.dueAt && isOverdue(task.dueAt)) {
    return "today-task-attention";
  }
  if (task.dueAt && isDueToday(task.dueAt)) {
    return "today-task-due";
  }
  return "today-task-open-state";
}

function getHomeTaskStateLabel(task: HomeTaskItem) {
  if (task.captureStage === "active") {
    return "In progress";
  }
  if (task.dueAt && isOverdue(task.dueAt)) {
    return "Needs attention";
  }
  if (task.dueAt && isDueToday(task.dueAt)) {
    return "Due today";
  }
  return "Open";
}

function isOverdue(value: string) {
  return new Date(value).getTime() < Date.now();
}

function isDueToday(value: string) {
  const due = new Date(value);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const dueTime = due.getTime();
  return dueTime >= todayStart && dueTime < tomorrowStart;
}
