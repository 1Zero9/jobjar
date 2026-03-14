import {
  createPersonAction,
  logoutAction,
  removePersonAction,
  setPersonPasscodeAction,
  updatePersonAudienceAction,
  updatePersonProfileThemeAction,
  updatePersonLocationAccessAction,
  updatePersonRoleAction,
} from "@/app/actions";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { FormActionButton } from "@/app/components/FormActionButton";
import { ToastNotice } from "@/app/components/ToastNotice";
import { isAdminRole, requirePeopleManager } from "@/lib/auth";
import { formatAudienceBand, formatProfileTheme } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const { householdId, role } = await requirePeopleManager("/settings/people");
  const adminMode = isAdminRole(role);

  const [people, locations] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { joinedAt: "asc" },
      select: {
        role: true,
        audienceBand: true,
        profileTheme: true,
        locationAccess: {
          select: {
            locationId: true,
            location: { select: { name: true } },
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
    prisma.location.findMany({
      where: { householdId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="settings-shell min-h-screen px-4 py-5">
      <main className="mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title="People"
          subtitle="People setup is separate now, so ownership and room configuration do not compete on the same screen."
          iconClassName="people"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
              <circle cx="9.5" cy="7" r="3" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          actions={
            <>
              <Link href={adminMode ? "/settings" : "/"} className="action-btn subtle quiet">
                {adminMode ? "Setup home" : "Home"}
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

        {params.added === "person" ? <ToastNotice message="Person added." tone="success" /> : null}
        {params.updated === "role" ? <ToastNotice message="Role updated." tone="success" /> : null}
        {params.updated === "audience" ? <ToastNotice message="Age group updated." tone="success" /> : null}
        {params.updated === "theme" ? <ToastNotice message="Profile theme updated." tone="success" /> : null}
        {params.updated === "locations" ? <ToastNotice message="Location access updated." tone="success" /> : null}

        <section className="settings-panel">
          <div className="room-setup-header">
            <div>
              <p className="settings-kicker">People</p>
              <h2 className="recorded-title">Household members</h2>
            </div>
            <span className="recorded-count">{people.length}</span>
          </div>

          {adminMode ? (
            <form action={createPersonAction} className="capture-form-simple">
              <input type="hidden" name="returnTo" value="/settings/people" />
              <input name="displayName" type="text" required placeholder="Name" className="capture-main-input" />
              <input name="email" type="email" placeholder="Email (optional)" className="capture-room-select" />
              <select name="role" defaultValue="member" className="capture-room-select">
                <option value="member">Member</option>
                <option value="power_user">Power user</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <select name="audienceBand" defaultValue="adult" className="capture-room-select">
                <option value="adult">Adult</option>
                <option value="teen_12_18">12 to 18</option>
                <option value="under_12">Under 12</option>
              </select>
              <select name="profileTheme" defaultValue="default_theme" className="capture-room-select">
                <option value="default_theme">Default</option>
                <option value="boy_blue">Boy / blue</option>
                <option value="girl_pink">Girl / pink</option>
              </select>
              <input name="passcode" type="password" minLength={4} placeholder="Passcode" className="capture-room-select" />
              {locations.length > 0 ? (
                <fieldset className="location-access-fieldset">
                  <legend className="capture-step-label">Location access</legend>
                  <p className="recorded-row-placeholder">Leave blank for all locations. Admins always see everything.</p>
                  <div className="location-access-grid">
                    {locations.map((location) => (
                      <label key={location.id} className="location-access-option">
                        <input type="checkbox" name="locationIds" value={location.id} />
                        <span>{location.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <FormActionButton className="capture-submit-btn" pendingLabel="Adding person">
                Add person
              </FormActionButton>
            </form>
          ) : (
            <p className="recorded-row-placeholder">
              Power users can keep age group and theme settings current here. Admin-only controls such as roles, passcodes, and location access stay with admins.
            </p>
          )}

          <div className="recorded-list">
            {people.map((person, index) => (
              <details key={person.user.id} className={`recorded-row recorded-row-${rowTone(index)}`}>
                <summary className="recorded-row-summary">
                  <div className="recorded-row-main">
                    <p className="recorded-row-title">{person.user.displayName}</p>
                    <p className="recorded-row-placeholder">{person.user.email ?? "No email saved"}</p>
                  </div>
                  <div className="recorded-row-meta">
                    <div className="people-summary-chips">
                      <span className="task-chip">{formatRole(person.role)}</span>
                      <span className="task-chip">{formatAudienceBand(person.audienceBand)}</span>
                      <span className="task-chip">{formatProfileTheme(person.profileTheme)}</span>
                      <span className="task-chip">{formatLocationAccessSummary(person.role, person.locationAccess)}</span>
                    </div>
                    <div className="recorded-row-summary-actions">
                      <span className="recorded-row-edit">Open</span>
                      <span className="recorded-row-chevron">+</span>
                    </div>
                  </div>
                </summary>
                <div className="recorded-row-detail">
                  <p><span>Name</span><strong>{person.user.displayName}</strong></p>
                  <p><span>Role</span><strong>{formatRole(person.role)}</strong></p>
                  <p><span>Age group</span><strong>{formatAudienceBand(person.audienceBand)}</strong></p>
                  <p><span>Profile theme</span><strong>{formatProfileTheme(person.profileTheme)}</strong></p>
                  <p><span>Email</span><strong>{person.user.email}</strong></p>
                  <p><span>Location access</span><strong>{formatLocationAccess(person.role, person.locationAccess)}</strong></p>
                  {adminMode ? (
                    <form action={updatePersonRoleAction} className="recorded-edit-form">
                      <input type="hidden" name="userId" value={person.user.id} />
                      <input type="hidden" name="returnTo" value="/settings/people" />
                      <label className="recorded-field">
                        <span>Role</span>
                        <select name="role" defaultValue={person.role} className="recorded-edit-input">
                          <option value="member">Member</option>
                          <option value="power_user">Power user</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </label>
                      <div className="recorded-row-actions between">
                        <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                          Save role
                        </FormActionButton>
                      </div>
                    </form>
                  ) : null}
                  <form action={updatePersonAudienceAction} className="recorded-edit-form">
                    <input type="hidden" name="userId" value={person.user.id} />
                    <input type="hidden" name="returnTo" value="/settings/people" />
                    <label className="recorded-field">
                      <span>Age group</span>
                      <select name="audienceBand" defaultValue={person.audienceBand} className="recorded-edit-input">
                        <option value="adult">Adult</option>
                        <option value="teen_12_18">12 to 18</option>
                        <option value="under_12">Under 12</option>
                      </select>
                    </label>
                    <div className="recorded-row-actions between">
                      <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                        Save age group
                      </FormActionButton>
                    </div>
                  </form>
                  <form action={updatePersonProfileThemeAction} className="recorded-edit-form">
                    <input type="hidden" name="userId" value={person.user.id} />
                    <input type="hidden" name="returnTo" value="/settings/people" />
                    <label className="recorded-field">
                      <span>Profile theme</span>
                      <select name="profileTheme" defaultValue={person.profileTheme} className="recorded-edit-input">
                        <option value="default_theme">Default</option>
                        <option value="boy_blue">Boy / blue</option>
                        <option value="girl_pink">Girl / pink</option>
                      </select>
                    </label>
                    <div className="recorded-row-actions between">
                      <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                        Save profile theme
                      </FormActionButton>
                    </div>
                  </form>
                  {adminMode && locations.length > 0 ? (
                    <form action={updatePersonLocationAccessAction} className="recorded-edit-form">
                      <input type="hidden" name="userId" value={person.user.id} />
                      <input type="hidden" name="returnTo" value="/settings/people" />
                      <fieldset className="location-access-fieldset">
                        <legend className="capture-step-label">Allowed locations</legend>
                        <p className="recorded-row-placeholder">Leave all unchecked for full access. Admins always see everything.</p>
                        <div className="location-access-grid">
                          {locations.map((location) => (
                            <label key={location.id} className="location-access-option">
                              <input
                                type="checkbox"
                                name="locationIds"
                                value={location.id}
                                defaultChecked={person.locationAccess.some((entry) => entry.locationId === location.id)}
                              />
                              <span>{location.name}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div className="recorded-row-actions between">
                        <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                          Save location access
                        </FormActionButton>
                      </div>
                    </form>
                  ) : null}
                  {adminMode ? (
                    <>
                      <form action={setPersonPasscodeAction} className="recorded-edit-form">
                        <input type="hidden" name="userId" value={person.user.id} />
                        <label className="recorded-field">
                          <span>Reset passcode</span>
                          <input name="passcode" type="password" minLength={4} placeholder="New passcode" className="recorded-edit-input" />
                        </label>
                        <div className="recorded-row-actions between">
                          <FormActionButton className="action-btn bright quiet" pendingLabel="Saving">
                            Save passcode
                          </FormActionButton>
                        </div>
                      </form>
                      <form action={removePersonAction} className="recorded-row-actions">
                        <input type="hidden" name="userId" value={person.user.id} />
                        <FormActionButton className="action-btn warn quiet" pendingLabel="Removing">
                          Remove person
                        </FormActionButton>
                      </form>
                    </>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function rowTone(index: number) {
  const tones = ["blue", "green", "amber", "rose"] as const;
  return tones[index % tones.length];
}

function formatRole(role: string) {
  if (role === "power_user") {
    return "Power user";
  }
  return role[0].toUpperCase() + role.slice(1);
}

function formatLocationAccess(
  role: string,
  locationAccess: Array<{ location: { name: string } }>,
) {
  if (role === "admin") {
    return "All locations";
  }
  if (locationAccess.length === 0) {
    return "All locations";
  }
  return locationAccess.map((entry) => entry.location.name).join(", ");
}

function formatLocationAccessSummary(
  role: string,
  locationAccess: Array<{ location: { name: string } }>,
) {
  if (role === "admin" || locationAccess.length === 0) {
    return "All locations";
  }
  if (locationAccess.length === 1) {
    return locationAccess[0]?.location.name ?? "1 location";
  }
  return `${locationAccess.length} locations`;
}
