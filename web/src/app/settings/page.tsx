import {
  createPersonAction,
  createRoomAction,
  deleteRoomAction,
  logoutAction,
  removePersonAction,
  setPersonPasscodeAction,
  updateRoomAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminData } from "@/lib/admin-data";
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

export default async function SettingsPage() {
  const { householdId } = await requireAdmin("/settings");
  const { rooms, people } = await getAdminData({ householdId });

  const visibleRooms = rooms.filter((room) => room.name.toLowerCase() !== "unsorted");
  const systemRoom = rooms.find((room) => room.name.toLowerCase() === "unsorted");

  return (
    <div className="settings-shell min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <header className="settings-hero">
          <div>
            <p className="settings-kicker">Room Setup</p>
            <h1 className="settings-title">Manage rooms and people</h1>
            <p className="settings-copy">
              Rooms added here appear in the task recorder. Start with the spaces you actually use.
            </p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/" className="action-btn subtle quiet">
              Back to recorder
            </Link>
            <form action={logoutAction}>
              <button className="action-btn subtle quiet">Log out</button>
            </form>
          </div>
        </header>

        <section className="settings-panel">
          <div className="room-setup-header">
            <div>
              <p className="settings-kicker">Room setup</p>
              <h2 className="recorded-title">Choose your spaces</h2>
            </div>
            <span className="recorded-count">{visibleRooms.length}</span>
          </div>

          <form action={createRoomAction} className="capture-form-simple">
            <div className="capture-step">
              <p className="capture-step-label">Add a room</p>
              <input name="name" type="text" required placeholder="Utility room" className="capture-main-input" />
              <input name="designation" type="hidden" value="General household tasks" />
            </div>
            <button className="capture-submit-btn">Add room</button>
          </form>

          <div className="room-preset-wrap">
            <p className="capture-step-label">Common rooms</p>
            <div className="room-preset-grid">
              {roomPresets.map((preset) => (
                <form key={preset} action={createRoomAction}>
                  <input type="hidden" name="name" value={preset} />
                  <input type="hidden" name="designation" value="General household tasks" />
                  <button className="action-btn subtle quiet w-full">{preset}</button>
                </form>
              ))}
            </div>
          </div>

          <div className="recorded-list">
            {visibleRooms.map((room) => (
              <article key={room.id} className="recorded-row recorded-row-blue">
                <div className="recorded-row-detail">
                  <form action={updateRoomAction} className="recorded-edit-form">
                    <input type="hidden" name="roomId" value={room.id} />
                    <label className="recorded-field">
                      <span>Room name</span>
                      <input name="name" type="text" defaultValue={room.name} className="recorded-edit-input" />
                    </label>
                    <label className="recorded-field">
                      <span>What belongs here</span>
                      <input name="designation" type="text" defaultValue={room.designation} className="recorded-edit-input" />
                    </label>
                    <p><span>Tasks</span><strong>{room.taskCount}</strong></p>
                    <div className="recorded-row-actions between">
                      <button className="action-btn bright quiet">Save room</button>
                    </div>
                  </form>
                  <form action={deleteRoomAction} className="recorded-row-actions">
                    <input type="hidden" name="roomId" value={room.id} />
                    <button className="action-btn warn quiet">Archive room</button>
                  </form>
                </div>
              </article>
            ))}

            {visibleRooms.length === 0 ? (
              <p className="recorded-empty">No rooms yet. Add the spaces you want in the task dropdown.</p>
            ) : null}

            {systemRoom ? (
              <article className="recorded-row recorded-row-amber">
                <div className="recorded-row-detail">
                  <p><span>System room</span><strong>No room</strong></p>
                  <p><span>Used for</span><strong>Tasks saved without a room</strong></p>
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section className="settings-panel">
          <div className="room-setup-header">
            <div>
              <p className="settings-kicker">People</p>
              <h2 className="recorded-title">Who can own tasks</h2>
            </div>
            <span className="recorded-count">{people.length}</span>
          </div>

          <form action={createPersonAction} className="capture-form-simple">
            <input name="displayName" type="text" required placeholder="Name" className="capture-main-input" />
            <input name="email" type="email" placeholder="Email (optional)" className="capture-room-select" />
            <input name="passcode" type="password" minLength={4} placeholder="Passcode" className="capture-room-select" />
            <button className="capture-submit-btn">Add person</button>
          </form>

          <div className="recorded-list">
            {people.map((person) => (
              <article key={person.id} className="recorded-row recorded-row-green">
                <div className="recorded-row-detail">
                  <p><span>Name</span><strong>{person.displayName}</strong></p>
                  <p><span>Role</span><strong>{person.role}</strong></p>
                  <p><span>Email</span><strong>{person.email}</strong></p>
                  <form action={setPersonPasscodeAction} className="recorded-edit-form">
                    <input type="hidden" name="userId" value={person.id} />
                    <label className="recorded-field">
                      <span>Reset passcode</span>
                      <input name="passcode" type="password" minLength={4} placeholder="New passcode" className="recorded-edit-input" />
                    </label>
                    <div className="recorded-row-actions between">
                      <button className="action-btn bright quiet">Save passcode</button>
                    </div>
                  </form>
                  <form action={removePersonAction} className="recorded-row-actions">
                    <input type="hidden" name="userId" value={person.id} />
                    <button className="action-btn warn quiet">Remove person</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
