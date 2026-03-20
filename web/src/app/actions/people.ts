"use server";

import { prisma } from "@/lib/prisma";
import { setUserPasswordHash } from "@/lib/auth-store";
import { hashPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import {
  parseMemberRole,
  parseMemberAudience,
  parseMemberProfileTheme,
  parseLocationIds,
  replaceMemberLocationAccess,
  getReturnPath,
  redirectToReturnPath,
  refreshViews,
  requireAdminAction,
  requireProjectManagerAction,
} from "@/app/actions/_utils";

export async function createPersonAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();
  const passcodeInput = String(formData.get("passcode") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const requestedAudienceBand = String(formData.get("audienceBand") ?? "").trim();
  const requestedProfileTheme = String(formData.get("profileTheme") ?? "").trim();
  const nicknameRaw = String(formData.get("nickname") ?? "").trim();
  const nickname = nicknameRaw || null;
  const requestedLocationIds = parseLocationIds(formData.getAll("locationIds"));
  const returnTo = getReturnPath(formData.get("returnTo"), "");

  if (!displayName) {
    redirectToReturnPath(returnTo, { error: "person-name-required" });
    return;
  }

  if (passcodeInput && passcodeInput.length < 4) {
    redirectToReturnPath(returnTo, { error: "person-passcode-too-short" });
    return;
  }

  const role = parseMemberRole(requestedRole, "member");
  const audienceBand = parseMemberAudience(requestedAudienceBand, "adult");
  const profileTheme = parseMemberProfileTheme(requestedProfileTheme, "default_theme");

  const email =
    emailInput || `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@jobjar.local`;

  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName },
    create: {
      email,
      displayName,
    },
  });

  await prisma.householdMember.upsert({
    where: {
      householdId_userId: {
        householdId,
        userId: user.id,
      },
    },
    update: { role, audienceBand, profileTheme, nickname },
    create: {
      householdId,
      userId: user.id,
      role,
      audienceBand,
      profileTheme,
      nickname,
    },
  });

  await replaceMemberLocationAccess(householdId, user.id, requestedLocationIds);

  if (passcodeInput.length >= 4) {
    await setUserPasswordHash(user.id, hashPassword(passcodeInput));
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { added: "person" });
  }
}

export async function updatePersonRoleAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const role = parseMemberRole(requestedRole, "member");
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");
  if (!userId) {
    return;
  }

  if (userId === currentUserId && role !== "admin") {
    redirectToReturnPath(returnTo, { error: "person-role-self-admin-required" });
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await prisma.householdMember.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: { role },
  });

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=role`);
}

export async function updatePersonAudienceAction(formData: FormData) {
  const { householdId } = await requireProjectManagerAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedAudienceBand = String(formData.get("audienceBand") ?? "").trim();
  const audienceBand = parseMemberAudience(requestedAudienceBand, "adult");
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");

  if (!userId) {
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await prisma.householdMember.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: { audienceBand },
  });

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/stats", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=audience`);
}

export async function updatePersonProfileThemeAction(formData: FormData) {
  const { householdId } = await requireProjectManagerAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedProfileTheme = String(formData.get("profileTheme") ?? "").trim();
  const profileTheme = parseMemberProfileTheme(requestedProfileTheme, "default_theme");
  const nicknameRaw = String(formData.get("nickname") ?? "").trim();
  const nickname = nicknameRaw || null;
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");

  if (!userId) {
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await prisma.householdMember.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: { profileTheme, nickname },
  });

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/stats", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=theme`);
}

export async function updatePersonLocationAccessAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "/settings/people");
  const requestedLocationIds = parseLocationIds(formData.getAll("locationIds"));
  if (!userId) {
    return;
  }

  if (userId === currentUserId) {
    redirectToReturnPath(returnTo, { error: "person-location-self-protected" });
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    return;
  }

  await replaceMemberLocationAccess(householdId, userId, requestedLocationIds);

  refreshViews(["/", "/log", "/tasks", "/projects", "/projects/timeline", "/stats", "/settings", "/settings/people"]);
  redirect(`${returnTo}?updated=locations`);
}

export async function removePersonAction(formData: FormData) {
  const { householdId, userId: currentUserId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!userId) {
    return;
  }

  if (userId === currentUserId) {
    redirectToReturnPath(returnTo, { error: "person-remove-self-protected" });
    return;
  }

  await prisma.householdMember.deleteMany({
    where: { householdId, userId },
  });

  const openAssignmentIds = await prisma.taskAssignment.findMany({
    where: {
      userId,
      assignedTo: null,
      task: {
        room: { householdId },
      },
    },
    select: { id: true },
  });

  if (openAssignmentIds.length > 0) {
    await prisma.taskAssignment.updateMany({
      where: { id: { in: openAssignmentIds.map((entry) => entry.id) } },
      data: { assignedTo: new Date() },
    });
  }

  refreshViews(["/", "/log", "/tasks", "/settings", "/settings/people"]);
  if (returnTo) {
    redirectToReturnPath(returnTo, { removed: "person" });
  }
}

export async function setPersonPasscodeAction(formData: FormData) {
  const { householdId } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "").trim();
  const returnTo = getReturnPath(formData.get("returnTo"), "");
  if (!userId) {
    return;
  }

  if (passcode.length < 4) {
    redirectToReturnPath(returnTo, { error: "person-passcode-too-short" });
    return;
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    redirectToReturnPath(returnTo, { error: "person-not-found" });
    return;
  }

  await setUserPasswordHash(userId, hashPassword(passcode));
  refreshViews();
  if (returnTo) {
    redirectToReturnPath(returnTo, { updated: "passcode" });
  }
}
