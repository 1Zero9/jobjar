import { createHmac, timingSafeEqual } from "node:crypto";
import { MemberAudience, MemberProfileTheme, MemberRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_USER_COOKIE = "jobjar_session_user";
const SESSION_HOUSEHOLD_COOKIE = "jobjar_session_household";
const SESSION_SIGNING_SECRET = getSessionSigningSecret();

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export type SessionContext = {
  userId: string;
  householdId: string;
  role: MemberRole;
  audienceBand: MemberAudience;
  profileTheme: MemberProfileTheme;
  allowedLocationIds: string[] | null;
};

export function isAdminRole(role: MemberRole) {
  return role === "admin";
}

export function canManageProjectsRole(role: MemberRole) {
  return role === "admin" || role === "power_user";
}

export function canUseMemberActions(role: MemberRole) {
  return role !== "viewer";
}

export async function getSessionUserId() {
  const jar = await cookies();
  return decodeSignedValue(jar.get(SESSION_USER_COOKIE)?.value);
}

export async function getSessionHouseholdId() {
  const jar = await cookies();
  return decodeSignedValue(jar.get(SESSION_HOUSEHOLD_COOKIE)?.value);
}

export async function setSessionUserId(userId: string, householdId?: string) {
  const jar = await cookies();
  jar.set(SESSION_USER_COOKIE, encodeSignedValue(userId), SESSION_COOKIE_OPTIONS);
  if (householdId) {
    jar.set(SESSION_HOUSEHOLD_COOKIE, encodeSignedValue(householdId), SESSION_COOKIE_OPTIONS);
  }
}

export async function setSessionHouseholdId(householdId: string) {
  const jar = await cookies();
  jar.set(SESSION_HOUSEHOLD_COOKIE, encodeSignedValue(householdId), SESSION_COOKIE_OPTIONS);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_USER_COOKIE);
  jar.delete(SESSION_HOUSEHOLD_COOKIE);
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  const preferredHouseholdId = await getSessionHouseholdId();
  const preferredMembership = preferredHouseholdId
    ? await prisma.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: preferredHouseholdId,
            userId,
          },
        },
        select: { householdId: true, role: true, audienceBand: true, profileTheme: true, locationAccess: { select: { locationId: true } } },
      })
    : null;

  const membership =
    preferredMembership ??
    (await prisma.householdMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      select: { householdId: true, role: true, audienceBand: true, profileTheme: true, locationAccess: { select: { locationId: true } } },
    }));

  if (!membership) {
    return null;
  }

  return {
    userId,
    householdId: membership.householdId,
    role: membership.role,
    audienceBand: membership.audienceBand,
    profileTheme: membership.profileTheme,
    allowedLocationIds:
      membership.role === "admin" || membership.locationAccess.length === 0
        ? null
        : membership.locationAccess.map((entry) => entry.locationId),
  };
}

export async function requireSessionContext(nextPath = "/"): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return context;
}

export async function requireSessionUserId(nextPath = "/") {
  const context = await requireSessionContext(nextPath);
  return context.userId;
}

export async function getSessionRole() {
  const context = await getSessionContext();
  return context?.role ?? null;
}

export async function requireAdmin(nextPath = "/admin") {
  const context = await requireSessionContext(nextPath);
  if (!isAdminRole(context.role)) {
    redirect("/");
  }
  return context;
}

export async function requireProjectManager(nextPath = "/projects") {
  const context = await requireSessionContext(nextPath);
  if (!canManageProjectsRole(context.role)) {
    redirect("/");
  }
  return context;
}

export function getHouseholdPasscode() {
  const configuredPasscode = process.env.HOUSEHOLD_PASSCODE;
  if (configuredPasscode) {
    return configuredPasscode;
  }

  if (process.env.NODE_ENV !== "production") {
    return "jobjar";
  }

  return null;
}

function getSessionSigningSecret() {
  const configuredSecret = process.env.SESSION_SIGNING_SECRET || process.env.NEXTAUTH_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "jobjar-dev-secret";
  }

  throw new Error("SESSION_SIGNING_SECRET must be set in production.");
}

function encodeSignedValue(value: string) {
  const signature = createHmac("sha256", SESSION_SIGNING_SECRET).update(value).digest("hex");
  return `${value}.${signature}`;
}

function decodeSignedValue(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  const splitIndex = rawValue.lastIndexOf(".");
  if (splitIndex <= 0 || splitIndex === rawValue.length - 1) {
    return null;
  }

  const payload = rawValue.slice(0, splitIndex);
  const providedSignature = rawValue.slice(splitIndex + 1);
  const expectedSignature = createHmac("sha256", SESSION_SIGNING_SECRET).update(payload).digest("hex");

  try {
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
