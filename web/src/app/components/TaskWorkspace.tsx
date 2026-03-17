import { createQuickTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import { AppPageHeader } from "@/app/components/AppPageHeader";
import { RoomPillSelect } from "@/app/components/RoomPillSelect";
import { SimilarTaskField } from "@/app/components/SimilarTaskField";
import { TasksPanelClient } from "@/app/components/TasksPanelClient";
import { ToastNotice } from "@/app/components/ToastNotice";
import { getTaskFeedbackMessage } from "@/app/components/task-feedback";
import { canAccessProjectViewsRole, canManageProjectsRole, canUseMemberActions, isAdminRole, isMemberRole, requireSessionContext } from "@/lib/auth";
import { getLocationScopeLabel, getRoomLocationAccessWhere, hasLocationRestrictions } from "@/lib/location-access";
import { canAccessExtendedViews, getAudienceAssignedTaskWhere, getMemberThemeClassName, isChildAudience } from "@/lib/member-audience";
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
  const { householdId, role, audienceBand, profileTheme, allowedLocationIds } = await requireSessionContext("/log");
  if (!canAccessExtendedViews(audienceBand) || !canUseMemberActions(role)) {
    redirect("/tasks");
  }
  const memberMode = isMemberRole(role);
  const easyLog = memberMode;
  const showAssignField = !memberMode;
  const restrictedToLocations = hasLocationRestrictions(allowedLocationIds);
  const audienceThemeClass = getMemberThemeClassName(audienceBand, profileTheme);

  const [rooms, people, locations, lookupTasks] = await Promise.all([
    prisma.room.findMany({
      where: { householdId, active: true, ...getRoomLocationAccessWhere(allowedLocationIds) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true, location: { select: { id: true, name: true } } },
    }),
    showAssignField
      ? prisma.householdMember.findMany({
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
        })
      : Promise.resolve([]),
    restrictedToLocations
      ? prisma.location.findMany({
          where: { householdId, active: true, id: { in: allowedLocationIds! } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.task.findMany({
      where: {
        active: true,
        room: { householdId, ...getRoomLocationAccessWhere(allowedLocationIds) },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
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
  const peopleOptions = showAssignField ? people.map((member) => member.user) : [];
  const locationScopeLabel = restrictedToLocations ? getLocationScopeLabel(locations, allowedLocationIds) : null;

  return (
    <div className={`capture-shell page-log ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className={`capture-app-shell ${easyLog ? "capture-app-shell-easy" : ""} mx-auto flex w-full max-w-[28rem] flex-col gap-6`.trim()}>
        <AppPageHeader
          title="Log a Job"
          subtitle="Type it, tap the room, and save."
          className={easyLog ? "page-hero-easy" : ""}
          iconClassName="log"
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
          scopeLabel={locationScopeLabel}
        />

        {params.added === "task" ? <ToastNotice message="Job recorded." tone="success" /> : null}
        {params.added === "done" ? <ToastNotice message="Completed job recorded." tone="success" /> : null}
        {params.error ? <ToastNotice message={getTaskFeedbackMessage(params.error)} tone="error" /> : null}
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
                <p className="settings-kicker">Add a job</p>
                <p className="quick-log-copy">{easyLog ? "Most jobs need three things: title, room, save." : "Most jobs need three things: title, room, save."}</p>
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
                label="What needs doing?"
                placeholder="Buy milk"
              />

              <RoomPillSelect
                className="quick-log-primary-step"
                locations={locations}
                rooms={roomOptions}
                requireRoom={restrictedToLocations}
                helperText="Your last room becomes the quick add default on home."
              />

              <FormActionButton className="capture-submit-btn quick-log-submit" pendingLabel="Saving job">
                Save job
              </FormActionButton>

              <p className="task-readonly-note quick-log-save-note">
                Need assignment, value, notes, or repeating? Open add details after picking the room.
              </p>
            </section>

            <details className="recorded-row quick-log-more">
              <summary className="recorded-row-summary">
                <div className="min-w-0">
                  <p className="recorded-row-title">Add details</p>
                  <p className="recorded-row-placeholder">Optional. Assign it now or add extra details only if you need them.</p>
                </div>
                <div className="recorded-row-meta">
                  <span className="recorded-row-edit">Optional</span>
                  <span className="recorded-row-chevron">+</span>
                </div>
              </summary>

              <div className="recorded-row-detail">
                <div className="capture-meta-grid quick-log-optional-grid">
                  {showAssignField ? (
                    <div className="capture-step">
                      <label className="capture-step-inner">
                        <span className="capture-step-label">Assign to</span>
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
                  ) : null}

                  <label className="recorded-field">
                    <span>Value</span>
                    <input
                      name="reward"
                      type="text"
                      inputMode="decimal"
                      placeholder="5.00"
                      className="recorded-edit-input"
                    />
                  </label>
                </div>

                <details className="recorded-more-details">
                  <summary className="recorded-more-summary">Add notes</summary>
                  <label className="recorded-field">
                    <span>Notes</span>
                    <textarea
                      name="detailNotes"
                      rows={2}
                      placeholder="Optional note"
                      className="recorded-edit-input recorded-edit-textarea"
                    />
                  </label>
                </details>

                <details className="recorded-more-details">
                  <summary className="recorded-more-summary">Repeat later</summary>
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

                <details className="recorded-more-details">
                  <summary className="recorded-more-summary">Advanced</summary>
                  <div className="capture-step">
                    <label className="capture-private-row">
                      <input type="checkbox" name="isPrivate" value="true" className="capture-private-check" />
                      <input type="hidden" name="isPrivate" value="false" />
                      <span className="capture-step-label">Private</span>
                      <span className="capture-private-hint">Only visible to you and the assigned person</span>
                    </label>
                  </div>
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
  const memberMode = isMemberRole(role);
  const canEditTasks = canUseMemberActions(role);
  const viewerMode = role === "viewer";
  const easyWorkspace = !childMode && (memberMode || !canEditTasks);
  const taskTake = mode === "projects" ? 28 : 48;
  const parentOccurrenceTake = mode === "projects" ? 8 : 6;
  const childOccurrenceTake = 2;
  const includeLegacyProjectPlanning = mode === "projects";
  const needsPeopleOptions = canEditTasks;
  const recordedTaskSelect = {
    id: true,
    title: true,
    createdByUserId: true,
    roomId: true,
    detailNotes: true,
    priority: true,
    isPrivate: true,
    jobKind: true,
    captureStage: true,
    createdAt: true,
    estimatedMinutes: true,
    rewardCents: true,
    rewardConfirmed: true,
    rewardPaidAt: true,
    projectParentId: true,
    ...(includeLegacyProjectPlanning
      ? {
          projectTargetAt: true,
          projectBudgetCents: true,
        }
      : {}),
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
      orderBy: [{ priority: "asc" as const }, { createdAt: "desc" as const }],
      select: {
        id: true,
        title: true,
        captureStage: true,
        estimatedMinutes: true,
        assignments: {
          where: { assignedTo: null },
          orderBy: { assignedFrom: "desc" as const },
          take: 1,
          select: {
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
          orderBy: { dueAt: "desc" as const },
          take: childOccurrenceTake,
          select: {
            status: true,
            dueAt: true,
          },
        },
      },
    },
    ...(includeLegacyProjectPlanning
      ? {
          projectMilestones: {
            orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
            select: {
              id: true,
              title: true,
              targetAt: true,
              completedAt: true,
              sortOrder: true,
            },
          },
          projectCosts: {
            orderBy: { notedAt: "desc" as const },
            select: {
              id: true,
              title: true,
              amountCents: true,
              notedAt: true,
            },
          },
          projectMaterials: {
            orderBy: [{ purchasedAt: "asc" as const }, { sortOrder: "asc" as const }, { createdAt: "asc" as const }],
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
        }
      : {}),
    assignments: {
      where: { assignedTo: null },
      orderBy: { assignedFrom: "desc" as const },
      take: 1,
      select: {
        userId: true,
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
      orderBy: { dueAt: "desc" as const },
      take: parentOccurrenceTake,
      select: {
        status: true,
        dueAt: true,
        completedAt: true,
        completedBy: true,
        completer: {
          select: {
            displayName: true,
          },
        },
      },
    },
  };

  const [rooms, people, locations, recordedTasks] = await Promise.all([
    prisma.room.findMany({
      where: { householdId, active: true, ...getRoomLocationAccessWhere(allowedLocationIds) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, designation: true, locationId: true, location: { select: { id: true, name: true } } },
    }),
    needsPeopleOptions
      ? prisma.householdMember.findMany({
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
        })
      : Promise.resolve([]),
    restrictedToLocations
      ? prisma.location.findMany({
          where: { householdId, active: true, id: { in: allowedLocationIds! } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
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
      select: recordedTaskSelect,
    }),
  ]);

  const roomOptions = uniqueRoomsByName(rooms).filter((room) => room.name.toLowerCase() !== "unsorted");
  const peopleOptions = needsPeopleOptions ? people.map((member) => member.user) : [];
  const selectedRoomId = roomOptions.some((room) => room.id === params.room) ? (params.room ?? "") : "";
  const selectedAssigneeId = !viewerMode && peopleOptions.some((person) => person.id === params.assignee) ? (params.assignee ?? "") : "";
  const selectedState: "all" | "open" | "done" = params.state === "done" || params.state === "open" ? params.state : "all";
  const luckyTask = params.lucky && params.lucky !== "empty"
    ? recordedTasks.find((task) => task.id === params.lucky)
    : null;
  const locationScopeLabel = restrictedToLocations ? getLocationScopeLabel(locations, allowedLocationIds) : null;

  return (
    <div className={`capture-shell ${mode === "projects" ? "page-projects" : "page-tasks"} ${audienceThemeClass} min-h-screen px-4 py-5`}>
      <main className={`capture-app-shell ${easyWorkspace ? "capture-app-shell-easy" : ""} mx-auto flex w-full max-w-[32rem] flex-col gap-6`.trim()}>
        <AppPageHeader
          title={
            childMode
              ? "My jobs"
              : mode === "projects"
                ? "Parent jobs"
                : "Jobs"
          }
          subtitle={
            childMode
              ? "See your jobs, start one, and mark it finished."
              : mode === "projects"
                ? "Older parent jobs still live here when work needs subtasks."
                : "See what needs doing, search it fast, and move jobs forward."
          }
          className={`${easyWorkspace ? "page-hero-easy" : ""} ${childMode ? "page-hero-kid" : ""}`.trim()}
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
          scopeLabel={locationScopeLabel}
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
        {params.updated === "reward-accepted" ? <ToastNotice message="Reward accepted." tone="success" /> : null}
        {params.updated === "reward-paid" ? <ToastNotice message="Reward marked paid." tone="success" /> : null}
        {params.updated === "project-material" ? <ToastNotice message="Project material updated." tone="success" /> : null}
        {params.updated === "project-milestone" ? <ToastNotice message="Project milestone updated." tone="success" /> : null}
        {params.removed === "project-cost" ? <ToastNotice message="Project cost removed." tone="success" /> : null}
        {params.removed === "project-material" ? <ToastNotice message="Project material removed." tone="success" /> : null}
        {params.removed === "project-milestone" ? <ToastNotice message="Project milestone removed." tone="success" /> : null}
        {params.lucky === "empty" ? <ToastNotice message="No jobs available for lucky dip." tone="info" /> : null}
        {luckyTask ? <ToastNotice message={`Lucky dip: ${luckyTask.title}`} tone="info" /> : null}
        {params.error ? <ToastNotice message={getTaskFeedbackMessage(params.error)} tone="error" /> : null}

        <TasksPanelClient
          key={[
            mode,
            selectedRoomId,
            selectedAssigneeId,
            selectedState,
            params.q ?? "",
          ].join(":")}
          roomOptions={roomOptions}
          peopleOptions={peopleOptions}
          initialRoomId={selectedRoomId}
          initialAssigneeId={selectedAssigneeId}
          initialState={selectedState}
          initialLuckyId={params.lucky && params.lucky !== "empty" ? params.lucky : null}
          initialQuery={params.q ?? ""}
          audienceBand={audienceBand}
          canEditTasks={canEditTasks}
          canManageProjects={canManageProjectsRole(role)}
          canDeleteTasks={isAdminRole(role)}
          easyMode={easyWorkspace}
          currentUserId={userId}
          basePath={mode === "projects" ? "/projects" : "/tasks"}
          viewMode={mode}
          panelKicker={
            childMode ? "Jobs" : mode === "projects" ? "Parent jobs" : "Jobs"
          }
          panelTitle={
            childMode ? "Your jobs" : mode === "projects" ? "Tasks with subtasks" : memberMode ? "Your jobs" : "Jobs"
          }
          emptyMessage={
            childMode
              ? "No jobs waiting right now. Nice work."
              : mode === "projects"
                ? "No parent jobs yet. Add subtasks to a task when work needs breaking down."
                : memberMode ? "No jobs for you right now." : "No jobs here yet."
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
            rewardCents: task.rewardCents,
            rewardConfirmed: task.rewardConfirmed,
            rewardPaidAt: task.rewardPaidAt?.toISOString() ?? null,
            projectTargetAt: includeLegacyProjectPlanning ? task.projectTargetAt?.toISOString() ?? null : null,
            projectBudgetCents: includeLegacyProjectPlanning ? task.projectBudgetCents : null,
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
            projectCosts: includeLegacyProjectPlanning
              ? task.projectCosts.map((cost) => ({
                  id: cost.id,
                  title: cost.title,
                  amountCents: cost.amountCents,
                  notedAt: cost.notedAt.toISOString(),
                }))
              : [],
            projectMaterials: includeLegacyProjectPlanning
              ? task.projectMaterials.map((material) => ({
                  id: material.id,
                  title: material.title,
                  quantityLabel: material.quantityLabel ?? null,
                  source: material.source ?? null,
                  estimatedCostCents: material.estimatedCostCents ?? null,
                  actualCostCents: material.actualCostCents ?? null,
                  purchasedAt: material.purchasedAt?.toISOString() ?? null,
                }))
              : [],
            projectMilestones: includeLegacyProjectPlanning
              ? task.projectMilestones.map((milestone) => ({
                  id: milestone.id,
                  title: milestone.title,
                  targetAt: milestone.targetAt?.toISOString() ?? null,
                  completedAt: milestone.completedAt?.toISOString() ?? null,
                  sortOrder: milestone.sortOrder,
                }))
              : [],
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
