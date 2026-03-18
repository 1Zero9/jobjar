"use client";

import { useEffect, useMemo, useState } from "react";

type LocationOption = {
  id: string;
  name: string;
};

type RoomOption = {
  id: string;
  name: string;
  location: { id: string; name: string } | null;
};

type Props = {
  locations: LocationOption[];
  rooms: RoomOption[];
  requireRoom?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
};

export const ROOM_PREFERENCE_ID_KEY = "jobjar-last-room-id";
export const ROOM_PREFERENCE_NAME_KEY = "jobjar-last-room-name";

export function RoomPillSelect({
  locations,
  rooms,
  requireRoom = false,
  className = "",
  label = "Room",
  helperText = "Your last room becomes the quick-capture default on home.",
}: Props) {
  const initialSelection = getInitialSelection(rooms, locations, requireRoom);
  const [selectedRoomId, setSelectedRoomId] = useState(initialSelection.roomId);
  const [selectedLocationId, setSelectedLocationId] = useState(initialSelection.locationId);

  useEffect(() => {
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

    if (selectedRoom) {
      persistPreferredRoom(selectedRoom.id, formatRoomName(selectedRoom.name));
      return;
    }

    if (!selectedRoomId && !requireRoom) {
      window.localStorage.removeItem(ROOM_PREFERENCE_ID_KEY);
      window.localStorage.removeItem(ROOM_PREFERENCE_NAME_KEY);
    }
  }, [requireRoom, rooms, selectedLocationId, selectedRoomId]);

  const visibleRooms = useMemo(() => {
    if (!selectedLocationId) {
      return rooms;
    }
    return rooms.filter((room) => room.location?.id === selectedLocationId);
  }, [rooms, selectedLocationId]);

  return (
    <div className={`capture-step ${className}`.trim()}>
      <input type="hidden" name="roomId" value={selectedRoomId} />

      {locations.length > 1 ? (
        <div className="capture-step-inner">
          <span className="capture-step-label">Location</span>
          <div className="capture-pill-row">
            <button
              type="button"
              className={`capture-pill ${selectedLocationId === "" ? "is-selected" : ""}`.trim()}
              onClick={() => setSelectedLocationId("")}
            >
              All
            </button>
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={`capture-pill ${selectedLocationId === location.id ? "is-selected" : ""}`.trim()}
                onClick={() => setSelectedLocationId(location.id)}
              >
                {location.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="capture-step-inner">
        <div className="capture-room-heading">
          <span className="capture-step-label">
            {label} {requireRoom ? "" : "(remembered)"}
          </span>
          <span className="capture-room-helper">{helperText}</span>
        </div>

        <div className="capture-pill-row">
          {!requireRoom ? (
            <button
              type="button"
              className={`capture-pill ${selectedRoomId === "" ? "is-selected" : ""}`.trim()}
              onClick={() => setSelectedRoomId("")}
            >
              General
            </button>
          ) : null}
          {visibleRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`capture-pill ${selectedRoomId === room.id ? "is-selected" : ""}`.trim()}
              onClick={() => {
                setSelectedRoomId(room.id);
                if (room.location?.id) {
                  setSelectedLocationId(room.location.id);
                }
              }}
            >
              {formatRoomName(room.name)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RoomSelectField({
  locations,
  rooms,
  requireRoom = false,
  className = "",
  label = "Room",
  helperText = "Pick the location first if you need it, then choose the room.",
}: Props) {
  const initialSelection = getInitialSelection(rooms, locations, requireRoom);
  const [selectedRoomId, setSelectedRoomId] = useState(initialSelection.roomId);
  const [selectedLocationId, setSelectedLocationId] = useState(initialSelection.locationId);

  useEffect(() => {
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

    if (selectedRoom) {
      persistPreferredRoom(selectedRoom.id, formatRoomName(selectedRoom.name));
      return;
    }

    if (!selectedRoomId && !requireRoom) {
      window.localStorage.removeItem(ROOM_PREFERENCE_ID_KEY);
      window.localStorage.removeItem(ROOM_PREFERENCE_NAME_KEY);
    }
  }, [requireRoom, rooms, selectedRoomId]);

  const visibleRooms = useMemo(() => {
    if (!selectedLocationId) {
      return rooms;
    }
    return rooms.filter((room) => room.location?.id === selectedLocationId);
  }, [rooms, selectedLocationId]);
  const duplicateRoomNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of rooms) {
      const key = normalizeRoomName(room.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [rooms]);

  return (
    <div className={`capture-step ${className}`.trim()}>
      {locations.length > 1 ? (
        <label className="capture-step-inner">
          <span className="capture-step-label">Location</span>
          <select
            value={selectedLocationId}
            onChange={(event) => {
              const nextLocationId = event.target.value;
              setSelectedLocationId(nextLocationId);
              setSelectedRoomId((currentRoomId) => {
                const currentRoom = rooms.find((room) => room.id === currentRoomId) ?? null;
                if (!currentRoom) {
                  return requireRoom && nextLocationId
                    ? (rooms.find((room) => room.location?.id === nextLocationId)?.id ?? "")
                    : currentRoomId;
                }
                if (!nextLocationId || currentRoom.location?.id === nextLocationId) {
                  return currentRoomId;
                }
                return requireRoom
                  ? (rooms.find((room) => room.location?.id === nextLocationId)?.id ?? "")
                  : "";
              });
            }}
            className="capture-room-select"
          >
            <option value="">{requireRoom ? "Choose location" : "All locations"}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="capture-step-inner">
        <div className="capture-room-heading">
          <span className="capture-step-label">{label}</span>
          <span className="capture-room-helper">{helperText}</span>
        </div>
        <select
          name="roomId"
          value={selectedRoomId}
          onChange={(event) => {
            const nextRoomId = event.target.value;
            setSelectedRoomId(nextRoomId);
            const selectedRoom = rooms.find((room) => room.id === nextRoomId) ?? null;
            if (selectedRoom?.location?.id) {
              setSelectedLocationId(selectedRoom.location.id);
            }
          }}
          className="capture-room-select"
        >
          {!requireRoom ? <option value="">General</option> : <option value="">Choose room</option>}
          {visibleRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {formatRoomOptionLabel(room, duplicateRoomNames)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function readPreferredRoom(rooms: RoomOption[]) {
  if (typeof window === "undefined") {
    return null;
  }

  const savedRoomId = window.localStorage.getItem(ROOM_PREFERENCE_ID_KEY);
  if (savedRoomId) {
    const matchingRoom = rooms.find((room) => room.id === savedRoomId);
    if (matchingRoom) {
      return matchingRoom;
    }
  }

  return null;
}

export function readPreferredRoomName() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ROOM_PREFERENCE_NAME_KEY) ?? "";
}

export function persistPreferredRoom(roomId: string, roomName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ROOM_PREFERENCE_ID_KEY, roomId);
  window.localStorage.setItem(ROOM_PREFERENCE_NAME_KEY, roomName);
}

export function getFallbackRoom(rooms: RoomOption[]) {
  return (
    rooms.find((room) => normalizeRoomName(room.name) === "general")
    ?? rooms.find((room) => normalizeRoomName(room.name) === "unsorted")
    ?? rooms[0]
    ?? null
  );
}

export function formatRoomName(roomName: string) {
  const normalized = normalizeRoomName(roomName);
  if (normalized === "unsorted") {
    return "General";
  }
  return roomName;
}

function formatRoomOptionLabel(room: RoomOption, duplicateRoomNames: Map<string, number>) {
  const roomName = formatRoomName(room.name);
  if ((duplicateRoomNames.get(normalizeRoomName(room.name)) ?? 0) <= 1) {
    return roomName;
  }
  return `${roomName} (${room.location?.name ?? "No location"})`;
}

function getInitialSelection(rooms: RoomOption[], locations: LocationOption[], requireRoom: boolean) {
  const preferredRoom = readPreferredRoom(rooms);
  const fallbackRoom = requireRoom ? getFallbackRoom(rooms) : preferredRoom;
  const nextRoom = preferredRoom ?? fallbackRoom;

  return {
    roomId: nextRoom?.id ?? "",
    locationId: nextRoom?.location?.id ?? (locations.length === 1 ? locations[0].id : ""),
  };
}

function normalizeRoomName(value: string) {
  return value.trim().toLowerCase();
}
