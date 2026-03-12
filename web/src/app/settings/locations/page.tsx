import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction,
  updateRoomLocationAction,
} from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { requireAdmin } from "@/lib/auth";
import { APP_VERSION } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; duplicate?: string }>;
}) {
  const params = await searchParams;
  const { householdId } = await requireAdmin("/settings/locations");

  const locations = await prisma.location.findMany({
    where: { householdId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      rooms: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, designation: true },
      },
    },
  });

  return (
    <div className="settings-shell min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <header className="settings-hero">
          <div>
            <div className="capture-topline">
              <p className="settings-kicker">Setup / Locations</p>
              <span className="version-chip">{APP_VERSION}</span>
            </div>
            <h1 className="settings-title">Manage locations</h1>
            <p className="settings-copy">
              Locations are the properties or places where you do work — your home, a second property, or anywhere else.
              Each location groups its own rooms.
            </p>
          </div>
          <div className="capture-topbar-actions">
            <Link href="/settings" className="action-btn subtle quiet">
              Setup home
            </Link>
            <Link href="/settings/rooms" className="action-btn subtle quiet">
              Rooms
            </Link>
            <Link href="/tasks" className="action-btn subtle quiet">
              Tasks
            </Link>
          </div>
        </header>

        {params.added === "location" ? <ToastNotice message="Location added." tone="success" /> : null}
        {params.duplicate === "location" ? <ToastNotice message="That location name already exists." tone="info" /> : null}

        <section className="settings-panel">
          <div className="room-setup-header">
            <div>
              <p className="settings-kicker">Locations</p>
              <h2 className="recorded-title">Locations</h2>
            </div>
            <span className="recorded-count">{locations.length}</span>
          </div>

          <form action={createLocationAction} className="capture-form-simple">
            <input type="hidden" name="returnTo" value="/settings/locations" />
            <div className="capture-step">
              <p className="capture-step-label">Add a location</p>
              <input
                name="name"
                type="text"
                required
                placeholder="Mum's house"
                className="capture-main-input"
              />
            </div>
            <FormActionButton className="capture-submit-btn" pendingLabel="Adding location">
              Add location
            </FormActionButton>
          </form>

          <div className="recorded-list">
            {locations.map((location) => (
              <details key={location.id} className="recorded-row">
                <summary className="recorded-row-summary">
                  <div className="recorded-row-top">
                    <p className="recorded-row-title">{location.name}</p>
                    <span className="recorded-row-chevron">▾</span>
                  </div>
                  <div className="recorded-row-sub">
                    <span className="recorded-row-room">{location.rooms.length} rooms</span>
                  </div>
                </summary>
                <div className="recorded-row-detail">
                  <form action={updateLocationAction} className="recorded-edit-form">
                    <input type="hidden" name="locationId" value={location.id} />
                    <input type="hidden" name="returnTo" value="/settings/locations" />
                    <label className="recorded-field">
                      <span>Name</span>
                      <input
                        name="name"
                        type="text"
                        defaultValue={location.name}
                        className="recorded-edit-input"
                      />
                    </label>
                    <div className="recorded-row-actions between">
                      <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                        Save location
                      </FormActionButton>
                    </div>
                  </form>

                  {location.rooms.length > 0 ? (
                    <div className="recorded-field">
                      <span>Rooms in this location</span>
                      <ul className="location-room-list">
                        {location.rooms.map((room) => (
                          <li key={room.id} className="location-room-item">
                            <span>{room.name}</span>
                            <form action={updateRoomLocationAction}>
                              <input type="hidden" name="roomId" value={room.id} />
                              <input type="hidden" name="locationId" value="" />
                              <FormActionButton className="action-btn subtle quiet small" pendingLabel="Moving">
                                Remove
                              </FormActionButton>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <form action={deleteLocationAction} className="recorded-row-actions">
                    <input type="hidden" name="locationId" value={location.id} />
                    <FormActionButton className="action-btn warn quiet" pendingLabel="Archiving">
                      Archive location
                    </FormActionButton>
                  </form>
                </div>
              </details>
            ))}

            {locations.length === 0 ? (
              <p className="recorded-empty">No locations yet. Add the places where you do work.</p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
