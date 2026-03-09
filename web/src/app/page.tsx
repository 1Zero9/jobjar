import { createQuickTaskAction, deleteTaskAction, logoutAction, updateRecordedTaskAction } from "@/app/actions";
import { requireSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { householdId, userId, role } = await requireSessionContext("/");

  const [currentUser, rooms, people, recordedTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.room.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
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
          select: { name: true },
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

  const roomOptions = rooms.filter((room) => room.name.toLowerCase() !== "unsorted");
  const peopleOptions = people.map((member) => member.user);

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
              <button className="action-btn subtle quiet">Log out</button>
            </form>
          </div>
        </header>

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
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <button className="capture-submit-btn">Save task</button>
            </form>
          </div>
        </section>

        <section id="recorded" className="recorded-panel">
          <div className="recorded-header">
            <div>
              <p className="capture-kicker">Recorded</p>
              <h2 className="recorded-title">Tasks recorded</h2>
            </div>
            <span className="recorded-count">{recordedTasks.length}</span>
          </div>

          <div className="recorded-list">
            {recordedTasks.length === 0 ? (
              <p className="recorded-empty">No tasks recorded yet.</p>
            ) : (
              recordedTasks.map((task, index) => (
                <details key={task.id} className={`recorded-row recorded-row-${rowTone(index)}`}>
                  <summary className="recorded-row-summary">
                    <div className="min-w-0">
                      <p className="recorded-row-title">{task.title}</p>
                    </div>
                    <div className="recorded-row-meta">
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
                          {roomOptions.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
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

                      <p><span>Recorded</span><strong>{formatRecordedAt(task.createdAt)}</strong></p>
                      <div className="recorded-row-actions between">
                        <button className="action-btn bright quiet">Save</button>
                      </div>
                    </form>
                    <form action={deleteTaskAction} className="recorded-row-actions">
                      <input type="hidden" name="taskId" value={task.id} />
                      <button className="action-btn warn quiet">Delete task</button>
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
