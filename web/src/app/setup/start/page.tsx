import {
  createPersonAction,
  createRoomAction,
  createTaskAction,
} from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SETUP_ROOM_PRESETS = [
  "Kitchen",
  "Main bedroom",
  "Bathroom",
  "Hall",
  "Garden",
] as const;

type SearchParams = {
  added?: string;
  duplicate?: string;
  error?: string;
};

export default async function SetupStartPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { householdId } = await requireAdmin("/setup/start");

  const [people, rooms, locations, taskCount] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.room.findMany({
      where: {
        householdId,
        active: true,
        name: { not: "Unsorted" },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        location: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.location.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.task.count({
      where: {
        active: true,
        room: { householdId },
      },
    }),
  ]);

  const sharedBoardReady = people.length > 1;
  const roomsReady = rooms.length > 0;
  const firstJobReady = taskCount > 0;
  const setupReady = roomsReady && firstJobReady;
  const nextRequiredStep = !roomsReady ? "rooms" : !firstJobReady ? "first-job" : "done";
  const nextStepHref =
    nextRequiredStep === "rooms"
      ? "#step-rooms"
      : nextRequiredStep === "first-job"
        ? "#step-first-job"
        : "/tasks";
  const nextStepLabel =
    nextRequiredStep === "rooms"
      ? "Add the first room"
      : nextRequiredStep === "first-job"
        ? "Add the first job"
        : "Open jobs";
  const nextStepCopy =
    nextRequiredStep === "rooms"
      ? "Start with one real place where jobs happen. Kitchen, hall, bedroom, or garden is enough."
      : nextRequiredStep === "first-job"
        ? "You have a room now. Add one real job so home, jobs, and quick log all have something to show."
        : "The basics are in place. You can start using the app normally and add more structure later.";

  return (
    <div className="settings-shell page-settings min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[36rem] flex-col gap-6">
        <AppPageHeader
          title="Guided setup"
          subtitle="Take the short route: people, rooms, then the first job."
          iconClassName="settings"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h16" />
              <path d="M12 4v16" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          }
        />

        {params.added === "person" ? <ToastNotice message="Person added." tone="success" /> : null}
        {params.added === "room" ? <ToastNotice message="Room added." tone="success" /> : null}
        {params.added === "task" ? <ToastNotice message="First job added." tone="success" /> : null}
        {params.duplicate === "room" ? <ToastNotice message="That room name already exists." tone="info" /> : null}
        {params.error ? <ToastNotice message={getSetupErrorMessage(params.error)} tone="error" /> : null}

        <section className="landing-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="settings-kicker">Progress</p>
              <h2 className="recorded-title">{setupReady ? "Ready for daily use" : "A few basics left"}</h2>
              <p className="recorded-empty">
                {setupReady
                  ? "The board can run now. You can still add more people, rooms, and locations whenever you want."
                  : "Once you have a room and a first job, the household can start using the app properly."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings" className="recorded-row-edit">Advanced setup</Link>
              {setupReady ? <Link href="/tasks" className="recorded-row-edit recorded-row-edit-bright">Open jobs</Link> : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-4">
            <p className="settings-kicker">Do this next</p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-foreground">{nextStepLabel}</h3>
                <p className="mt-1 text-sm text-muted">{nextStepCopy}</p>
                {!sharedBoardReady ? (
                  <p className="mt-2 text-sm text-muted">
                    Optional before that: add another person if the board will be shared.
                  </p>
                ) : null}
                {locations.length > 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    Locations are optional and can wait until later.
                  </p>
                ) : null}
              </div>
              {setupReady ? (
                <Link href="/tasks" className="recorded-row-edit recorded-row-edit-bright">
                  Open jobs
                </Link>
              ) : (
                <a href={nextStepHref} className="recorded-row-edit recorded-row-edit-bright">
                  {nextStepLabel}
                </a>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <StatusCount label="People" value={people.length} done={sharedBoardReady} optional />
            <StatusCount label="Rooms" value={rooms.length} done={roomsReady} />
            <StatusCount label="Jobs" value={taskCount} done={firstJobReady} />
          </div>
        </section>

        <section id="step-people" className="settings-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="settings-kicker">Step 1</p>
              <h2 className="recorded-title">People</h2>
              <p className="recorded-empty">
                Add someone else if this board is shared. If the app is just for you, you can leave this for later.
              </p>
            </div>
            <span className={`task-chip ${sharedBoardReady ? "task-chip-done" : ""}`}>
              {sharedBoardReady ? "Done" : "Optional"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {people.map((person) => (
              <span key={person.user.id} className="task-chip">
                {person.user.displayName} · {formatRole(person.role)}
              </span>
            ))}
          </div>

          {!sharedBoardReady ? (
            <form action={createPersonAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="hidden" name="returnTo" value="/setup/start#step-rooms" />
              <label className="recorded-field sm:col-span-2">
                <span>Name</span>
                <input name="displayName" type="text" required placeholder="Sam" className="recorded-edit-input" />
              </label>
              <label className="recorded-field">
                <span>Passcode</span>
                <input name="passcode" type="password" minLength={4} required placeholder="Needed to sign in" className="recorded-edit-input" />
              </label>
              <label className="recorded-field">
                <span>Role</span>
                <select name="role" defaultValue="member" className="recorded-edit-input">
                  <option value="member">Member</option>
                  <option value="power_user">Power user</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <details className="recorded-more-details sm:col-span-2">
                <summary className="recorded-more-summary">Age group and theme</summary>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="recorded-field">
                    <span>Age group</span>
                    <select name="audienceBand" defaultValue="adult" className="recorded-edit-input">
                      <option value="adult">Adult</option>
                      <option value="teen_12_18">12 to 18</option>
                      <option value="under_12">Under 12</option>
                    </select>
                  </label>
                  <label className="recorded-field">
                    <span>Theme</span>
                    <select name="profileTheme" defaultValue="default_theme" className="recorded-edit-input">
                      <option value="default_theme">Default</option>
                      <option value="boy_blue">Boy / blue</option>
                      <option value="girl_pink">Girl / pink</option>
                    </select>
                  </label>
                </div>
              </details>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                <FormActionButton className="action-btn bright" pendingLabel="Adding">
                  Add person
                </FormActionButton>
                <a href="#step-rooms" className="recorded-row-edit">Skip for now</a>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="recorded-row-placeholder">You already have more than one person on the board.</p>
              <Link href="/settings/people" className="recorded-row-edit">Manage people</Link>
            </div>
          )}
        </section>

        <section id="step-rooms" className="settings-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="settings-kicker">Step 2</p>
              <h2 className="recorded-title">Rooms</h2>
              <p className="recorded-empty">
                Add the first real place where jobs happen. Keep it simple: kitchen, bedroom, hall, garden.
              </p>
            </div>
            <span className={`task-chip ${roomsReady ? "task-chip-done" : "task-chip-due"}`}>
              {roomsReady ? "Done" : "Do this next"}
            </span>
          </div>

          {rooms.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {rooms.map((room) => (
                <span key={room.id} className="task-chip">
                  {room.location?.name ? `${room.location.name} · ` : ""}
                  {room.name}
                </span>
              ))}
            </div>
          ) : null}

          {!roomsReady ? (
            <form action={createRoomAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="hidden" name="returnTo" value="/setup/start#step-first-job" />
              <label className="recorded-field sm:col-span-2">
                <span>Room name</span>
                <input name="name" type="text" required placeholder="Kitchen" className="recorded-edit-input" />
              </label>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                <FormActionButton className="action-btn bright" pendingLabel="Adding">
                  Add room
                </FormActionButton>
                <Link href="/settings/rooms" className="recorded-row-edit">Manage rooms</Link>
              </div>
              <details className="recorded-more-details sm:col-span-2">
                <summary className="recorded-more-summary">Add room details</summary>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {locations.length > 0 ? (
                    <label className="recorded-field">
                      <span>Location</span>
                      <select name="locationId" defaultValue="" className="recorded-edit-input">
                        <option value="">No location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="recorded-field">
                    <span>Group label</span>
                    <input name="designation" type="text" placeholder="General" className="recorded-edit-input" />
                  </label>
                </div>
              </details>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="recorded-row-placeholder">Good enough to keep going. You can add more rooms later.</p>
              <Link href="/settings/rooms" className="recorded-row-edit">Manage rooms</Link>
            </div>
          )}

          {!roomsReady ? (
            <div className="mt-4">
              <p className="recorded-row-placeholder">Quick picks if you want to move faster:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SETUP_ROOM_PRESETS.map((preset) => (
                  <form key={preset} action={createRoomAction}>
                    <input type="hidden" name="returnTo" value="/setup/start#step-first-job" />
                    <input type="hidden" name="name" value={preset} />
                    <FormActionButton className="action-btn subtle quiet" pendingLabel="Adding">
                      {preset}
                    </FormActionButton>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section id="step-first-job" className="settings-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="settings-kicker">Step 3</p>
              <h2 className="recorded-title">First job</h2>
              <p className="recorded-empty">
                Create one real job so the home screen, jobs board, and logging flow all have something to work with.
              </p>
            </div>
            <span className={`task-chip ${firstJobReady ? "task-chip-done" : roomsReady ? "task-chip-due" : ""}`}>
              {firstJobReady ? "Done" : roomsReady ? "Do this next" : "After rooms"}
            </span>
          </div>

          {roomsReady ? (
            !firstJobReady ? (
              <form action={createTaskAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="returnTo" value="/tasks" />
                <label className="recorded-field sm:col-span-2">
                  <span>Job title</span>
                  <input name="title" type="text" required placeholder="Take out the bins" className="recorded-edit-input" />
                </label>
                <label className="recorded-field">
                  <span>Room</span>
                  <select name="roomId" required className="recorded-edit-input">
                    <option value="">Pick a room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.location?.name ? `${room.location.name} · ` : ""}
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                  <FormActionButton className="action-btn bright" pendingLabel="Adding">
                    Add first job
                  </FormActionButton>
                  <Link href="/log" className="recorded-row-edit">Use full log instead</Link>
                </div>
                <details className="recorded-more-details sm:col-span-2">
                  <summary className="recorded-more-summary">Add job details</summary>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="recorded-field">
                      <span>Assign to</span>
                      <select name="assigneeUserId" defaultValue="" className="recorded-edit-input">
                        <option value="">Leave unassigned</option>
                        {people.map((person) => (
                          <option key={person.user.id} value={person.user.id}>
                            {person.user.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="recorded-field sm:col-span-2">
                      <span>Notes</span>
                      <input name="detailNotes" type="text" placeholder="Optional detail" className="recorded-edit-input" />
                    </label>
                  </div>
                </details>
              </form>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="recorded-row-placeholder">You have enough in place now to use home, jobs, and quick log normally.</p>
                <Link href="/tasks" className="recorded-row-edit recorded-row-edit-bright">Open jobs</Link>
                <Link href="/log" className="recorded-row-edit">Log another job</Link>
              </div>
            )
          ) : (
            <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-4">
              <p className="text-sm text-muted">Add a room first, then come back here to create the first job.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusCount({
  label,
  value,
  done,
  optional = false,
}: {
  label: string;
  value: number;
  done: boolean;
  optional?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-xs font-semibold ${done ? "text-success" : "text-muted"}`}>
        {done ? "Done" : optional ? "Optional" : "Next"}
      </p>
    </div>
  );
}

function formatRole(role: string) {
  if (role === "power_user") {
    return "Power user";
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getSetupErrorMessage(error?: string) {
  if (error === "person-name-required") {
    return "Enter a name before adding a person.";
  }
  if (error === "person-passcode-too-short") {
    return "Passcodes must be at least 4 characters.";
  }
  if (error === "room-name-required") {
    return "Enter a room name before saving.";
  }
  if (error === "task-title-required") {
    return "Enter a job title before saving.";
  }
  if (error === "task-room-required") {
    return "Pick a room before saving the first job.";
  }
  if (error === "task-room-invalid") {
    return "That room is no longer available.";
  }
  return "We could not save that setup step.";
}
