"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAdminAction,
  getReturnPath,
  redirectToReturnPath,
  refreshViews,
} from "@/app/actions/_utils";

export async function createRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";
  const emojiRaw = String(formData.get("emoji") ?? "").trim();
  const emoji = emojiRaw || null;
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!name) {
    redirectToReturnPath(returnTo, { error: "room-name-required" });
    return;
  }

  const duplicateRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      locationId: locationId ?? null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicateRoom) {
    redirectToReturnPath(returnTo, { duplicate: "room" });
    return;
  }

  const maxSort = await prisma.room.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  const validLocation = locationId
    ? await prisma.location.findFirst({ where: { id: locationId, householdId, active: true }, select: { id: true } })
    : null;

  await prisma.room.create({
    data: {
      householdId,
      name,
      designation,
      emoji,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      locationId: locationId && validLocation ? locationId : null,
    },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms", "/settings/locations", "/setup/start"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { added: "room" });
  }
}

export async function updateRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim() || "General";
  const emojiRaw = String(formData.get("emoji") ?? "").trim();
  const emoji = emojiRaw || null;
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!roomId) {
    return;
  }

  if (!name) {
    redirectToReturnPath(returnTo, { error: "room-name-required" });
    return;
  }

  const currentRoom = await prisma.room.findFirst({
    where: { id: roomId, householdId, active: true },
    select: { locationId: true },
  });

  const duplicateRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      id: { not: roomId },
      locationId: currentRoom?.locationId ?? null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicateRoom) {
    redirectToReturnPath(returnTo, { duplicate: "room" });
    return;
  }

  if (!currentRoom) {
    redirectToReturnPath(returnTo, { error: "room-not-found" });
    return;
  }

  await prisma.room.updateMany({
    where: { id: roomId, householdId, active: true },
    data: { name, designation, emoji },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { updated: "room" });
  }
}

export async function deleteRoomAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!roomId) {
    return;
  }

  const room = await prisma.room.findFirst({
    where: { id: roomId, householdId },
    select: { id: true },
  });
  if (!room) {
    redirectToReturnPath(returnTo, { error: "room-not-found" });
    return;
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { roomId: room.id },
      data: { active: false },
    }),
    prisma.room.updateMany({
      where: { id: room.id, householdId },
      data: { active: false },
    }),
  ]);
  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms", "/settings/locations"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { archived: "room" });
  }
}

export async function updateRoomLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!roomId) return;

  const room = await prisma.room.findFirst({
    where: { id: roomId, householdId, active: true },
    select: { id: true },
  });
  if (!room) {
    redirectToReturnPath(returnTo, { error: "room-not-found" });
    return;
  }

  const validLocation = locationId
    ? await prisma.location.findFirst({ where: { id: locationId, householdId, active: true }, select: { id: true } })
    : null;
  if (locationId && !validLocation) {
    redirectToReturnPath(returnTo, { error: "location-not-found" });
    return;
  }

  await prisma.room.updateMany({
    where: { id: roomId, householdId, active: true },
    data: { locationId: locationId && validLocation ? locationId : null },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/rooms", "/settings/locations"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { updated: "room-location" });
  }
}

export async function createLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!name) {
    redirectToReturnPath(returnTo, { error: "location-name-required" });
    return;
  }

  const duplicate = await prisma.location.findFirst({
    where: { householdId, active: true, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    redirectToReturnPath(returnTo, { duplicate: "location" });
    return;
  }

  const maxSort = await prisma.location.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  await prisma.location.create({
    data: { householdId, name, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/locations"]);
  if (returnTo) redirectToReturnPath(returnTo, { added: "location" });
}

export async function updateLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!locationId) {
    return;
  }

  if (!name) {
    redirectToReturnPath(returnTo, { error: "location-name-required" });
    return;
  }

  const duplicate = await prisma.location.findFirst({
    where: { householdId, active: true, id: { not: locationId }, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    redirectToReturnPath(returnTo, { duplicate: "location" });
    return;
  }

  const result = await prisma.location.updateMany({
    where: { id: locationId, householdId, active: true },
    data: { name },
  });

  if (result.count === 0) {
    redirectToReturnPath(returnTo, { error: "location-not-found" });
    return;
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/locations"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { updated: "location" });
  }
}

export async function deleteLocationAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!locationId) return;

  const location = await prisma.location.findFirst({
    where: { id: locationId, householdId },
    select: { id: true },
  });
  if (!location) {
    redirectToReturnPath(returnTo, { error: "location-not-found" });
    return;
  }

  // Unlink rooms from this location (set locationId to null)
  await prisma.room.updateMany({
    where: { locationId: location.id, householdId },
    data: { locationId: null },
  });

  await prisma.location.updateMany({
    where: { id: location.id, householdId },
    data: { active: false },
  });

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/locations", "/settings/rooms"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { archived: "location" });
  }
}
