import { createRoomAction, deleteRoomAction, logoutAction, updateRoomAction, updateRoomLocationAction } from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const roomPresets = [
  "Kitchen",
  "Living room",
  "Main bedroom",
  "Bathroom",
  "Hall",
  "Garden",
];

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; duplicate?: string }>;
}) {
  const params = await searchParams;
  const { householdId } = await requireAdmin("/settings/rooms");

  const [rooms, locations] = await Promise.all([
    prisma.room.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        designation: true,
        locationId: true,
        location: { select: { id: true, name: true } },
        tasks: {
          where: { active: true },
          select: { id: true },
        },
      },
    }),
    prisma.location.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const visibleRooms = rooms.filter((room) => room.name.toLowerCase() !== "unsorted");
  const systemRoom = rooms.find((room) => room.name.toLowerCase() === "unsorted");
  const groupedRooms = groupRoomsByLocation(visibleRooms);

  return (
    <div className="settings-shell min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title="Rooms"
          subtitle="Only room setup lives here. Keep spaces tidy and the recorder dropdown stays fast."
          iconClassName="rooms"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
            </svg>
          }
          actions={
            <>
              <Link href="/settings" className="action-btn subtle quiet">
                Setup home
              </Link>
              <Link href="/tasks" className="action-btn subtle quiet">
                Tasks
              </Link>
              <form action={logoutAction}>
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                  Log out
                </FormActionButton>
              </form>
            </>
          }
        />

        {params.added === "room" ? <ToastNotice message="Room added." tone="success" /> : null}
        {params.duplicate === "room" ? <ToastNotice message="That room name already exists." tone="info" /> : null}

        <section className="settings-panel">
          <div className="room-setup-header">
            <div>
              <p className="settings-kicker">Rooms</p>
              <h2 className="recorded-title">Rooms</h2>
            </div>
            <span className="recorded-count">{visibleRooms.length}</span>
          </div>

          <form action={createRoomAction} className="capture-form-simple">
            <input type="hidden" name="returnTo" value="/settings/rooms" />
            <div className="capture-step">
              <p className="capture-step-label">Add a room</p>
              <input name="name" type="text" required placeholder="Utility room" className="capture-main-input" />
              {locations.length > 0 ? (
                <select name="locationId" defaultValue={locations[0]?.id ?? ""} className="capture-room-select">
                  <option value="">No location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              ) : null}
            </div>
            <FormActionButton className="capture-submit-btn" pendingLabel="Adding room">
              Add room
            </FormActionButton>
          </form>

          <div className="room-preset-wrap">
            <p className="capture-step-label">Common rooms</p>
            <div className="room-preset-grid">
              {roomPresets.map((preset) => (
                <form key={preset} action={createRoomAction}>
                  <input type="hidden" name="returnTo" value="/settings/rooms" />
                  <input type="hidden" name="name" value={preset} />
                  <input type="hidden" name="designation" value="General household tasks" />
                  <FormActionButton className="action-btn subtle quiet w-full" pendingLabel="Adding">
                    {preset}
                  </FormActionButton>
                </form>
              ))}
            </div>
          </div>

          <div className="recorded-list">
            {groupedRooms.map(([group, groupRooms], groupIndex) => (
              <section key={group} className="room-group-section">
                <div className="room-group-header">
                  <p className="room-group-title">{group}</p>
                  <span className="recorded-count">{groupRooms.length}</span>
                </div>
                <div className="recorded-list room-group-list">
                  {groupRooms.map((room) => (
                    <details key={room.id} className={`recorded-row recorded-row-${rowTone(groupIndex)}`}>
                      <summary className="recorded-row-summary">
                        <div className="recorded-row-top">
                          <p className="recorded-row-title">{room.name}</p>
                          <span className="recorded-row-chevron">▾</span>
                        </div>
                        <div className="recorded-row-sub">
                          <span className="recorded-row-room">{room.tasks.length} tasks</span>
                          {room.location ? <span className="task-chip">{room.location.name}</span> : null}
                        </div>
                      </summary>
                      <div className="recorded-row-detail">
                        <form action={updateRoomAction} className="recorded-edit-form">
                          <input type="hidden" name="roomId" value={room.id} />
                          <input type="hidden" name="returnTo" value="/settings/rooms" />
                          <label className="recorded-field">
                            <span>Room name</span>
                            <input name="name" type="text" defaultValue={room.name} className="recorded-edit-input" />
                          </label>
                          <p><span>Tasks</span><strong>{room.tasks.length}</strong></p>
                          <div className="recorded-row-actions between">
                            <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                              Save room
                            </FormActionButton>
                          </div>
                        </form>
                        {locations.length > 0 ? (
                          <form action={updateRoomLocationAction} className="recorded-edit-form">
                            <input type="hidden" name="roomId" value={room.id} />
                            <label className="recorded-field">
                              <span>Location</span>
                              <select name="locationId" defaultValue={room.locationId ?? ""} className="recorded-edit-input">
                                <option value="">No location</option>
                                {locations.map((loc) => (
                                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                              </select>
                            </label>
                            <div className="recorded-row-actions between">
                              <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                                Save location
                              </FormActionButton>
                            </div>
                          </form>
                        ) : null}
                        <form action={deleteRoomAction} className="recorded-row-actions">
                          <input type="hidden" name="roomId" value={room.id} />
                          <FormActionButton className="action-btn warn quiet" pendingLabel="Archiving">
                            Archive room
                          </FormActionButton>
                        </form>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            {visibleRooms.length === 0 ? (
              <p className="recorded-empty">No rooms yet. Add the spaces you want in the task dropdown.</p>
            ) : null}

            {systemRoom ? (
              <article className="recorded-row">
                <div className="recorded-row-detail">
                  <p><span>System room</span><strong>No room</strong></p>
                  <p><span>Used for</span><strong>Tasks saved without a room</strong></p>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

function groupRoomsByLocation<T extends { location?: { name: string } | null }>(rooms: T[]) {
  const grouped = new Map<string, T[]>();
  for (const room of rooms) {
    const key = room.location?.name ?? "No location";
    const entries = grouped.get(key) ?? [];
    entries.push(room);
    grouped.set(key, entries);
  }
  return [...grouped.entries()];
}

function rowTone(index: number) {
  const tones = ["blue", "green", "amber", "rose"] as const;
  return tones[index % tones.length];
}
