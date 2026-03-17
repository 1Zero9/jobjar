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
            <article key={task.id} className="today-task-card">
              <div className="today-task-main">
                <Link href={`/tasks#task-${task.id}`} className="today-task-title">
                  {task.title}
                </Link>
                <p className="today-task-meta">
                  <span>{task.locationName ? `${task.locationName} · ${displayRoomName(task.roomName)}` : displayRoomName(task.roomName)}</span>
                  {task.projectParentTitle ? <span>Part of: {task.projectParentTitle}</span> : null}
                  {task.dueAt ? <span className="today-task-due">{formatDueLabel(task.dueAt)}</span> : null}
                </p>
              </div>
              <div className="today-task-side">
                {task.rewardCents !== null ? <span className="today-task-reward">{formatMoney(task.rewardCents)}</span> : null}
                {canAct ? renderHomeTaskAction(task, childMode) : null}
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
  const tomorrowStart = todayStart + (24 * 60 * 60 * 1000);
  const dueTime = due.getTime();

  if (dueTime < now.getTime()) {
    return "Overdue";
  }
  if (dueTime < tomorrowStart) {
    return `Today ${new Intl.DateTimeFormat("en-IE", { hour: "numeric", minute: "2-digit" }).format(due)}`;
  }

  return new Intl.DateTimeFormat("en-IE", { month: "short", day: "numeric" }).format(due);
}

function displayRoomName(roomName: string) {
  return roomName.toLowerCase() === "unsorted" ? "General" : roomName;
}

function renderHomeTaskAction(task: HomeTaskItem, childMode: boolean) {
  const needsStart = task.validationMode === "strict" && task.captureStage !== "active";

  if (needsStart) {
    return (
      <form action={startTaskAction} className="today-task-form">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="returnTo" value="/" />
        <FormActionButton className={`action-btn subtle quiet today-task-action ${childMode ? "today-task-action-kid" : ""}`.trim()} pendingLabel="Starting">
          Start
        </FormActionButton>
      </form>
    );
  }

  return (
    <form action={completeTaskAction} className="today-task-form">
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="note" value="" />
      <input type="hidden" name="returnTo" value="/" />
      <FormActionButton className={`action-btn bright quiet today-task-action ${childMode ? "today-task-action-kid" : ""}`.trim()} pendingLabel="Saving">
        Done
      </FormActionButton>
    </form>
  );
}
