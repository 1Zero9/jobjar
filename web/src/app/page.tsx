import { createQuickTaskAction, deleteTaskAction, logoutAction, luckyDipAction, updateRecordedTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; lucky?: string; room?: string }>;
}) {
  const params = await searchParams;
  const { householdId, userId, role } = await requireSessionContext("/");

  const [currentUser, rooms, people, recordedTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.room.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        room: {
          select: { name: true, designation: true },
        },
        projectParent: {
          select: { id: true, title: true },
        },
        projectChildren: {
          where: { active: true },
          select: { id: true },
        },
        assignments: {
          where: { assignedTo: null },
          orderBy: { assignedFrom: "desc" },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const roomOptions = uniqueRoomsByName(rooms).filter((room) => room.name.toLowerCase() !== "unsorted");
  const peopleOptions = people.map((member) => member.user);
  const groupedRoomOptions = groupRoomsByDesignation(roomOptions);
  const selectedRoomId = roomOptions.some((room) => room.id === params.room) ? params.room : "";
  const visibleTasks = selectedRoomId
    ? recordedTasks.filter((task) => task.roomId === selectedRoomId)
    : recordedTasks;
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? visibleTasks.find((task) => task.id === params.lucky) ?? recordedTasks.find((task) => task.id === params.lucky)
    : null;

  return (
    <div className="capture-shell min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <header className="capture-topbar">
          <div>
            <p className="capture-kicker">Task Jar</p>
            <h1 className="capture-title">Record a task</h1>
            <p className="capture-subtitle">
              Walk into a room, note the job, move on.
            </p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="#recorded" className="action-btn subtle quiet">
              View recorded
            </Link>
            {role === "admin" ? (
              <Link href="/settings" className="action-btn subtle quiet">
                Manage rooms
              </Link>
            ) : null}
            <form action={logoutAction}>
              <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                Log out
              </FormActionButton>
            </form>
          </div>
        </header>

        {params.added === "task" ? <ToastNotice message="Task recorded." tone="success" /> : null}
        {params.updated === "task" ? <ToastNotice message="Task updated." tone="info" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No tasks available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}

        <section className="capture-panel-simple">
          <div className="capture-step">
            <p className="capture-step-label">1. Task</p>
            <form action={createQuickTaskAction} className="capture-form-simple">
              <input
                name="title"
                type="text"
                required
                placeholder="Light bulb out"
                className="capture-main-input"
                autoFocus
              />

              <div className="capture-step">
                <p className="capture-step-label">2. Room (optional)</p>
                <select name="roomId" defaultValue="" className="capture-room-select">
                  <option value="">No room yet</option>
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
              </div>

              <FormActionButton className="capture-submit-btn" pendingLabel="Saving task">
                Save task
              </FormActionButton>
            </form>
            <form action={luckyDipAction}>
              <FormActionButton className="action-btn subtle w-full" pendingLabel="Choosing task">
                Lucky dip
              </FormActionButton>
            </form>
          </div>
        </section>

        <section id="recorded" className="recorded-panel">
          <div className="recorded-header">
            <div>
              <p className="capture-kicker">Recorded</p>
              <h2 className="recorded-title">Tasks recorded</h2>
            </div>
            <span className="recorded-count">{visibleTasks.length}</span>
          </div>

          <form method="get" action="/" className="recorded-filter-bar">
            <label className="recorded-filter-field">
              <span>Filter by room</span>
              <select name="room" defaultValue={selectedRoomId} className="recorded-filter-select">
                <option value="">All rooms</option>
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
            <FormActionButton className="action-btn subtle quiet" pendingLabel="Applying">
              Apply
            </FormActionButton>
            {selectedRoomId ? (
              <Link href="/#recorded" className="action-btn subtle quiet">
                Clear
              </Link>
            ) : null}
          </form>

          <div className="recorded-list">
            {visibleTasks.length === 0 ? (
              <p className="recorded-empty">
                {selectedRoomId ? "No tasks recorded for this room yet." : "No tasks recorded yet."}
              </p>
            ) : (
              visibleTasks.map((task, index) => (
                <details
                  key={task.id}
                  id={`task-${task.id}`}
                  className={`recorded-row recorded-row-${rowTone(index)}`}
                  open={task.id === params.lucky}
                >
                  <summary className="recorded-row-summary">
                    <div className="min-w-0">
                      <p className="recorded-row-title">{task.title}</p>
                      <div className="recorded-summary-line">
                        {task.projectParent ? <span className="task-chip">Sub-task of {task.projectParent.title}</span> : null}
                        {task.projectChildren.length > 0 ? <span className="task-chip">{task.projectChildren.length} sub-tasks</span> : null}
                      </div>
                    </div>
                    <div className="recorded-row-meta">
                      <span className="recorded-row-edit">Edit</span>
                      <p className="recorded-row-room">{displayRoomName(task.room.name)}</p>
                      <span className="recorded-row-chevron">+</span>
                    </div>
                  </summary>

                  <div className="recorded-row-detail">
                    <form action={updateRecordedTaskAction} className="recorded-edit-form">
                      <input type="hidden" name="taskId" value={task.id} />

                      <label className="recorded-field">
                        <span>Task</span>
                        <input
                          name="title"
                          type="text"
                          defaultValue={task.title}
                          className="recorded-edit-input"
                        />
                      </label>

                      <label className="recorded-field">
                        <span>Room</span>
                        <select name="roomId" defaultValue={task.room.name.toLowerCase() === "unsorted" ? "" : task.roomId} className="recorded-edit-input">
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
                        <select
                          name="assigneeUserId"
                          defaultValue={task.assignments[0]?.userId ?? ""}
                          className="recorded-edit-input"
                        >
                          <option value="">No person</option>
                          {peopleOptions.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.displayName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="recorded-field">
                        <span>Sub-task of</span>
                        <select
                          name="parentTaskId"
                          defaultValue={task.projectParent?.id ?? ""}
                          className="recorded-edit-input"
                        >
                          <option value="">No parent task</option>
                          {recordedTasks
                            .filter((candidate) => candidate.id !== task.id)
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.title}
                              </option>
                            ))}
                        </select>
                      </label>

                      <p><span>Recorded</span><strong>{formatRecordedAt(task.createdAt)}</strong></p>
                      <div className="recorded-row-actions between">
                        <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                          Save changes
                        </FormActionButton>
                      </div>
                    </form>
                    <form action={deleteTaskAction} className="recorded-row-actions">
                      <input type="hidden" name="taskId" value={task.id} />
                      <FormActionButton className="action-btn warn quiet" pendingLabel="Deleting">
                        Delete task
                      </FormActionButton>
                    </form>
                  </div>
                </details>
              ))
            )}
          </div>
        </section>

        <footer className="capture-footer">
          Logged in as {currentUser?.displayName ?? "You"}
        </footer>
      </main>
    </div>
  );
}

function rowTone(index: number) {
  const tones = ["blue", "green", "amber", "rose"] as const;
  return tones[index % tones.length];
}

function formatRecordedAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function displayRoomName(roomName: string) {
  return roomName.toLowerCase() === "unsorted" ? "No room" : roomName;
}

function uniqueRoomsByName<T extends { id: string; name: string }>(rooms: T[]) {
  const seen = new Set<string>();
  return rooms.filter((room) => {
    const key = room.name.trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function groupRoomsByDesignation<T extends { designation?: string | null; name: string }>(rooms: T[]) {
  const grouped = new Map<string, T[]>();
  for (const room of rooms) {
    const key = room.designation?.trim() || "General";
    const entries = grouped.get(key) ?? [];
    entries.push(room);
    grouped.set(key, entries);
  }
  return [...grouped.entries()];
}
