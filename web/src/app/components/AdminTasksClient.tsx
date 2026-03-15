"use client";

import { deleteTaskAction, updateTaskAction } from "@/app/actions";
import type { AdminTask, AdminRoom, AdminPerson } from "@/lib/admin-data";
import { useState } from "react";

type Props = {
  tasks: AdminTask[];
  rooms: AdminRoom[];
  people: AdminPerson[];
};

export function AdminTasksClient({ tasks, rooms, people }: Props) {
  const [query, setQuery] = useState("");

  const projectOptions = tasks.filter((task) => task.jobKind === "project" || task.childCount > 0);

  const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));
  const personNameById = new Map(people.map((person) => [person.id, person.displayName]));

  const q = query.trim().toLowerCase();
  const filteredTasks = !q
    ? tasks
    : tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.detailNotes.toLowerCase().includes(q) ||
          task.locationDetails.toLowerCase().includes(q) ||
          (roomNameById.get(task.roomId) ?? "").toLowerCase().includes(q) ||
          (personNameById.get(task.assigneeUserId) ?? "").toLowerCase().includes(q),
      );

  return (
    <div className="space-y-3">
      <div className="admin-search-wrap">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tasks.length} tasks…`}
          className="admin-search-input"
        />
        {query ? (
          <span className="admin-search-count">{filteredTasks.length} match{filteredTasks.length !== 1 ? "es" : ""}</span>
        ) : (
          <span className="admin-search-count">{tasks.length}</span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-accent-muted bg-accent-soft">
        <div className="admin-grid-header hidden px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:gap-2">
          <p>Task</p>
          <p>Room</p>
          <p>Assigned to</p>
          <p>Due</p>
          <p>Actions</p>
        </div>
        <div className="space-y-2 p-2">
          {filteredTasks.length === 0 ? (
            <p className="rounded-lg bg-surface p-3 text-sm text-muted">
              {query ? `No tasks match "${query}".` : "No tasks yet."}
            </p>
          ) : null}

          {filteredTasks.map((task) => (
            <article key={task.id} className="rounded-lg border border-border bg-surface p-2">
              <form action={updateTaskAction} className="space-y-2">
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value="/admin#section-tasks" />
                <input type="hidden" name="strictModeMarker" value="1" />

                {/* Title + Room */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr]">
                  <input name="title" type="text" defaultValue={task.title} className="admin-input px-2 py-1.5 text-xs" />
                  <select name="roomId" defaultValue={task.roomId} className="admin-input px-2 py-1.5 text-xs">
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee + Due + Type + Stage */}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <select name="assigneeUserId" defaultValue={task.assigneeUserId} className="admin-input px-2 py-1.5 text-xs">
                    <option value="">Unassigned</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>{person.displayName}</option>
                    ))}
                  </select>
                  <input name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(task.dueAt)} className="admin-input px-2 py-1.5 text-xs" />
                  <select name="jobKind" defaultValue={task.jobKind} className="admin-input px-2 py-1.5 text-xs">
                    <option value="upkeep">Upkeep</option>
                    <option value="issue">Issue</option>
                    <option value="project">Project</option>
                    <option value="clear_out">Clear-out</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="planning">Planning</option>
                  </select>
                  <select name="captureStage" defaultValue={task.captureStage} className="admin-input px-2 py-1.5 text-xs">
                    <option value="captured">Captured</option>
                    <option value="shaped">Shaped</option>
                    <option value="active">Active</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Location + Notes */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr]">
                  <input name="locationDetails" type="text" defaultValue={task.locationDetails} placeholder="Location detail" className="admin-input px-2 py-1.5 text-xs" />
                  <input name="detailNotes" type="text" defaultValue={task.detailNotes} placeholder="Notes / materials / next step" className="admin-input px-2 py-1.5 text-xs" />
                </div>

                {/* Parent project */}
                <select name="projectParentId" defaultValue={task.projectParentId} className="admin-input w-full px-2 py-1.5 text-xs">
                  <option value="">No parent project</option>
                  {projectOptions
                    .filter((option) => option.id !== task.id)
                    .map((option) => (
                      <option key={option.id} value={option.id}>{option.title}</option>
                    ))}
                </select>

                {/* Recurrence & timing */}
                <details className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted">
                  <summary className="cursor-pointer font-semibold">Recurrence &amp; timing</summary>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <label className="admin-field-label">
                      <span>Repeats</span>
                      <select name="recurrenceType" defaultValue={task.recurrenceType} className="admin-input px-2 py-1.5 text-xs">
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    <label className="admin-field-label">
                      <span>Every N</span>
                      <input name="recurrenceInterval" type="number" min={1} defaultValue={task.recurrenceInterval} className="admin-input px-2 py-1.5 text-xs" />
                    </label>
                    <label className="admin-field-label">
                      <span>Time of day</span>
                      <input name="recurrenceTime" type="time" defaultValue={task.recurrenceTime} className="admin-input px-2 py-1.5 text-xs" />
                    </label>
                    <label className="admin-field-label">
                      <span>Est. minutes</span>
                      <input name="estimatedMinutes" type="number" min={1} defaultValue={task.estimatedMinutes} className="admin-input px-2 py-1.5 text-xs" />
                    </label>
                    <label className="admin-field-label">
                      <span>Grace hours</span>
                      <input name="graceHours" type="number" min={1} defaultValue={task.graceHours} className="admin-input px-2 py-1.5 text-xs" />
                    </label>
                    <label className="admin-field-label">
                      <span>Min. minutes</span>
                      <input name="minimumMinutes" type="number" min={0} defaultValue={task.minimumMinutes} className="admin-input px-2 py-1.5 text-xs" />
                    </label>
                  </div>
                  <label className="mt-2 flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs text-muted">
                    <input type="checkbox" name="strictMode" defaultChecked={task.validationMode === "strict"} />
                    Strict proof mode
                  </label>
                </details>

                <button className="action-btn subtle">Save</button>
              </form>

              <form action={deleteTaskAction} className="mt-2">
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value="/admin#section-tasks" />
                <button className="action-btn warn">Archive</button>
              </form>

              {task.projectParentTitle ? (
                <p className="mt-1 text-[11px] text-muted">↳ Sub-task of: {task.projectParentTitle}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function toDateTimeLocal(dateIso: string | null) {
  if (!dateIso) return "";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
