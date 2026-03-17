"use client";

import type { MemberAudience } from "@prisma/client";
import { TaskCard } from "@/app/components/TaskCard";
import { TaskFilters } from "@/app/components/TaskFilters";
import type { PersonOption, RoomOption, TaskItem } from "@/app/components/task-board-types";
import { getTaskSearchText, getTaskState, groupRoomsByLocation, normalizeSearchText } from "@/app/components/task-board-utils";
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
  memberMode: boolean;
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
  memberMode,
  easyMode = false,
  currentUserId,
  basePath = "/tasks",
  viewMode = "tasks",
  panelTitle = "Job board",
  panelKicker = "Jobs",
  emptyMessage = "No jobs on the board yet.",
}: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(initialAssigneeId);
  const [selectedState, setSelectedState] = useState<"all" | "open" | "done">(initialState);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const groupedRoomOptions = groupRoomsByLocation(roomOptions);
  const projectMode = viewMode === "projects";
  const childMode = audienceBand === "under_12";
  const teenMode = audienceBand === "teen_12_18";
  const showSearch = !childMode && !memberMode;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = normalizeSearchText(deferredSearchQuery);
  const hasSearchQuery = showSearch && normalizedSearchQuery.length > 0;
  const hasActiveFilters = !!selectedRoomId || !!selectedAssigneeId || selectedState !== "all";
  const hasActiveView = hasActiveFilters || hasSearchQuery;

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesRoom = selectedRoomId ? task.roomId === selectedRoomId : true;
      const matchesAssignee = selectedAssigneeId ? task.assignmentUserId === selectedAssigneeId : true;
      const matchesState = selectedState === "all" ? true : getTaskState(task) === selectedState;
      const matchesQuery = !hasSearchQuery || getTaskSearchText(task).includes(normalizedSearchQuery);
      return matchesRoom && matchesAssignee && matchesState && matchesQuery;
    });
  }, [hasSearchQuery, normalizedSearchQuery, selectedAssigneeId, selectedRoomId, selectedState, tasks]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);

    if (selectedRoomId) search.set("room", selectedRoomId);
    else search.delete("room");

    if (selectedAssigneeId) search.set("assignee", selectedAssigneeId);
    else search.delete("assignee");

    if (selectedState !== "all") search.set("state", selectedState);
    else search.delete("state");

    search.delete("location");
    search.delete("view");

    if (hasSearchQuery) search.set("q", searchQuery.trim());
    else search.delete("q");

    const query = search.toString();
    window.history.replaceState(null, "", query ? `${basePath}?${query}` : basePath);
  }, [basePath, hasSearchQuery, searchQuery, selectedAssigneeId, selectedRoomId, selectedState]);

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
        memberMode={memberMode}
        showSearch={showSearch}
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
          <p className="recorded-empty">
            {hasActiveView
              ? childMode
                ? "No jobs match this view."
                : hasSearchQuery
                  ? `No ${projectMode ? "parent jobs" : "jobs"} match this search.`
                  : "No jobs match these filters."
              : emptyMessage}
          </p>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              initialOpen={task.id === initialLuckyId}
              groupedRoomOptions={groupedRoomOptions}
              peopleOptions={peopleOptions}
              childMode={childMode}
              teenMode={teenMode}
              canEditTasks={canEditTasks}
              canManageProjects={canManageProjects}
              canDeleteTasks={canDeleteTasks}
              currentUserId={currentUserId}
              basePath={basePath}
            />
          ))
        )}
      </div>
    </section>
  );
}
