"use server";

import { clearSession, getHouseholdPasscode, requireSessionContext, setSessionUserId } from "@/lib/auth";
import { getUserPasswordHash, setUserPasswordHash } from "@/lib/auth-store";
import { getOrCreateHouseholdForUser } from "@/lib/household";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  parseNotifyChannel,
  normalizePhoneNumber,
  resolvePostLoginPath,
  getReturnPath,
  redirectToReturnPath,
  refreshViews,
} from "@/app/actions/_utils";

export async function bootstrapOwnerAction(formData: FormData) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    redirect("/login");
  }

  const displayName = String(formData.get("displayName") ?? "").trim() || "House Admin";
  const email = String(formData.get("email") ?? "").trim() || "owner@jobjar.app";
  const passcode = String(formData.get("passcode") ?? "").trim();

  if (passcode.length < 8) {
    redirect("/login?error=setup");
  }

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
    },
    select: { id: true },
  });

  await setUserPasswordHash(user.id, hashPassword(passcode));
  const householdId = await getOrCreateHouseholdForUser(user.id);
  await setSessionUserId(user.id, householdId);
  redirect("/setup/start");
}

export async function loginAction(formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!await checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    redirect("/login?error=rate-limited");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const identifier = String(formData.get("identifier") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "").trim();
  const nextPath = String(formData.get("next") ?? "/").trim() || "/";

  if (!userId && !identifier) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const users = userId
    ? await prisma.user.findMany({
        where: { id: userId },
        take: 1,
        select: { id: true },
      })
    : await prisma.user.findMany({
        where: {
          OR: [
            { email: { equals: identifier, mode: "insensitive" } },
            { displayName: { equals: identifier, mode: "insensitive" } },
          ],
        },
        take: 2,
        select: { id: true },
      });

  const user = users.length === 1 ? users[0] : null;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const storedHash = await getUserPasswordHash(user.id);
  const householdPasscode = getHouseholdPasscode();
  const passcodeValid = storedHash
    ? verifyPassword(passcode, storedHash)
    : householdPasscode !== null && passcode === householdPasscode;
  if (!passcodeValid) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=invalid`);
  }

  const householdId = await getOrCreateHouseholdForUser(user.id);
  await setSessionUserId(user.id, householdId);
  redirect(await resolvePostLoginPath(user.id, householdId, nextPath));
}

export async function logoutAction(formData?: FormData) {
  await clearSession();

  const nextPath = formData ? getReturnPath(formData.get("next"), "") : "";
  const reason = formData ? String(formData.get("reason") ?? "").trim() : "";
  const params = new URLSearchParams();

  if (nextPath) {
    params.set("next", nextPath);
  }

  if (reason) {
    params.set("reason", reason);
  }

  const query = params.toString();
  redirect(query ? `/login?${query}` : "/login");
}

export async function updateNotificationSettingsAction(formData: FormData) {
  const { userId } = await requireSessionContext("/help");
  const returnTo = getReturnPath(formData.get("returnTo"), "/help");
  const notifyVia = parseNotifyChannel(String(formData.get("notifyVia") ?? "").trim(), "none");
  const phoneInput = String(formData.get("phone") ?? "").trim();
  const normalizedPhone = normalizePhoneNumber(phoneInput);

  if (phoneInput && !normalizedPhone) {
    redirectToReturnPath(returnTo, { error: "notification-phone-invalid" });
    return;
  }

  if (notifyVia === "sms" && !normalizedPhone) {
    redirectToReturnPath(returnTo, { error: "notification-phone-required" });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: normalizedPhone,
      notifyVia,
    },
  });

  refreshViews(["/help", "/settings/people"]);
  redirectToReturnPath(returnTo, { updated: "notifications" });
}
