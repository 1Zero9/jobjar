"use client";

import { useState } from "react";

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
};

export function LocationRoomSelect({ locations, rooms }: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState(
    locations.length === 1 ? locations[0].id : ""
  );

  const visibleRooms = selectedLocationId
    ? rooms.filter((r) => r.location?.id === selectedLocationId)
    : rooms;

  return (
    <div className="capture-step">
      {locations.length > 1 ? (
        <label className="capture-step-inner">
          <span className="capture-step-label">Location (optional)</span>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="capture-room-select"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="capture-step-inner">
        <span className="capture-step-label">Room (optional)</span>
        <select name="roomId" defaultValue="" className="capture-room-select">
          <option value="">No room yet</option>
          {visibleRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
