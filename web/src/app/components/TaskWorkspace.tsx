import { createQuickTaskAction, logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { LocationRoomSelect } from "@/app/components/LocationRoomSelect";
import { SimilarTaskField } from "@/app/components/SimilarTaskField";
import { TasksPanelClient } from "@/app/components/TasksPanelClient";
import { ToastNotice } from "@/app/components/ToastNotice";
import { canManageProjectsRole, isAdminRole, requireSessionContext } from "@/lib/auth";
import { getRoomLocationAccessWhere, hasLocationRestrictions } from "@/lib/location-access";
import { prisma } from "@/lib/prisma";
import { getPrivateTaskAccessWhere, getProjectTaskWhere } from "@/lib/project-work";
import Link from "next/link";

type SearchParams = {
  added?: string;
  updated?: string;
  lucky?: string;
  assignee?: string;
  room?: string;
  state?: string;
  location?: string;
  taskId?: string;
  projectState?: string;
};

export async function LogWorkspace({ params }: { params: SearchParams }) {
  const { householdId, userId, role, allowedLocationIds } = await requireSessionContext("/log");
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);

  const [currentUser, rooms, people, locations, lookupTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true },
    }),
    prisma.room.findMany({
      where: { householdId, active: true, ...getRoomLocationAccessWhere(allowedLocationIds) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true, location: { select: { id: true, name: true } } },
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
    prisma.location.findMany({
      where: { householdId, active: true, ...(restrictedToLocations ? { id: { in: allowedLocationIds! } } : {}) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        detailNotes: true,
        captureStage: true,
        room: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const roomOptions = uniqueRoomsByName(rooms).filter((room) => room.name.toLowerCase() !== "unsorted");
  const peopleOptions = people.map((member) => member.user);

  return (
    <div className="capture-shell page-log min-h-screen px-4 py-5">
      <main className="capture-app-shell mx-auto flex w-full max-w-[28rem] flex-col gap-6">
        <AppPageHeader
          title="Log task"
          subtitle="Keep capture fast. Task first, room second, everything else optional."
          iconClassName="log"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
          actions={
            <>
              <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
              <Link href="/" className="action-btn subtle quiet">
                Home
              </Link>
              <Link href="/tasks" prefetch className="action-btn subtle quiet">
                View tasks
              </Link>
              <Link href="/projects" className="action-btn subtle quiet">
                Projects
              </Link>
              {isAdminRole(role) ? (
                <Link href="/settings" className="action-btn subtle quiet">
                  Setup
                </Link>
              ) : null}
              <form action={logoutAction}>
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                  Log out
                </FormActionButton>
              </form>
            </>
          }
        />

        {params.added === "task" ? <ToastNotice message="Task recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed task recorded." tone="success" /> : null}
        {(params.added === "task" || params.added === "done") && params.taskId ? (
          <Link href={`/tasks#task-${params.taskId}`} className="view-task-link">
            View the task you just logged
          </Link>
        ) : null}

        <section className="capture-panel-simple">
          <form action={createQuickTaskAction} className="capture-form-simple" id="capture-form">
            <input type="hidden" name="returnTo" value="/log" />
            <SimilarTaskField
              tasks={lookupTasks.map((task) => ({
                id: task.id,
                title: task.title,
                detailNotes: task.detailNotes,
                roomName: task.room.name,
                state: task.captureStage === "done" ? "done" : "open",
              }))}
            />

            <LocationRoomSelect locations={locations} rooms={roomOptions} requireRoom={restrictedToLocations} />

            <div className="capture-step">
              <label className="capture-step-inner">
                <span className="capture-step-label">Assigned to (optional)</span>
                <select name="assignedToUserId" defaultValue="" className="capture-room-select">
                  <option value="">No one yet</option>
                  {peopleOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="capture-step">
              <label className="capture-private-row">
                <input type="checkbox" name="isPrivate" value="true" className="capture-private-check" />
                <input type="hidden" name="isPrivate" value="false" />
                <span className="capture-step-label">Private</span>
                <span className="capture-private-hint">Only visible to you and the assigned person</span>
              </label>
            </div>

            <details className="recorded-row">
              <summary className="recorded-row-summary">
                <div className="min-w-0">
                  <p className="recorded-row-title">Add details</p>
                  <p className="recorded-row-placeholder">Notes, priority, or set it as recurring.</p>
                </div>
                <div className="recorded-row-meta">
                  <span className="recorded-row-edit">Optional</span>
                  <span className="recorded-row-chevron">+</span>
                </div>
              </summary>

              <div className="recorded-row-detail">
                <label className="recorded-field">
                  <span>Notes</span>
                  <textarea
                    name="detailNotes"
                    rows={3}
                    placeholder="Optional note"
                    className="recorded-edit-input recorded-edit-textarea"
                  />
                </label>

                <label className="recorded-field">
                  <span>Priority in room</span>
                  <input
                    name="priority"
                    type="number"
                    min={1}
                    placeholder="Auto"
                    className="recorded-edit-input"
                  />
                </label>

                <details className="recorded-more-details">
                  <summary className="recorded-more-summary">Recurring task</summary>
                  <div className="capture-meta-grid">
                    <label className="recorded-field">
                      <span>Repeats</span>
                      <select name="recurrenceType" defaultValue="none" className="recorded-edit-input">
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>

                    <label className="recorded-field">
                      <span>Every</span>
                      <input
                        name="recurrenceInterval"
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="recorded-edit-input"
                      />
                    </label>
                  </div>

                  <label className="recorded-field">
                    <span>Next due</span>
                    <input
                      name="nextDueAt"
                      type="datetime-local"
                      defaultValue={toDateTimeInputValue(addDays(new Date(), 7))}
                      className="recorded-edit-input"
                    />
                  </label>
                </details>
              </div>
            </details>

            <FormActionButton className="capture-submit-btn" pendingLabel="Saving task">
              Save task
            </FormActionButton>
          </form>
        </section>

      </main>
    </div>
  );
}

export async function TasksWorkspace({ params }: { params: SearchParams }) {
  return <WorkItemsWorkspace params={params} mode="tasks" />;
}

export async function ProjectsWorkspace({ params }: { params: SearchParams }) {
  return <WorkItemsWorkspace params={params} mode="projects" />;
}

async function WorkItemsWorkspace({ params, mode }: { params: SearchParams; mode: "tasks" | "projects" }) {
  const { householdId, userId, role, allowedLocationIds } = await requireSessionContext(mode === "projects" ? "/projects" : "/tasks");
  const privateTaskAccess = isAdminRole(role) ? undefined : getPrivateTaskAccessWhere(userId);
  const projectOnlyWhere = mode === "projects" ? getProjectTaskWhere() : undefined;
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);

  const [currentUser, rooms, people, locations, recordedTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    }),
    prisma.room.findMany({
      where: { householdId, active: true, ...getRoomLocationAccessWhere(allowedLocationIds) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true, locationId: true, location: { select: { id: true, name: true } } },
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
    prisma.location.findMany({
      where: { householdId, active: true, ...(restrictedToLocations ? { id: { in: allowedLocationIds! } } : {}) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
        AND: [
          ...(privateTaskAccess ? [{ OR: privateTaskAccess }] : []),
          ...(projectOnlyWhere ? [projectOnlyWhere] : []),
        ],
      },
      orderBy: [{ room: { sortOrder: "asc" } }, { priority: "asc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        room: {
          select: { name: true, location: { select: { id: true, name: true } } },
        },
        logger: {
          select: { displayName: true },
        },
        projectParent: {
          select: {
            id: true,
            title: true,
          },
        },
        projectChildren: {
          where: {
            active: true,
            ...(privateTaskAccess ? { OR: privateTaskAccess } : {}),
          },
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
          include: {
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
            schedule: {
              select: {
                nextDueAt: true,
              },
            },
            occurrences: {
              orderBy: { dueAt: "desc" },
              take: 3,
              select: {
                status: true,
                dueAt: true,
                completedAt: true,
              },
            },
          },
        },
        projectMilestones: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            targetAt: true,
            completedAt: true,
            sortOrder: true,
          },
        },
        projectCosts: {
          orderBy: { notedAt: "desc" },
          select: {
            id: true,
            title: true,
            amountCents: true,
            notedAt: true,
          },
        },
        projectMaterials: {
          orderBy: [{ purchasedAt: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            quantityLabel: true,
            source: true,
            estimatedCostCents: true,
            actualCostCents: true,
            purchasedAt: true,
          },
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
        schedule: {
          select: {
            recurrenceType: true,
            intervalCount: true,
            nextDueAt: true,
          },
        },
        occurrences: {
          orderBy: { dueAt: "desc" },
          take: 10,
          include: {
            completer: {
              select: {
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
  const selectedRoomId = roomOptions.some((room) => room.id === params.room) ? (params.room ?? "") : "";
  const selectedAssigneeId = peopleOptions.some((person) => person.id === params.assignee) ? (params.assignee ?? "") : "";
  const selectedLocationId = locations.some((loc) => loc.id === params.location) ? (params.location ?? "") : "";
  const selectedState: "all" | "open" | "done" = params.state === "done" || params.state === "open" ? params.state : "all";
  const selectedProjectState =
    params.projectState === "planning" ||
    params.projectState === "active" ||
    params.projectState === "complete" ||
    params.projectState === "over_budget" ||
    params.projectState === "at_risk"
      ? params.projectState
      : "all";
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? recordedTasks.find((task) => task.id === params.lucky)
    : null;

  return (
    <div className={`capture-shell ${mode === "projects" ? "page-projects" : "page-tasks"} min-h-screen px-4 py-5`}>
      <main className="capture-app-shell mx-auto flex w-full max-w-[32rem] flex-col gap-6">
        <AppPageHeader
          title={mode === "projects" ? "Projects" : "Tasks"}
          subtitle={
            mode === "projects"
              ? "Track larger household work, project steps, dates, budget, spend, and materials."
              : "View, filter, prioritise, and complete what has already been logged."
          }
          iconClassName="tasks"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <polyline points="3 6 4 7 6 4" />
              <polyline points="3 12 4 13 6 10" />
              <polyline points="3 18 4 19 6 16" />
            </svg>
          }
          actions={
            <>
              <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
              <Link href="/" className="action-btn subtle quiet">
                Home
              </Link>
              <Link href="/log" className="action-btn subtle quiet">
                Log task
              </Link>
              <Link href={mode === "projects" ? "/tasks" : "/projects"} prefetch className="action-btn subtle quiet">
                {mode === "projects" ? "Tasks" : "Projects"}
              </Link>
              {mode === "projects" ? (
                <Link href="/projects/timeline" className="action-btn subtle quiet">
                  Timeline
                </Link>
              ) : null}
              {isAdminRole(role) ? (
                <Link href="/settings" className="action-btn subtle quiet">
                  Setup
                </Link>
              ) : null}
              <form action={logoutAction}>
                <FormActionButton className="action-btn subtle quiet" pendingLabel="Logging out">
                  Log out
                </FormActionButton>
              </form>
            </>
          }
        />

        {params.added === "task" ? <ToastNotice message="Task recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed task recorded." tone="success" /> : null}
        {params.updated === "task" ? <ToastNotice message="Task updated." tone="info" /> : null}
        {params.updated === "done" ? <ToastNotice message="Task marked completed." tone="success" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No tasks available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}

        <TasksPanelClient
          roomOptions={roomOptions}
          peopleOptions={peopleOptions}
          locationOptions={locations}
          initialRoomId={selectedRoomId}
          initialAssigneeId={selectedAssigneeId}
          initialLocationId={selectedLocationId}
          initialState={selectedState}
          initialLuckyId={params.lucky && params.lucky !== "empty" ? params.lucky : null}
          initialProjectState={selectedProjectState}
          canManageProjects={canManageProjectsRole(role)}
          canDeleteTasks={isAdminRole(role)}
          basePath={mode === "projects" ? "/projects" : "/tasks"}
          viewMode={mode}
          panelKicker={mode === "projects" ? "Projects" : "Tasks"}
          panelTitle={mode === "projects" ? "Project board" : "Logged tasks"}
          emptyMessage={mode === "projects" ? "No projects yet. Promote a task or add project steps from an existing project." : "No tasks recorded yet."}
          tasks={recordedTasks.map((task) => ({
            id: task.id,
            title: task.title,
            roomId: task.roomId,
            roomName: task.room.name,
            locationId: task.room.location?.id ?? null,
            locationName: task.room.location?.name ?? null,
            loggerName: task.logger?.displayName ?? null,
            projectParentId: task.projectParentId,
            projectParentTitle: task.projectParent?.title ?? null,
            assignmentUserId: task.assignments[0]?.userId ?? null,
            assignmentUserName: task.assignments[0]?.user?.displayName ?? null,
            detailNotes: task.detailNotes ?? null,
            priority: task.priority,
            isPrivate: task.isPrivate,
            jobKind: task.jobKind,
            captureStage: task.captureStage,
            createdAt: task.createdAt.toISOString(),
            estimatedMinutes: task.estimatedMinutes,
            projectTargetAt: task.projectTargetAt?.toISOString() ?? null,
            projectBudgetCents: task.projectBudgetCents,
            projectChildren: task.projectChildren.map((child) => ({
              id: child.id,
              title: child.title,
              captureStage: child.captureStage,
              estimatedMinutes: child.estimatedMinutes,
              assignmentUserName: child.assignments[0]?.user?.displayName ?? null,
              nextDueAt: child.schedule?.nextDueAt?.toISOString() ?? child.occurrences[0]?.dueAt.toISOString() ?? null,
              occurrences: child.occurrences.map((occurrence) => ({
                status: occurrence.status,
                dueAt: occurrence.dueAt.toISOString(),
                completedAt: occurrence.completedAt?.toISOString() ?? null,
              })),
            })),
            projectCosts: task.projectCosts.map((cost) => ({
              id: cost.id,
              title: cost.title,
              amountCents: cost.amountCents,
              notedAt: cost.notedAt.toISOString(),
            })),
            projectMaterials: task.projectMaterials.map((material) => ({
              id: material.id,
              title: material.title,
              quantityLabel: material.quantityLabel ?? null,
              source: material.source ?? null,
              estimatedCostCents: material.estimatedCostCents ?? null,
              actualCostCents: material.actualCostCents ?? null,
              purchasedAt: material.purchasedAt?.toISOString() ?? null,
            })),
            projectMilestones: task.projectMilestones.map((milestone) => ({
              id: milestone.id,
              title: milestone.title,
              targetAt: milestone.targetAt?.toISOString() ?? null,
              completedAt: milestone.completedAt?.toISOString() ?? null,
              sortOrder: milestone.sortOrder,
            })),
            schedule: task.schedule
              ? {
                  recurrenceType: task.schedule.recurrenceType,
                  intervalCount: task.schedule.intervalCount,
                  nextDueAt: task.schedule.nextDueAt?.toISOString() ?? null,
                }
              : null,
            occurrences: task.occurrences.map((occurrence) => ({
              status: occurrence.status,
              dueAt: occurrence.dueAt.toISOString(),
              completedAt: occurrence.completedAt?.toISOString() ?? null,
              completedBy: occurrence.completedBy ?? null,
              completerName: occurrence.completer?.displayName ?? null,
            })),
          }))}
        />

      </main>
    </div>
  );
}

function toDateTimeInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
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
