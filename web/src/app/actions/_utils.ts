import { canManageProjectsRole, canUseMemberActions, requireSessionContext } from "@/lib/auth";
import { hasLocationRestrictions } from "@/lib/location-access";
import { canAccessExtendedViews } from "@/lib/member-audience";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export function toPositiveInt(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return fallback;
  }
  return num;
}

export function toPositiveIntOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

export function toNonNegativeInt(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return fallback;
  }
  return num;
}

export function toCurrencyCentsOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function toDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function parseRecurrenceType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "daily" || raw === "weekly" || raw === "monthly" || raw === "custom") {
    return raw;
  }
  return null;
}

export function parseOptionalRecurrenceType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw;
  }
  return null;
}

export function parseJobKind(value: FormDataEntryValue | null, fallback: "upkeep" | "issue" | "project" | "clear_out" | "outdoor" | "planning") {
  const raw = String(value ?? "").trim();
  if (raw === "upkeep" || raw === "issue" || raw === "project" || raw === "clear_out" || raw === "outdoor" || raw === "planning") {
    return raw;
  }
  return fallback;
}

export function parseCaptureStage(value: FormDataEntryValue | null, fallback: "captured" | "shaped" | "active" | "done") {
  const raw = String(value ?? "").trim();
  if (raw === "captured" || raw === "shaped" || raw === "active" || raw === "done") {
    return raw;
  }
  return fallback;
}

export function parseMemberRole(value: string, fallback: "admin" | "power_user" | "member" | "viewer") {
  if (value === "admin" || value === "power_user" || value === "member" || value === "viewer") {
    return value;
  }
  return fallback;
}

export function parseMemberAudience(value: string, fallback: "adult" | "teen_12_18" | "under_12") {
  if (value === "adult" || value === "teen_12_18" || value === "under_12") {
    return value;
  }
  return fallback;
}

export function parseMemberProfileTheme(value: string, fallback: "default_theme" | "boy_blue" | "girl_pink") {
  if (value === "default_theme" || value === "boy_blue" || value === "girl_pink") {
    return value;
  }
  return fallback;
}

export function parseNotifyChannel(value: string, fallback: "sms" | "push" | "none") {
  if (value === "sms" || value === "push" || value === "none") {
    return value;
  }
  return fallback;
}

export function inferJobKindFromText(text: string): "upkeep" | "issue" | "project" | "clear_out" | "outdoor" | "planning" {
  const value = text.toLowerCase();
  if (value.includes("garden") || value.includes("hedge") || value.includes("grass") || value.includes("plants")) {
    return "outdoor";
  }
  if (value.includes("attic") || value.includes("clear") || value.includes("dump") || value.includes("donat")) {
    return "clear_out";
  }
  if (value.includes("decorate") || value.includes("paint") || value.includes("renovat") || value.includes("redo")) {
    return "project";
  }
  if (value.includes("warning") || value.includes("tyre") || value.includes("repair") || value.includes("fix") || value.includes("car")) {
    return "issue";
  }
  if (value.includes("plan") || value.includes("sort") || value.includes("organ")) {
    return "planning";
  }
  return "upkeep";
}

export function normalizePhoneNumber(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[\s()-]/g, "");
  if (!/^\+\d{8,15}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export async function resolveProjectParentId(
  projectParentId: string,
  householdId: string,
  currentTaskId?: string,
  allowedLocationIds?: string[] | null,
) {
  if (!projectParentId || projectParentId === currentTaskId) {
    return null;
  }

  const parent = await prisma.task.findFirst({
    where: {
      id: projectParentId,
      active: true,
      room: getAccessibleRoomWhere(householdId, allowedLocationIds),
    },
    select: { id: true },
  });

  return parent?.id ?? null;
}

export async function resolvePostLoginPath(userId: string, householdId: string, requestedPath: string) {
  const safePath = requestedPath.startsWith("/") ? requestedPath : "/";
  if (safePath !== "/") {
    return safePath;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { role: true },
  });

  if (membership?.role !== "admin") {
    return "/";
  }

  const [roomCount, taskCount] = await Promise.all([
    prisma.room.count({
      where: {
        householdId,
        active: true,
        name: { not: "Unsorted" },
      },
    }),
    prisma.task.count({
      where: {
        active: true,
        room: { householdId },
      },
    }),
  ]);

  return roomCount > 0 && taskCount > 0 ? "/" : "/setup/start";
}

export function refreshViews(paths = ["/", "/log", "/tasks", "/admin", "/settings", "/settings/rooms", "/settings/people", "/settings/locations", "/setup/start", "/login"]) {
  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}

export function getReturnPath(value: FormDataEntryValue | null | undefined, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/")) {
    return fallback;
  }
  return raw;
}

export function redirectToReturnPath(
  returnTo: string,
  params: Record<string, string>,
  hash?: string,
) {
  if (!returnTo) {
    return;
  }

  redirect(buildReturnPath(returnTo, params, hash));
}

export function buildReturnPath(
  path: string,
  params: Record<string, string>,
  hash?: string,
) {
  const [pathWithoutHash, currentHash] = path.split("#", 2);
  const [pathname, search = ""] = pathWithoutHash.split("?", 2);
  const nextSearch = new URLSearchParams(search);

  for (const [key, value] of Object.entries(params)) {
    nextSearch.set(key, value);
  }

  const query = nextSearch.toString();
  const hashValue = hash ?? currentHash;
  return `${pathname}${query ? `?${query}` : ""}${hashValue ? `#${hashValue}` : ""}`;
}

export async function resolveMemberUserId(householdId: string, userId: string) {
  if (!userId) {
    return null;
  }

  const member = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });

  return member?.userId ?? null;
}

