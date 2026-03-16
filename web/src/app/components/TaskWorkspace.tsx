import { createQuickTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { LocationRoomSelect } from "@/app/components/LocationRoomSelect";
import { LogoutIconButton } from "@/app/components/LogoutIconButton";
import { SimilarTaskField } from "@/app/components/SimilarTaskField";
import { TasksPanelClient } from "@/app/components/TasksPanelClient";
import { ToastNotice } from "@/app/components/ToastNotice";
import { canAccessProjectViewsRole, canManagePeopleRole, canManageProjectsRole, canUseMemberActions, isAdminRole, isMemberRole, requireSessionContext } from "@/lib/auth";
import { getLocationScopeLabel, getRoomLocationAccessWhere, hasLocationRestrictions } from "@/lib/location-access";
import { canAccessExtendedViews, getAudienceAssignedTaskWhere, getMemberThemeClassName, isChildAudience, isTeenAudience } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { getMemberVisibleTaskWhere, getPrivateTaskAccessWhere, getProjectTaskWhere } from "@/lib/project-work";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = {
  added?: string;
  error?: string;
  removed?: string;
  updated?: string;
  lucky?: string;
  q?: string;
  assignee?: string;
  view?: string;
  room?: string;
  state?: string;
  location?: string;
  taskId?: string;
};

export async function LogWorkspace({ params }: { params: SearchParams }) {
  const { householdId, userId, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext("/log");
  if (!canAccessExtendedViews(audienceBand) || !canUseMemberActions(role)) {
    redirect("/tasks");
  }
  const peopleManager = canManagePeopleRole(role);
  const memberMode = isMemberRole(role);
  const easyLog = memberMode;
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);

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
  const locationScopeLabel = getLocationScopeLabel(locations, allowedLocationIds);

  return (
    <div className={`capture-shell page-log ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className={`capture-app-shell ${easyLog ? "capture-app-shell-easy" : ""} mx-auto flex w-full max-w-[28rem] flex-col gap-6`.trim()}>
        <AppPageHeader
          title="Log a Job"
          subtitle={memberMode ? "Add the job, pick the room, and save." : "Add the job, pick the room, and save."}
          className={easyLog ? "page-hero-easy" : ""}
          iconClassName="log"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
          cornerAction={<LogoutIconButton />}
          scopeLabel={locationScopeLabel}
          actions={
            <>
              <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
              <Link href="/" className="action-btn subtle quiet home-action">
                Home
              </Link>
              <Link href="/tasks" prefetch className="action-btn subtle quiet">
                View jobs
              </Link>
              {isAdminRole(role) ? (
                <Link href="/settings" className="action-btn subtle quiet">
                  Setup
                </Link>
              ) : peopleManager ? (
                <Link href="/settings/people" className="action-btn subtle quiet">
                  People
                </Link>
              ) : null}
            </>
          }
        />

        {params.added === "task" ? <ToastNotice message="Job recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed job recorded." tone="success" /> : null}
        {params.error ? <ToastNotice message={getTaskWorkspaceErrorMessage(params.error)} tone="error" /> : null}
        {(params.added === "task" || params.added === "done") && params.taskId ? (
          <Link href={`/tasks#task-${params.taskId}`} className="view-task-link">
            View the job you just logged
          </Link>
        ) : null}

        <section className={`capture-panel-simple ${easyLog ? "capture-panel-easy" : ""}`.trim()}>
          <form action={createQuickTaskAction} className="capture-form-simple" id="capture-form">
            <input type="hidden" name="returnTo" value="/log" />
            <section className="quick-log-panel">
              <div className="quick-log-header">
                <p className="settings-kicker">Quick log</p>
                <p className="quick-log-copy">{easyLog ? "Start with the job and room." : "Start with the job and room."}</p>
              </div>

              <SimilarTaskField
                className="quick-log-primary-step"
                tasks={lookupTasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  detailNotes: task.detailNotes,
                  roomName: task.room.name,
                  state: task.captureStage === "done" ? "done" : "open",
                }))}
              />

              <LocationRoomSelect
                className="quick-log-primary-step"
                locations={locations}
                rooms={roomOptions}
                requireRoom={restrictedToLocations}
              />

              <FormActionButton className="capture-submit-btn quick-log-submit" pendingLabel="Saving job">
                Save job
              </FormActionButton>
            </section>

            <details className="recorded-row quick-log-more">
              <summary className="recorded-row-summary">
                <div className="min-w-0">
                  <p className="recorded-row-title">Add person or details</p>
                  <p className="recorded-row-placeholder">Optional. Add a person, note, or repeat.</p>
                </div>
                <div className="recorded-row-meta">
                  <span className="recorded-row-edit">Optional</span>
                  <span className="recorded-row-chevron">+</span>
                </div>
              </summary>

              <div className="recorded-row-detail">
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
                  <summary className="recorded-more-summary">Repeating job</summary>
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
  const { householdId, userId, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext(mode === "projects" ? "/projects" : "/tasks");
  if (mode === "projects" && (!canAccessExtendedViews(audienceBand) || !canAccessProjectViewsRole(role))) {
    redirect("/tasks");
  }
  const privateTaskAccess = isAdminRole(role) ? undefined : getPrivateTaskAccessWhere(userId);
  const projectOnlyWhere = mode === "projects" ? getProjectTaskWhere() : undefined;
  const memberVisibleTaskWhere = getMemberVisibleTaskWhere(role, userId);
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);
  const taskAudienceWhere = getAudienceAssignedTaskWhere(userId, audienceBand);
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);
  const childMode = isChildAudience(audienceBand);
  const teenMode = isTeenAudience(audienceBand);
  const memberMode = isMemberRole(role);
  const peopleManager = canManagePeopleRole(role);
  const canEditTasks = canUseMemberActions(role);
  const easyWorkspace = !childMode && (memberMode || !canEditTasks);
  const taskTake = mode === "projects" ? 28 : 48;
  const parentOccurrenceTake = mode === "projects" ? 8 : 6;
  const childOccurrenceTake = 2;

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
        ...taskAudienceWhere,
        AND: [
          ...(Object.keys(memberVisibleTaskWhere).length > 0 ? [memberVisibleTaskWhere] : []),
          ...(privateTaskAccess ? [{ OR: privateTaskAccess }] : []),
          ...(projectOnlyWhere ? [projectOnlyWhere] : []),
        ],
      },
      orderBy: [{ room: { sortOrder: "asc" } }, { priority: "asc" }, { createdAt: "desc" }],
      take: taskTake,
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
              take: childOccurrenceTake,
              select: {
                status: true,
                dueAt: true,
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
          take: parentOccurrenceTake,
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
  const selectedPersonalFilter =
    params.view === "logged" || params.view === "assigned" || params.view === "private"
      ? params.view
      : "all";
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? recordedTasks.find((task) => task.id === params.lucky)
    : null;
  const locationScopeLabel = getLocationScopeLabel(locations, allowedLocationIds);

  return (
    <div className={`capture-shell ${mode === "projects" ? "page-projects" : "page-tasks"} ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className={`capture-app-shell ${easyWorkspace ? "capture-app-shell-easy" : ""} mx-auto flex w-full max-w-[32rem] flex-col gap-6`.trim()}>
        <AppPageHeader
          title={
            childMode
              ? "My jobs"
              : mode === "projects"
                ? "Parent jobs"
                : teenMode
                  ? "View jobs"
                  : memberMode
                    ? "My jobs"
                    : "View jobs"
          }
          subtitle={
            childMode
              ? "See your jobs, start one, and mark it finished."
              : mode === "projects"
              ? "Use parent jobs to break bigger work into smaller subtasks."
              : memberMode
                ? "See your jobs and use filters only when you need them."
              : teenMode
                ? "See what is assigned, due, and ready to finish."
                : "See what is logged, filter it, and move it forward."
          }
          className={`${easyWorkspace ? "page-hero-easy" : ""} ${childMode ? "page-hero-kid" : teenMode ? "page-hero-teen" : ""}`.trim()}
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
          cornerAction={<LogoutIconButton />}
          scopeLabel={locationScopeLabel}
          actions={
            <>
              <span className="session-chip">{currentUser?.displayName ?? "You"}</span>
              <Link href="/" className="action-btn subtle quiet home-action">
                Home
              </Link>
              {canAccessExtendedViews(audienceBand) ? (
                <>
                  {canEditTasks ? (
                    <Link href="/log" className="action-btn subtle quiet">
                      Log a Job
                    </Link>
                  ) : null}
                  {isAdminRole(role) ? (
                    <Link href="/settings" className="action-btn subtle quiet">
                      Setup
                    </Link>
                  ) : peopleManager ? (
                    <Link href="/settings/people" className="action-btn subtle quiet">
                      People
                    </Link>
                  ) : null}
                </>
              ) : null}
            </>
          }
        />

        {params.added === "task" ? <ToastNotice message="Job recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed job recorded." tone="success" /> : null}
        {params.added === "project-child" ? <ToastNotice message="Subtask added." tone="success" /> : null}
        {params.added === "project-cost" ? <ToastNotice message="Project cost added." tone="success" /> : null}
        {params.added === "project-material" ? <ToastNotice message="Project material added." tone="success" /> : null}
        {params.added === "project-milestone" ? <ToastNotice message="Project milestone added." tone="success" /> : null}
        {params.updated === "task" ? <ToastNotice message="Job updated." tone="info" /> : null}
        {params.updated === "done" ? <ToastNotice message="Job marked completed." tone="success" /> : null}
        {params.updated === "project-promoted" ? <ToastNotice message="Job ready for subtasks." tone="success" /> : null}
        {params.updated === "project-demoted" ? <ToastNotice message="Parent job returned to a normal job." tone="success" /> : null}
        {params.updated === "project-plan" ? <ToastNotice message="Project plan updated." tone="success" /> : null}
        {params.updated === "project-material" ? <ToastNotice message="Project material updated." tone="success" /> : null}
        {params.updated === "project-milestone" ? <ToastNotice message="Project milestone updated." tone="success" /> : null}
        {params.removed === "project-cost" ? <ToastNotice message="Project cost removed." tone="success" /> : null}
        {params.removed === "project-material" ? <ToastNotice message="Project material removed." tone="success" /> : null}
        {params.removed === "project-milestone" ? <ToastNotice message="Project milestone removed." tone="success" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No jobs available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}
        {params.error ? <ToastNotice message={getTaskWorkspaceErrorMessage(params.error)} tone="error" /> : null}

        <TasksPanelClient
          key={[
            mode,
            selectedRoomId,
            selectedAssigneeId,
            selectedLocationId,
            selectedState,
            selectedPersonalFilter,
            params.q ?? "",
          ].join(":")}
          roomOptions={roomOptions}
          peopleOptions={peopleOptions}
          locationOptions={locations}
          initialRoomId={selectedRoomId}
          initialAssigneeId={selectedAssigneeId}
          initialLocationId={selectedLocationId}
          initialState={selectedState}
          initialLuckyId={params.lucky && params.lucky !== "empty" ? params.lucky : null}
          initialQuery={params.q ?? ""}
          initialPersonalFilter={selectedPersonalFilter}
          audienceBand={audienceBand}
          canEditTasks={canEditTasks}
          canManageProjects={canManageProjectsRole(role)}
          canDeleteTasks={isAdminRole(role)}
          memberMode={memberMode}
          easyMode={easyWorkspace}
          currentUserId={userId}
          basePath={mode === "projects" ? "/projects" : "/tasks"}
          viewMode={mode}
          panelKicker={
            childMode ? "My jobs" : mode === "projects" ? "Parent jobs" : memberMode ? "My jobs" : teenMode ? "My board" : "View jobs"
          }
          panelTitle={
            childMode ? "Jobs picked for you" : mode === "projects" ? "Tasks with subtasks" : memberMode ? "Your jobs" : "Job board"
          }
          emptyMessage={
            childMode
              ? "No jobs waiting right now. Nice work."
              : mode === "projects"
                ? "No parent jobs yet. Add subtasks to a task when work needs breaking down."
                : memberMode ? "No jobs for you right now." : "No jobs on the board yet."
          }
          tasks={recordedTasks.map((task) => ({
            id: task.id,
            title: task.title,
            createdByUserId: task.createdByUserId,
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

function getTaskWorkspaceErrorMessage(error?: string) {
  if (error === "task-title-required") {
    return "Add a job title before saving.";
  }
  if (error === "task-room-required") {
    return "Pick a room before saving this job.";
  }
  if (error === "task-not-found") {
    return "That job could not be found.";
  }
  if (error === "task-strict-note-required") {
    return "Add a short note before finishing this strict job.";
  }
  if (error === "task-strict-start-required") {
    return "Start this strict job before marking it finished.";
  }
  if (error === "task-strict-minutes-required") {
    return "This strict job needs more tracked time before it can be finished.";
  }
  if (error === "project-demote-blocked") {
    return "Remove subtasks and any legacy planning extras before turning this back into a normal job.";
  }
  if (error === "project-child-title-required") {
    return "Enter a title before adding a subtask.";
  }
  if (error === "project-cost-title-required") {
    return "Enter a title for the project cost.";
  }
  if (error === "project-cost-amount-invalid") {
    return "Enter a valid amount greater than zero for the project cost.";
  }
  if (error === "project-cost-not-found") {
    return "That project cost could not be found.";
  }
  if (error === "project-material-title-required") {
    return "Enter a title before adding a project material.";
  }
  if (error === "project-material-not-found") {
    return "That project material could not be found.";
  }
  if (error === "project-milestone-title-required") {
    return "Enter a title before adding a project milestone.";
  }
  if (error === "project-milestone-not-found") {
    return "That project milestone could not be found.";
  }
  return "We could not save that job change.";
}
