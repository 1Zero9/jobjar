"use client";

import type { MemberAudience } from "@prisma/client";
import { TaskCard } from "@/app/components/TaskCard";
import { TaskFilters } from "@/app/components/TaskFilters";
import type { PersonOption, RoomOption, TaskItem } from "@/app/components/task-board-types";
import { getTaskState, groupRoomsByLocation, normalizeSearchText } from "@/app/components/task-board-utils";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type Props = {
  roomOptions: RoomOption[];
  peopleOptions: PersonOption[];
  tasks: TaskItem[];
  audienceBand: MemberAudience;
  initialRoomId: string;
  initialAssigneeId: string;
  initialState: "all" | "open" | "done";
  initialLuckyId: string | null;
  initialQuery?: string;
  canEditTasks: boolean;
  canManageProjects: boolean;
  canDeleteTasks: boolean;
  easyMode?: boolean;
  currentUserId: string;
  basePath?: string;
  viewMode?: "tasks" | "projects";
  panelTitle?: string;
  panelKicker?: string;
  emptyMessage?: string;
};

export function TasksPanelClient({
  roomOptions,
  peopleOptions,
  tasks,
  audienceBand,
  initialRoomId,
  initialAssigneeId,
  initialState,
  initialLuckyId,
  initialQuery = "",
  canEditTasks,
  canManageProjects,
  canDeleteTasks,
  easyMode = false,
  currentUserId,
  basePath = "/tasks",
  viewMode = "tasks",
  panelTitle = "Jobs",
  panelKicker = "Jobs",
  emptyMessage = "No jobs here yet.",
}: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(initialAssigneeId);
  const [selectedState, setSelectedState] = useState<"all" | "open" | "done">(initialState);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const groupedRoomOptions = groupRoomsByLocation(roomOptions);
  const projectMode = viewMode === "projects";
  const childMode = audienceBand === "under_12";
  const defaultVisibleLimit = childMode ? 18 : projectMode ? 16 : 24;
  const showSearch = !childMode;
  const showAssigneeFilter = !childMode && canEditTasks;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredTrimmedSearchQuery = deferredSearchQuery.trim();
  const normalizedSearchQuery = normalizeSearchText(deferredSearchQuery);
  const hasSearchQuery = showSearch && normalizedSearchQuery.length > 0;
  const hasActiveFilters = !!selectedRoomId || !!selectedAssigneeId || selectedState === "done" || selectedState === "all";
  const hasActiveView = hasActiveFilters || hasSearchQuery;
  const visibleLimitKey = `${defaultVisibleLimit}:${selectedRoomId}:${selectedAssigneeId}:${selectedState}:${normalizedSearchQuery}`;
  const [visibleLimitState, setVisibleLimitState] = useState({
    key: visibleLimitKey,
    limit: defaultVisibleLimit,
  });
  const activeVisibleLimit = visibleLimitState.key === visibleLimitKey
    ? visibleLimitState.limit
    : defaultVisibleLimit;

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.projectParentId) return false; // steps live inside their parent card
      const matchesRoom = selectedRoomId ? task.roomId === selectedRoomId : true;
      const matchesAssignee = selectedAssigneeId ? task.assignmentUserId === selectedAssigneeId : true;
      const matchesState = selectedState === "all" ? true : getTaskState(task) === selectedState;
      const matchesQuery = !hasSearchQuery || task.searchText.includes(normalizedSearchQuery);
      return matchesRoom && matchesAssignee && matchesState && matchesQuery;
    });
  }, [hasSearchQuery, normalizedSearchQuery, selectedAssigneeId, selectedRoomId, selectedState, tasks]);

  const luckyTaskIndex = useMemo(
    () => (initialLuckyId ? visibleTasks.findIndex((task) => task.id === initialLuckyId) : -1),
    [initialLuckyId, visibleTasks],
  );
  const renderLimit = luckyTaskIndex >= 0 ? Math.max(activeVisibleLimit, luckyTaskIndex + 1) : activeVisibleLimit;
  const renderedTasks = useMemo(() => visibleTasks.slice(0, renderLimit), [renderLimit, visibleTasks]);
  const remainingTasksCount = visibleTasks.length - renderedTasks.length;

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);

    if (selectedRoomId) search.set("room", selectedRoomId);
    else search.delete("room");

    if (selectedAssigneeId) search.set("assignee", selectedAssigneeId);
    else search.delete("assignee");

    if (selectedState === "done" || selectedState === "all") search.set("state", selectedState);
    else search.delete("state");

    search.delete("location");
    search.delete("view");

    if (hasSearchQuery) search.set("q", deferredTrimmedSearchQuery);
    else search.delete("q");

    const query = search.toString();
    window.history.replaceState(null, "", query ? `${basePath}?${query}` : basePath);
  }, [basePath, deferredTrimmedSearchQuery, hasSearchQuery, selectedAssigneeId, selectedRoomId, selectedState]);

  return (
    <section id="recorded" className={`recorded-panel ${easyMode ? "recorded-panel-easy" : ""}`.trim()}>
      <div className="recorded-header">
        <div>
          <p className="capture-kicker">{panelKicker}</p>
          <h2 className="recorded-title">{panelTitle}</h2>
        </div>
        <span className="recorded-count">{visibleTasks.length}</span>
      </div>

      <TaskFilters
        childMode={childMode}
        showSearch={showSearch}
        showAssigneeFilter={showAssigneeFilter}
        tasksCount={tasks.length}
        visibleCount={visibleTasks.length}
        searchQuery={searchQuery}
        hasSearchQuery={hasSearchQuery}
        hasActiveFilters={hasActiveFilters}
        groupedRoomOptions={groupedRoomOptions}
        peopleOptions={peopleOptions}
        selectedRoomId={selectedRoomId}
        selectedAssigneeId={selectedAssigneeId}
        selectedState={selectedState}
        onSearchQueryChange={setSearchQuery}
        onSelectedRoomIdChange={setSelectedRoomId}
        onSelectedAssigneeIdChange={setSelectedAssigneeId}
        onSelectedStateChange={setSelectedState}
        onClearFilters={() => {
          setSearchQuery("");
          setSelectedRoomId("");
          setSelectedAssigneeId("");
          setSelectedState("all");
        }}
      />

      <div className="recorded-list">
        {visibleTasks.length === 0 ? (
          hasActiveView ? (
            <p className="recorded-empty">
              {childMode
                ? "No jobs match this view."
                : hasSearchQuery
                  ? `No ${projectMode ? "parent jobs" : "jobs"} match this search.`
                  : "No jobs match these filters."}
            </p>
          ) : (
            <div className="recorded-empty-card">
              <p className="recorded-empty">{emptyMessage}</p>
              <div className="recorded-row-actions">
                {projectMode ? (
                  <Link href="/tasks" className="action-btn subtle quiet">
                    Open jobs
                  </Link>
                ) : canEditTasks && !childMode ? (
                  <Link href="/log" className="action-btn bright quiet">
                    Add a job
                  </Link>
                ) : (
                  <Link href="/" className="action-btn subtle quiet">
                    Go home
                  </Link>
                )}
              </div>
            </div>
          )
        ) : (
          <>
            {renderedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                initialOpen={task.id === initialLuckyId}
                groupedRoomOptions={groupedRoomOptions}
                peopleOptions={peopleOptions}
                childMode={childMode}
                canEditTasks={canEditTasks}
                canManageProjects={canManageProjects}
                canDeleteTasks={canDeleteTasks}
                currentUserId={currentUserId}
                basePath={basePath}
              />
            ))}
            {remainingTasksCount > 0 ? (
              <div className="recorded-row-actions">
                <button
                  type="button"
                  className="action-btn subtle quiet"
                  onClick={() =>
                    setVisibleLimitState({
                      key: visibleLimitKey,
                      limit: activeVisibleLimit + defaultVisibleLimit,
                    })
                  }
                >
                  Show {Math.min(defaultVisibleLimit, remainingTasksCount)} more
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
