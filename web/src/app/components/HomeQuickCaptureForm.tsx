"use client";

import { createQuickTaskAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";
import {
  formatRoomName,
  getFallbackRoom,
  readPreferredRoom,
  readPreferredRoomName,
} from "@/app/components/RoomPillSelect";
import Link from "next/link";
import { useState } from "react";

type RoomOption = {
  id: string;
  name: string;
  location: { id: string; name: string } | null;
};

type Props = {
  rooms: RoomOption[];
  requireRoom?: boolean;
};

export function HomeQuickCaptureForm({ rooms, requireRoom = false }: Props) {
  const initialPreference = getInitialQuickCapturePreference(rooms, requireRoom);
  const [roomId] = useState(initialPreference.roomId);
  const [roomLabel] = useState(initialPreference.roomLabel);

  return (
    <form action={createQuickTaskAction} className="home-quick-capture">
      <input type="hidden" name="returnTo" value="/" />
      <input type="hidden" name="roomId" value={roomId} />
      <div className="home-quick-capture-row">
        <input
          name="title"
          type="text"
          required
          placeholder="What needs doing?"
          className="home-quick-capture-input glass-surface"
        />
        <FormActionButton className="home-quick-capture-submit" pendingLabel="Saving">
          Save job
        </FormActionButton>
      </div>
      <div className="home-quick-capture-meta">
        <span>
          Saving to <strong>{roomLabel}</strong>
        </span>
        <Link href="/log">Open full log</Link>
      </div>
    </form>
  );
}

function getInitialQuickCapturePreference(rooms: RoomOption[], requireRoom: boolean) {
  const preferredRoom = readPreferredRoom(rooms);
  const fallbackRoom = requireRoom ? getFallbackRoom(rooms) : null;
  const nextRoom = preferredRoom ?? fallbackRoom;
  const savedName = readPreferredRoomName();

  return {
    roomId: nextRoom?.id ?? "",
    roomLabel: nextRoom ? formatRoomName(nextRoom.name) : savedName || "General",
  };
}
