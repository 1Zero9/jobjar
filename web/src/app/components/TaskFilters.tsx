"use client";

import type { GroupedRoomOptions, PersonOption } from "@/app/components/task-board-types";

type Props = {
  childMode: boolean;
  memberMode: boolean;
  showSearch: boolean;
  tasksCount: number;
  visibleCount: number;
  searchQuery: string;
  hasSearchQuery: boolean;
  hasActiveFilters: boolean;
  groupedRoomOptions: GroupedRoomOptions;
  peopleOptions: PersonOption[];
  selectedRoomId: string;
  selectedAssigneeId: string;
  selectedState: "all" | "open" | "done";
  onSearchQueryChange: (value: string) => void;
  onSelectedRoomIdChange: (value: string) => void;
  onSelectedAssigneeIdChange: (value: string) => void;
  onSelectedStateChange: (value: "all" | "open" | "done") => void;
  onClearFilters: () => void;
};

export function TaskFilters({
  childMode,
  memberMode,
  showSearch,
  tasksCount,
  visibleCount,
  searchQuery,
  hasSearchQuery,
  hasActiveFilters,
  groupedRoomOptions,
  peopleOptions,
  selectedRoomId,
  selectedAssigneeId,
  selectedState,
  onSearchQueryChange,
  onSelectedRoomIdChange,
  onSelectedAssigneeIdChange,
  onSelectedStateChange,
  onClearFilters,
}: Props) {
  return (
    <div className="recorded-toolbar">
      {showSearch ? (
        <div className="recorded-search-wrap">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search jobs"
            className="recorded-search-input"
          />
          <span className="recorded-search-count">
            {hasSearchQuery ? `${visibleCount} shown` : `${tasksCount} total`}
          </span>
        </div>
      ) : null}

      <details className="recorded-toolbar-details" open={hasActiveFilters}>
        <summary className="recorded-toolbar-summary">
          <span>Filters</span>
          <span className="recorded-row-chevron">▾</span>
        </summary>
        <div className="recorded-filter-bar">
          {!childMode ? (
            <label className="recorded-filter-field">
              <span>Room</span>
              <select
                value={selectedRoomId}
                onChange={(event) => onSelectedRoomIdChange(event.target.value)}
                className={`recorded-filter-select${selectedRoomId ? " filter-active" : ""}`}
              >
                <option value="">All rooms</option>
                {groupedRoomOptions.map(([group, groupedRooms]) => (
                  <optgroup key={group} label={group}>
                    {groupedRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          ) : null}

          <label className="recorded-filter-field">
            <span>{childMode ? "Show" : "State"}</span>
            <select
              value={selectedState}
              onChange={(event) => onSelectedStateChange(event.target.value as "all" | "open" | "done")}
              className={`recorded-filter-select${selectedState !== "all" ? " filter-active" : ""}`}
            >
              <option value="all">{childMode ? "Everything" : "All states"}</option>
              <option value="open">{childMode ? "Ready to do" : "Open"}</option>
              <option value="done">{childMode ? "Finished" : "Done"}</option>
            </select>
          </label>

          {!childMode && !memberMode ? (
            <label className="recorded-filter-field">
              <span>Assigned</span>
              <select
                value={selectedAssigneeId}
                onChange={(event) => onSelectedAssigneeIdChange(event.target.value)}
                className={`recorded-filter-select${selectedAssigneeId ? " filter-active" : ""}`}
              >
                <option value="">Anyone</option>
                {peopleOptions.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </details>

      <div className="recorded-toolbar-actions">
        {hasActiveFilters || hasSearchQuery ? (
          <button type="button" className="action-btn subtle quiet" onClick={onClearFilters}>
            {childMode ? "Reset view" : hasSearchQuery ? "Clear search + filters" : "Clear filters"}
          </button>
        ) : (
          <span className="recorded-toolbar-hint">
            {childMode
              ? "Your jobs update right away."
              : memberMode
                ? "Your jobs stay focused and simple."
                : showSearch
                  ? "Search or filter to narrow the list."
                  : "Filter to narrow the list."}
          </span>
        )}
      </div>
    </div>
  );
}