export function getAccessibleRoomWhere(householdId: string, allowedLocationIds: string[] | null | undefined) {
  return {
    householdId,
    ...(hasLocationRestrictions(allowedLocationIds) ? { locationId: { in: allowedLocationIds! } } : {}),
  };
}

export function parseLocationIds(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export async function replaceMemberLocationAccess(householdId: string, userId: string, requestedLocationIds: string[]) {
  const validLocationIds = requestedLocationIds.length === 0
    ? []
    : (await prisma.location.findMany({
        where: {
          householdId,
          active: true,
          id: { in: requestedLocationIds },
        },
        select: { id: true },
      })).map((location) => location.id);

  await prisma.householdMemberLocationAccess.deleteMany({
    where: { householdId, userId },
  });

  if (validLocationIds.length > 0) {
    await prisma.householdMemberLocationAccess.createMany({
      data: validLocationIds.map((locationId) => ({
        householdId,
        userId,
        locationId,
      })),
    });
  }
}

export async function resolveAssignableMemberUserId(householdId: string, userId: string, roomId: string) {
  if (!userId) {
    return null;
  }

  const [membership, room] = await Promise.all([
    prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
      select: {
        userId: true,
        role: true,
        locationAccess: {
          select: { locationId: true },
        },
      },
    }),
    prisma.room.findFirst({
      where: { id: roomId, householdId, active: true },
      select: { locationId: true },
    }),
  ]);

  if (!membership || !room) {
    return null;
  }

  if (membership.role === "admin" || membership.locationAccess.length === 0) {
    return membership.userId;
  }

  if (!room.locationId) {
    return null;
  }

  return membership.locationAccess.some((entry) => entry.locationId === room.locationId) ? membership.userId : null;
}

export async function moveOpenTaskToPriority(taskId: string, roomId: string, desiredPriority: number | null) {
  const openTasks = await prisma.task.findMany({
    where: {
      active: true,
      roomId,
      captureStage: { not: "done" },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const orderedIds = openTasks.map((task) => task.id).filter((id) => id !== taskId);
  const targetIndex = desiredPriority ? Math.min(Math.max(desiredPriority - 1, 0), orderedIds.length) : orderedIds.length;
  orderedIds.splice(targetIndex, 0, taskId);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { priority: index + 1 },
      }),
    ),
  );
}

export function calculateNextDueAt(base: Date, recurrenceType: "daily" | "weekly" | "monthly", interval: number) {
  const next = new Date(base);
  if (recurrenceType === "daily") {
    next.setDate(next.getDate() + interval);
    return next;
  }
  if (recurrenceType === "monthly") {
    next.setMonth(next.getMonth() + interval);
    return next;
  }
  next.setDate(next.getDate() + (interval * 7));
  return next;
}

export function isSimpleRecurrenceType(value: string): value is "daily" | "weekly" | "monthly" {
  return value === "daily" || value === "weekly" || value === "monthly";
}

export async function upsertSimpleSchedule(
  taskId: string,
  recurrenceType: "daily" | "weekly" | "monthly",
  intervalCount: number,
  nextDueAt: Date,
) {
  await prisma.taskSchedule.upsert({
    where: { taskId },
    create: {
      taskId,
      recurrenceType,
      intervalCount,
      daysOfWeek: [],
      timeOfDay: "09:00",
      nextDueAt,
    },
    update: {
      recurrenceType,
      intervalCount,
      nextDueAt,
      timeOfDay: "09:00",
    },
  });
}

export async function upsertPendingOccurrence(taskId: string, dueAt: Date) {
  const pendingOccurrence = await prisma.taskOccurrence.findFirst({
    where: {
      taskId,
      status: { in: ["pending", "overdue", "skipped"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (pendingOccurrence) {
    await prisma.taskOccurrence.update({
      where: { id: pendingOccurrence.id },
      data: {
        dueAt,
        status: "pending",
        completedAt: null,
        completedBy: null,
      },
    });
    return;
  }

  await prisma.taskOccurrence.create({
    data: {
      taskId,
      dueAt,
      status: "pending",
    },
  });
}

export async function compactOpenTaskPriorities(roomId: string) {
  const openTasks = await prisma.task.findMany({
    where: {
      active: true,
      roomId,
      captureStage: { not: "done" },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    openTasks.map((task, index) =>
      prisma.task.update({
        where: { id: task.id },
        data: { priority: index + 1 },
      }),
    ),
  );
}

export async function requireAdminAction() {
  const context = await requireSessionContext("/admin");
  if (context.role !== "admin") {
    redirect("/");
  }
  return context;
}

export async function requireProjectManagerAction() {
  const context = await requireSessionContext("/projects");
  if (!canManageProjectsRole(context.role)) {
    redirect("/");
  }
  return context;
}

export async function requireSessionMemberAction(options?: { allowRestrictedChildAudience?: boolean }) {
  const context = await requireSessionContext("/");
  if (!canUseMemberActions(context.role)) {
    redirect("/");
  }
  if (!options?.allowRestrictedChildAudience && !canAccessExtendedViews(context.audienceBand)) {
    redirect("/tasks");
  }
  return context;
}

export async function getOrCreateUnsortedRoomId(householdId: string) {
  const existingRoom = await prisma.room.findFirst({
    where: {
      householdId,
      active: true,
      name: {
        equals: "Unsorted",
        mode: "insensitive",
      },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  if (existingRoom) {
    return existingRoom.id;
  }

  const maxSort = await prisma.room.aggregate({
    where: { householdId },
    _max: { sortOrder: true },
  });

  const room = await prisma.room.create({
    data: {
      householdId,
      name: "Unsorted",
      designation: "Tasks recorded without a room",
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });

  return room.id;
}
